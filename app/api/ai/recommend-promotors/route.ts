import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/routeGuards";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type AssignmentWindow = {
  id: string;
  start_ts: string;
  end_ts: string;
  status: string | null;
  special_status: string | null;
};

type Candidate = {
  userId: string;
  name: string;
  phone: string;
  region: string;
  contractHours: number;
  workedHours: number;
  remainingHours: number;
  assignmentCount: number;
  hasCar: boolean;
  hasDrivingLicense: boolean;
  isStammpromotor: boolean;
};

function getClusterFromPostalCode(postalCode: string): string {
  const value = Number.parseInt(postalCode, 10);
  if (!Number.isFinite(value)) return "";
  if (value >= 1000 && value <= 1610) return "wien-noe-bgl";
  if (value >= 2000 && value <= 3999) {
    if (value >= 3334 && value <= 3335) return "oberoesterreich";
    return "wien-noe-bgl";
  }
  if (value >= 4000 && value <= 4999) {
    if ([4300, 4303, 4392, 4441, 4482].includes(value) || (value >= 4431 && value <= 4432)) {
      return "wien-noe-bgl";
    }
    return "oberoesterreich";
  }
  if (value >= 5000 && value <= 5999) {
    if ((value >= 5120 && value <= 5145) || value === 5166
      || (value >= 5211 && value <= 5283) || [5310, 5311, 5360].includes(value)) {
      return "oberoesterreich";
    }
    return "salzburg";
  }
  if (value >= 6000 && value <= 6999) return value >= 6700 ? "vorarlberg" : "tirol";
  if (value >= 7000 && value <= 7999) return value === 7421 ? "steiermark" : "wien-noe-bgl";
  if (value >= 8000 && value <= 8999) {
    return value >= 8380 && value <= 8385 ? "wien-noe-bgl" : "steiermark";
  }
  if (value >= 9000 && value <= 9999) {
    if (value === 9323) return "steiermark";
    if (value === 9782 || value >= 9900) return "tirol";
    return "kaernten";
  }
  return "wien-noe-bgl";
}
function startOfLocalDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfWeek(date: Date): Date {
  const value = startOfLocalDay(date);
  const day = value.getDay();
  value.setDate(value.getDate() - day + (day === 0 ? -6 : 1));
  return value;
}

function endOfWeek(date: Date): Date {
  const value = startOfWeek(date);
  value.setDate(value.getDate() + 7);
  return value;
}

function workedHours(assignment: AssignmentWindow): number {
  if (assignment.status === "cancelled") return 0;
  const duration = (new Date(assignment.end_ts).getTime() - new Date(assignment.start_ts).getTime()) / 3_600_000;
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return duration > 6 ? duration - 1 : duration;
}

function overlaps(leftStart: Date, leftEnd: Date, assignment: AssignmentWindow): boolean {
  const rightStart = new Date(assignment.start_ts);
  const rightEnd = new Date(assignment.end_ts);
  return rightStart < leftEnd && rightEnd > leftStart;
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const assignmentId = String(body?.assignmentId || "");
    const maxRecommendations = Math.min(12, Math.max(1, Number(body?.maxRecommendations) || 6));
    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId required" }, { status: 400 });
    }

    const service = createSupabaseServiceClient();
    const { data: assignment, error: assignmentError } = await service
      .from("assignments")
      .select("id, start_ts, end_ts, postal_code, region, matched_market_id")
      .eq("id", assignmentId)
      .maybeSingle();
    if (assignmentError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    let market: { cluster?: string | null; stamm_promotor_id?: string | null } | null = null;
    if (assignment.matched_market_id) {
      const result = await service
        .from("markets")
        .select("cluster, stamm_promotor_id")
        .eq("id", assignment.matched_market_id)
        .maybeSingle();
      market = result.data;
    }

    const targetCluster = String(
      market?.cluster || assignment.region || getClusterFromPostalCode(String(assignment.postal_code || ""))
    );
    const { data: users, error: usersError } = await service
      .from("user_profiles")
      .select("user_id, display_name, phone")
      .eq("role", "promotor");
    if (usersError) throw usersError;

    const userIds = (users || []).map((user: any) => String(user.user_id));
    if (userIds.length === 0) {
      return NextResponse.json({ success: true, assignmentId, recommendations: [], source: "deterministic-local" });
    }

    const { data: profiles, error: profilesError } = await service
      .from("promotor_profiles")
      .select("user_id, phone, region, contract_hours_per_week, has_driving_license, has_car")
      .in("user_id", userIds);
    if (profilesError) throw profilesError;

    const profileByUser = new Map((profiles || []).map((profile: any) => [String(profile.user_id), profile]));
    const clusterUserIds = userIds.filter((userId) => {
      const profile = profileByUser.get(userId) as any;
      return String(profile?.region || "wien-noe-bgl") === targetCluster;
    });
    if (clusterUserIds.length === 0) {
      return NextResponse.json({ success: true, assignmentId, recommendations: [], source: "deterministic-local" });
    }

    const { data: participations, error: participationError } = await service
      .from("assignment_participants")
      .select("user_id, assignment_id")
      .in("user_id", clusterUserIds);
    if (participationError) throw participationError;

    const relevantAssignmentIds = [...new Set((participations || []).map((row: any) => String(row.assignment_id)))]
      .filter((id) => id !== assignmentId);
    let relevantAssignments: AssignmentWindow[] = [];
    if (relevantAssignmentIds.length > 0) {
      const { data, error } = await service
        .from("assignments")
        .select("id, start_ts, end_ts, status, special_status")
        .in("id", relevantAssignmentIds);
      if (error) throw error;
      relevantAssignments = (data || []) as AssignmentWindow[];
    }

    const assignmentsByUser = new Map<string, AssignmentWindow[]>();
    const assignmentById = new Map(relevantAssignments.map((item) => [String(item.id), item]));
    for (const row of participations || []) {
      const item = assignmentById.get(String((row as any).assignment_id));
      if (!item) continue;
      const userId = String((row as any).user_id);
      assignmentsByUser.set(userId, [...(assignmentsByUser.get(userId) || []), item]);
    }

    const targetDate = new Date(assignment.start_ts);
    const dayStart = startOfLocalDay(targetDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const weekStart = startOfWeek(targetDate);
    const weekEnd = endOfWeek(targetDate);
    const userById = new Map((users || []).map((user: any) => [String(user.user_id), user]));

    let candidates: Candidate[] = clusterUserIds.flatMap((userId) => {
      const profile = profileByUser.get(userId) as any;
      const user = userById.get(userId) as any;
      const userAssignments = assignmentsByUser.get(userId) || [];
      const isBusy = userAssignments.some((item) =>
        item.status !== "cancelled" && overlaps(dayStart, dayEnd, item)
      );
      if (isBusy) return [];

      const weekAssignments = userAssignments.filter((item) =>
        new Date(item.start_ts) >= weekStart && new Date(item.start_ts) < weekEnd
      );
      const hours = weekAssignments.reduce((sum, item) => sum + workedHours(item), 0);
      const contractHours = Math.max(0, Number(profile?.contract_hours_per_week) || 0);
      return [{
        userId,
        name: String(user?.display_name || "Unbekannt"),
        phone: String(profile?.phone || user?.phone || ""),
        region: String(profile?.region || targetCluster),
        contractHours,
        workedHours: hours,
        remainingHours: Math.max(0, contractHours - hours),
        assignmentCount: weekAssignments.length,
        hasCar: Boolean(profile?.has_car),
        hasDrivingLicense: Boolean(profile?.has_driving_license),
        isStammpromotor: market?.stamm_promotor_id === userId,
      }];
    });

    const withRemainingHours = candidates.filter((candidate) =>
      candidate.contractHours === 0 || candidate.remainingHours > 0 || candidate.isStammpromotor
    );
    if (withRemainingHours.length > 0) candidates = withRemainingHours;

    candidates.sort((left, right) => {
      if (left.isStammpromotor !== right.isStammpromotor) return left.isStammpromotor ? -1 : 1;
      if (left.workedHours !== right.workedHours) return left.workedHours - right.workedHours;
      if (left.assignmentCount !== right.assignmentCount) return left.assignmentCount - right.assignmentCount;
      if (left.hasCar !== right.hasCar) return left.hasCar ? -1 : 1;
      return left.name.localeCompare(right.name, "de-AT");
    });

    const recommendations = candidates.slice(0, maxRecommendations).map((candidate, index) => {
      const stammReason = candidate.isStammpromotor
        ? "Stammpromotor fuer diesen Markt. "
        : "Cluster und Tagesverfuegbarkeit geprueft. ";
      const hoursReason = candidate.contractHours > 0
        ? `${candidate.workedHours.toFixed(1)} von ${candidate.contractHours.toFixed(1)} Wochenstunden verplant.`
        : `${candidate.assignmentCount} Einsatz/e in dieser Woche.`;
      return {
        keyword: `promotor_${candidate.userId.slice(0, 8)}`,
        promotorName: candidate.name,
        promotorId: candidate.userId,
        phone: candidate.phone,
        confidence: Math.max(0.6, Number((0.96 - index * 0.05).toFixed(2))),
        rank: index + 1,
        reasoning: `${stammReason}${hoursReason}`,
      };
    });

    return NextResponse.json({
      success: true,
      assignmentId,
      recommendations,
      timestamp: new Date().toISOString(),
      source: "deterministic-local",
    });
  } catch {
    return NextResponse.json({ error: "Recommendation failed" }, { status: 500 });
  }
}

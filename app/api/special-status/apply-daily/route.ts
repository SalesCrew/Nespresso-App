import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!secret || !supplied) return false;
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}
function viennaDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const service = createSupabaseServiceClient();
    const now = new Date();
    const today = viennaDate(now);
    const { data: activeStatuses, error: statusError } = await service
      .from("active_special_status")
      .select("user_id, status_type, ended_at")
      .eq("is_active", true);
    if (statusError) throw statusError;

    let assignmentsUpdated = 0;
    let expiredStatuses = 0;
    for (const status of activeStatuses || []) {
      if (status.ended_at && new Date(status.ended_at) < now) {
        const { error } = await service
          .from("active_special_status")
          .update({ is_active: false, updated_at: now.toISOString() })
          .eq("user_id", status.user_id)
          .eq("is_active", true);
        if (error) throw error;
        expiredStatuses += 1;
        continue;
      }

      const { data: participations, error: participantError } = await service
        .from("assignment_participants")
        .select("assignment_id")
        .eq("user_id", status.user_id);
      if (participantError) throw participantError;
      const assignmentIds = (participations || []).map((row: any) => String(row.assignment_id));
      if (assignmentIds.length === 0) continue;

      const windowStart = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString();
      const { data: assignments, error: assignmentError } = await service
        .from("assignments")
        .select("id, start_ts")
        .in("id", assignmentIds)
        .gte("start_ts", windowStart)
        .lt("start_ts", windowEnd);
      if (assignmentError) throw assignmentError;

      const todayIds = (assignments || [])
        .filter((assignment: any) => viennaDate(assignment.start_ts) === today)
        .map((assignment: any) => String(assignment.id));
      if (todayIds.length === 0) continue;

      const { error: updateError } = await service
        .from("assignments")
        .update({ special_status: status.status_type, updated_at: now.toISOString() })
        .in("id", todayIds);
      if (updateError) throw updateError;
      assignmentsUpdated += todayIds.length;
    }

    return NextResponse.json({
      activeUsers: Math.max(0, (activeStatuses || []).length - expiredStatuses),
      assignmentsUpdated,
      expiredStatuses,
    });
  } catch {
    return NextResponse.json({ error: "cron failed" }, { status: 500 });
  }
}

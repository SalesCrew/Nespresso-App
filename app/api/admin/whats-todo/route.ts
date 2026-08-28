import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/routeGuards";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const service = createSupabaseServiceClient();
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (now.getDay() === 0 ? 0 : 7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const [assignmentsMonthResult, assignmentsWeekResult, participantsResult, appliedInvitationsResult,
      pendingRequestsResult, promotorsResult, activeContractsResult, applicationsResult] = await Promise.all([
      service.from("assignments").select("id").gte("start_ts", now.toISOString()).lte("start_ts", endOfMonth.toISOString()),
      service.from("assignments").select("id").gte("start_ts", now.toISOString()).lte("start_ts", endOfWeek.toISOString()),
      service.from("assignment_participants").select("assignment_id"),
      service.from("assignment_invitations").select("id, assignment:assignments!inner(start_ts)")
        .eq("status", "applied")
        .gte("assignment.start_ts", now.toISOString())
        .lte("assignment.start_ts", endOfMonth.toISOString()),
      service.from("special_status_requests").select("request_type").eq("status", "pending"),
      service.from("promotor_profiles").select("user_id"),
      service.from("dienstvertrag_files").select("user_id").eq("is_active", true),
      service.from("applications").select("id", { count: "exact" }).eq("status", "received"),
    ]);

    const assignedIds = new Set((participantsResult.data || []).map((item: any) => String(item.assignment_id)));
    const openMonth = (assignmentsMonthResult.data || []).filter((item: any) => !assignedIds.has(String(item.id))).length;
    const openWeek = (assignmentsWeekResult.data || []).filter((item: any) => !assignedIds.has(String(item.id))).length;
    const pending = pendingRequestsResult.data || [];
    const sickCount = pending.filter((item: any) => item.request_type === "krankenstand").length;
    const emergencyCount = pending.filter((item: any) => item.request_type === "notfall").length;
    const contractedIds = new Set((activeContractsResult.data || []).map((item: any) => String(item.user_id)));
    const missingContractIds = (promotorsResult.data || [])
      .map((item: any) => String(item.user_id))
      .filter((id) => !contractedIds.has(id));
    const { data: missingContractProfiles } = missingContractIds.length
      ? await service.from("user_profiles").select("display_name").in("user_id", missingContractIds)
      : { data: [] as any[] };
    const missingContractNames = (missingContractProfiles || [])
      .map((item: any) => String(item.display_name || "Unbekannt"))
      .join(", ");

    const bullets: string[] = [];
    bullets.push(openMonth || openWeek
      ? `Bis Ende des Monats sind noch ${openMonth} Einsätze offen. Diese Woche sind noch ${openWeek} Termine offen.`
      : "Die Einsatzplanung für diese Woche und den restlichen Monat ist vollständig besetzt.");
    bullets.push(`${appliedInvitationsResult.data?.length || 0} angenommene Einsatz-Einladung(en) warten auf eine Entscheidung.`);
    bullets.push(`${sickCount} Krankenstand- und ${emergencyCount} Notfallanfrage(n) sind offen.`);
    bullets.push(missingContractNames
      ? `${missingContractNames} haben noch keinen aktiven Dienstvertrag hinterlegt.`
      : "Alle Promotor:innen haben einen aktiven Dienstvertrag hinterlegt.");
    bullets.push(`${applicationsResult.count || applicationsResult.data?.length || 0} neue Bewerbung(en) warten auf Prüfung.`);

    return NextResponse.json({
      response: `Hallo! Die wichtigsten To-Dos gerade sind:\n\n${bullets.map((item) => `• ${item}`).join("\n\n")}`,
      source: "deterministic-local",
    });
  } catch {
    return NextResponse.json({ error: "todo summary unavailable" }, { status: 500 });
  }
}

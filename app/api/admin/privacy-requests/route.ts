import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/routeGuards";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const STATUSES = new Set([
  "submitted",
  "identity_check",
  "in_progress",
  "waiting_for_subject",
  "completed",
  "rejected",
  "cancelled",
]);

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const status = new URL(request.url).searchParams.get("status");
  if (status && status !== "all" && !STATUSES.has(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  let query = service
    .from("privacy_requests")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(200);
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "requests unavailable" }, { status: 503 });

  const subjectIds = [...new Set((data || []).map((item: any) => String(item.subject_user_id)))];
  const { data: profiles } = subjectIds.length
    ? await service.from("user_profiles").select("user_id, display_name").in("user_id", subjectIds)
    : { data: [] as any[] };
  const names = new Map((profiles || []).map((profile: any) => [String(profile.user_id), profile.display_name]));
  return NextResponse.json({
    requests: (data || []).map((item: any) => ({
      ...item,
      subject_name: names.get(String(item.subject_user_id)) || null,
    })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id || "");
  const status = String(body?.status || "");
  const decisionReason = String(body?.decisionReason || "").trim();
  const internalNotes = String(body?.internalNotes || "").trim();
  if (!id || !STATUSES.has(status)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  if (decisionReason.length > 2000 || internalNotes.length > 4000) {
    return NextResponse.json({ error: "text too long" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  const { data: existing } = await service.from("privacy_requests").select("*").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (status === "completed" && !existing.identity_verified_at && body?.identityVerified !== true) {
    return NextResponse.json({ error: "identity must be verified first" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status,
    decision_reason: decisionReason || null,
    internal_notes: internalNotes || null,
    updated_at: now,
    completed_at: status === "completed" ? now : null,
  };
  if (body?.identityVerified === true && !existing.identity_verified_at) {
    updates.identity_verified_at = now;
    updates.identity_verified_by = auth.user.id;
  }

  const { data, error } = await service.from("privacy_requests").update(updates).eq("id", id).select("*").single();
  if (error || !data) return NextResponse.json({ error: "request could not be updated" }, { status: 500 });
  await service.from("privacy_request_events").insert({
    request_id: id,
    actor_user_id: auth.user.id,
    event_type: body?.identityVerified === true && !existing.identity_verified_at ? "identity_verified_and_status_changed" : "status_changed",
    from_status: existing.status,
    to_status: status,
    note: decisionReason || null,
  });
  return NextResponse.json({ request: data });
}

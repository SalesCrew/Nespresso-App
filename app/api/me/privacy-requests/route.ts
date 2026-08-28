import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/routeGuards";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const REQUEST_TYPES = new Set([
  "access",
  "correction",
  "deletion",
  "restriction",
  "objection",
  "portability",
  "other",
]);
const OPEN_STATUSES = ["submitted", "identity_check", "in_progress", "waiting_for_subject"];

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from("privacy_requests")
    .select("id, request_type, details, status, submitted_at, due_at, identity_verified_at, decision_reason, completed_at")
    .eq("subject_user_id", auth.user.id)
    .order("submitted_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: "requests unavailable" }, { status: 503 });
  return NextResponse.json(
    { requests: data || [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const requestType = String(body?.requestType || "");
  const details = String(body?.details || "").trim();
  if (!REQUEST_TYPES.has(requestType)) {
    return NextResponse.json({ error: "invalid request type" }, { status: 400 });
  }
  if (details.length > 2000) {
    return NextResponse.json({ error: "details too long" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  const { count } = await service
    .from("privacy_requests")
    .select("id", { count: "exact", head: true })
    .eq("subject_user_id", auth.user.id)
    .in("status", OPEN_STATUSES);
  if ((count || 0) >= 3) {
    return NextResponse.json({ error: "too many open requests" }, { status: 429 });
  }

  const { data, error } = await service
    .from("privacy_requests")
    .insert({
      subject_user_id: auth.user.id,
      subject_email: auth.user.email || null,
      request_type: requestType,
      details: details || null,
    })
    .select("id, request_type, details, status, submitted_at, due_at, identity_verified_at, decision_reason, completed_at")
    .single();
  if (error || !data) return NextResponse.json({ error: "request could not be created" }, { status: 500 });

  await service.from("privacy_request_events").insert({
    request_id: data.id,
    actor_user_id: auth.user.id,
    event_type: "submitted",
    to_status: "submitted",
  });
  return NextResponse.json({ request: data }, { status: 201 });
}

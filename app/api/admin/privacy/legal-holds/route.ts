import { NextResponse } from "next/server";

import { recordDataAccess } from "@/lib/audit/dataAccess";
import { requireAdmin } from "@/lib/auth/routeGuards";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const SCOPES = new Set(["all", "chat", "eddie", "location", "assignments", "photos", "audit"]);

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const service = createSupabaseServiceClient();
  const { data, error } = await service.from("legal_holds").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "legal holds unavailable" }, { status: 503 });
  await recordDataAccess({
    actorUserId: auth.user.id,
    action: "legal_holds_read",
    resourceType: "legal_hold",
  });
  return NextResponse.json(
    { legalHolds: data || [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const subjectUserId = body?.subjectUserId ? String(body.subjectUserId) : null;
  const scope = String(body?.scope || "");
  const reason = String(body?.reason || "").trim();
  if (!SCOPES.has(scope) || !reason || reason.length > 2000) {
    return NextResponse.json({ error: "invalid legal hold" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  const { data, error } = await service.from("legal_holds").insert({
    subject_user_id: subjectUserId,
    scope,
    reason,
    created_by: auth.user.id,
  }).select("*").single();
  if (error || !data) return NextResponse.json({ error: "legal hold could not be created" }, { status: 500 });
  await recordDataAccess({
    actorUserId: auth.user.id,
    action: "legal_hold_created",
    resourceType: "legal_hold",
    resourceId: data.id,
    subjectUserId,
    metadata: { scope },
  });
  return NextResponse.json({ legalHold: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const service = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await service.from("legal_holds").update({
    active: false,
    released_by: auth.user.id,
    released_at: now,
    updated_at: now,
  }).eq("id", id).eq("active", true).select("id, subject_user_id, scope").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "active legal hold not found" }, { status: 404 });
  await recordDataAccess({
    actorUserId: auth.user.id,
    action: "legal_hold_released",
    resourceType: "legal_hold",
    resourceId: data.id,
    subjectUserId: data.subject_user_id,
    metadata: { scope: data.scope },
  });
  return NextResponse.json({ ok: true });
}

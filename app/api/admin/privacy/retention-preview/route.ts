import { NextResponse } from "next/server";

import { recordDataAccess } from "@/lib/audit/dataAccess";
import { requireAdmin } from "@/lib/auth/routeGuards";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("get_retention_preview");
  if (error) return NextResponse.json({ error: "retention preview unavailable" }, { status: 503 });
  await recordDataAccess({
    actorUserId: auth.user.id,
    action: "retention_preview_read",
    resourceType: "retention_preview",
  });
  return NextResponse.json({ preview: data }, { headers: { "Cache-Control": "private, no-store" } });
}

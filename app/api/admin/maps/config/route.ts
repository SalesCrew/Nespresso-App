import { NextResponse } from "next/server";
import { createSupabaseServerClientAsync } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const server = await createSupabaseServerClientAsync();
  const { data: { user }, error: authError } = await server.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const { data: profile, error: profileError } = await service
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError || !profile || !["admin_of_admins", "admin_staff"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.GOOGLE_MAPS_BROWSER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps ist nicht konfiguriert." }, { status: 503 });
  }

  return NextResponse.json({ apiKey }, { headers: { "Cache-Control": "private, no-store" } });
}

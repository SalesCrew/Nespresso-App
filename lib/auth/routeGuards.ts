import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClientAsync } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type AppRole = "admin_of_admins" | "admin_staff" | "promotor";

type AuthSuccess = {
  ok: true;
  user: User;
  role: AppRole | null;
  isAdmin: boolean;
};

type AuthFailure = {
  ok: false;
  response: NextResponse;
};

export type RouteAuthResult = AuthSuccess | AuthFailure;

function authError(status: 401 | 403): AuthFailure {
  return {
    ok: false,
    response: NextResponse.json(
      { error: status === 401 ? "unauthorized" : "forbidden" },
      { status }
    ),
  };
}

export async function requireUser(): Promise<RouteAuthResult> {
  const server = await createSupabaseServerClientAsync();
  const { data, error } = await server.auth.getUser();
  if (error || !data.user) return authError(401);

  const service = createSupabaseServiceClient();
  const { data: profile } = await service
    .from("user_profiles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const role = (profile?.role as AppRole | undefined) ?? null;
  return {
    ok: true,
    user: data.user,
    role,
    isAdmin: role === "admin_of_admins" || role === "admin_staff",
  };
}

export async function requireAdmin(): Promise<RouteAuthResult> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  return auth.isAdmin ? auth : authError(403);
}

export async function requireSelfOrAdmin(targetUserId: string): Promise<RouteAuthResult> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  return auth.user.id === targetUserId || auth.isAdmin ? auth : authError(403);
}

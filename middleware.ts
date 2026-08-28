import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_ROLES = new Set(["admin_of_admins", "admin_staff"]);
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function apiError(status: 401 | 403) {
  return NextResponse.json(
    { error: status === 401 ? "unauthorized" : "forbidden" },
    { status }
  );
}

function isAdminOnlyApi(pathname: string, method: string): boolean {
  if (pathname.startsWith("/api/admin/")) return true;
  if (pathname === "/api/auth/create-promotor") return true;
  if (pathname === "/api/promotors" || pathname === "/api/promotors/list") return true;
  if (pathname === "/api/ai/recommend-promotors") return true;
  if (pathname === "/api/ai/enhance-message") return true;
  if (pathname === "/api/messages" || pathname.startsWith("/api/messages/")) return true;

  if (pathname === "/api/assignments" && method === "POST") return true;
  if (/^\/api\/assignments\/[^/]+$/.test(pathname) && ["PATCH", "DELETE"].includes(method)) return true;

  return [
    /^\/api\/assignments\/[^/]+\/participants\/choose$/,
    /^\/api\/assignments\/[^/]+\/invites\/accept$/,
    /^\/api\/assignments\/[^/]+\/applications\/decline$/,
    /^\/api\/assignments\/[^/]+\/applications$/,
    /^\/api\/assignments\/[^/]+\/tracking$/,
    /^\/api\/assignments\/[^/]+\/match-market$/,
    /^\/api\/assignments\/(auto-match|bulk-invite|import|invitation-history|release-multiple|sync-import-promotors)$/,
    /^\/api\/assignments\/invites\/(counts|details)$/,
  ].some((pattern) => pattern.test(pathname));
}

function dynamicPromotorId(pathname: string): string | null {
  const segment = pathname.split("/").filter(Boolean)[2];
  return segment && UUID_SEGMENT.test(segment) ? segment : null;
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith("/api/");

  if (!url || !anonKey) {
    return isApi ? apiError(401) : NextResponse.redirect(new URL("/auth/salescrew/login", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;
  if (!user) {
    if (isApi) return apiError(401);
    const loginPath = pathname.startsWith("/admin") ? "/auth/salescrew/login" : "/auth/promotors/login";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  const targetPromotorId = pathname.startsWith("/api/promotors/")
    ? dynamicPromotorId(pathname)
    : null;
  const needsAdmin = pathname.startsWith("/admin")
    || isAdminOnlyApi(pathname, request.method)
    || (targetPromotorId !== null && targetPromotorId !== user.id);

  if (!needsAdmin) return response;

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  const isAdmin = !profileError && !!profile?.role && ADMIN_ROLES.has(profile.role);
  if (isAdmin) return response;

  if (isApi) return apiError(403);
  return NextResponse.redirect(new URL("/auth/salescrew/login", request.url));
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/ai/:path*",
    "/api/assignments",
    "/api/assignments/:path*",
    "/api/auth/create-promotor",
    "/api/chat/:path*",
    "/api/me/:path*",
    "/api/messages",
    "/api/messages/:path*",
    "/api/promotors/:path*",
  ],
};

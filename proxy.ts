import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

const PUBLIC_PATHS = new Set(["/login", "/signup"]);
const STATUS_PATHS = new Set(["/pending", "/disabled"]);
const AUTH_CALLBACK_PATH = "/auth/callback";

function getProtectedAppPath(pathname: string) {
  if (pathname === "/") {
    return false;
  }

  if (PUBLIC_PATHS.has(pathname) || STATUS_PATHS.has(pathname)) {
    return false;
  }

  return pathname.startsWith("/briefing") || pathname.startsWith("/reports");
}

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  const { url, anonKey } = getSupabaseConfig();

  if (pathname === AUTH_CALLBACK_PATH) {
    return response;
  }

  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (getProtectedAppPath(pathname) || STATUS_PATHS.has(pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("message", pathname.startsWith("/briefing") ? "请先登录后访问高盛内参。" : "请先登录后访问高盛研究。");
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  }

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle<{ status: "pending" | "approved" | "disabled" }>();
  const status = profile?.status ?? "pending";

  if (status === "approved") {
    if (PUBLIC_PATHS.has(pathname) || STATUS_PATHS.has(pathname)) {
      return NextResponse.redirect(new URL("/insights", request.url));
    }

    return response;
  }

  if (status === "disabled") {
    if (getProtectedAppPath(pathname) && pathname !== "/disabled") {
      return NextResponse.redirect(new URL("/disabled", request.url));
    }

    return response;
  }

  if (getProtectedAppPath(pathname) && pathname !== "/pending") {
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

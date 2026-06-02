import { NextResponse, type NextRequest } from "next/server";

import { getDefaultRedirectByStatus } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeNext(pathname: string | null) {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return "/pending";
  }

  return pathname;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNext(requestUrl.searchParams.get("next"));

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL(`/login?message=${encodeURIComponent("Supabase 尚未配置完成。")}`, requestUrl.origin));
  }

  if (!code) {
    const errorMessage =
      requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error") ?? "邮箱验证链接无效或已过期，请重新注册或重新发送验证邮件。";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("邮箱验证链接无效或已过期，请重新注册或重新发送验证邮件。")}`, requestUrl.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(`/login?message=${encodeURIComponent("邮箱已验证，请登录。")}`, requestUrl.origin));
  }

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle<{ status: "pending" | "approved" | "disabled" }>();

  return NextResponse.redirect(new URL(getDefaultRedirectByStatus(profile?.status ?? (next === "/pending" ? "pending" : "pending")), requestUrl.origin));
}

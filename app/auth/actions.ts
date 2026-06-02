"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthState, getDefaultRedirectByStatus } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSiteUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function buildErrorRedirect(pathname: string, message: string) {
  return `${pathname}?error=${encodeURIComponent(message)}`;
}

export async function loginAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect(buildErrorRedirect("/login", "Supabase 尚未配置完成，请先补充环境变量。"));
  }

  const email = getFormValue(formData, "email");
  const password = getFormValue(formData, "password");

  if (!email || !password) {
    redirect(buildErrorRedirect("/login", "请输入邮箱和密码。"));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(buildErrorRedirect("/login", "登录失败，请检查邮箱、密码或账号审核状态。"));
  }

  revalidatePath("/", "layout");
  const authState = await getAuthState();

  if (!authState.user) {
    redirect(buildErrorRedirect("/login", "登录会话建立失败，请重试。"));
  }

  redirect(getDefaultRedirectByStatus(authState.status));
}

export async function signupAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect(buildErrorRedirect("/signup", "Supabase 尚未配置完成，请先补充环境变量。"));
  }

  const email = getFormValue(formData, "email");
  const password = getFormValue(formData, "password");
  const passwordConfirm = getFormValue(formData, "passwordConfirm");

  if (!email || !password) {
    redirect(buildErrorRedirect("/signup", "请输入邮箱和密码。"));
  }

  if (password.length < 8) {
    redirect(buildErrorRedirect("/signup", "密码至少需要 8 位。"));
  }

  if (password !== passwordConfirm) {
    redirect(buildErrorRedirect("/signup", "两次输入的密码不一致。"));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/pending`,
    },
  });

  if (error) {
    redirect(buildErrorRedirect("/signup", "注册失败，请更换邮箱或稍后重试。"));
  }

  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      redirect(
        `/login?message=${encodeURIComponent("注册成功，请登录后等待管理员审核开通。若无法登录，请在 Supabase 中关闭邮箱确认后再试。")}`,
      );
    }
  }

  revalidatePath("/", "layout");
  redirect("/pending?message=注册成功，账号已提交审核。");
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect("/login?message=您已安全退出。");
}

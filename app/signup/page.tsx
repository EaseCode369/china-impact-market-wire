import Link from "next/link";
import { redirect } from "next/navigation";

import { signupAction } from "@/app/auth/actions";
import { getAuthState, getDefaultRedirectByStatus } from "@/lib/auth";

type SignupPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const authState = await getAuthState();

  if (authState.user && authState.status) {
    redirect(getDefaultRedirectByStatus(authState.status));
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-copy">
          <p className="brand-kicker">New Client Signup</p>
          <h1 className="auth-title">注册客户账号，审核通过后进入客户专区</h1>
          <p className="auth-description">
            第一版采用邮箱加密码注册。提交成功后，账号默认进入待审核状态；你可以在 Supabase 后台手动批准客户，再允许其查看高盛研究及后续深度专题内容。
          </p>
        </div>

        <form action={signupAction} className="auth-form">
          <label className="field-block">
            <span>邮箱</span>
            <input autoComplete="email" className="field-input" name="email" placeholder="client@example.com" required type="email" />
          </label>

          <label className="field-block">
            <span>密码</span>
            <input autoComplete="new-password" className="field-input" minLength={8} name="password" placeholder="至少 8 位密码" required type="password" />
          </label>

          <label className="field-block">
            <span>确认密码</span>
            <input
              autoComplete="new-password"
              className="field-input"
              minLength={8}
              name="passwordConfirm"
              placeholder="请再次输入密码"
              required
              type="password"
            />
          </label>

          {params.message ? <div className="auth-notice">{params.message}</div> : null}
          {params.error ? <div className="auth-error">{params.error}</div> : null}

          <button className="button-link auth-submit" type="submit">
            提交注册申请
          </button>
        </form>

        <div className="auth-footer">
          <span>已经有账号？</span>
          <Link className="text-link" href="/login">
            返回登录
          </Link>
        </div>
      </section>
    </main>
  );
}

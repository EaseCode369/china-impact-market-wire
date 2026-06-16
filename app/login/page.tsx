import Link from "next/link";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/auth/actions";
import { getAuthState, getDefaultRedirectByStatus } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const authState = await getAuthState();

  if (authState.user && authState.status) {
    redirect(getDefaultRedirectByStatus(authState.status));
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-copy">
          <p className="brand-kicker">Client Access</p>
          <h1 className="auth-title">登录后进入客户专区</h1>
          <p className="auth-description">
            官网公开资讯与高盛内参公开可看；高盛研究及后续深度专题采用客户审核机制。注册成功后，账号会先进入人工审核；只有审核通过的客户，才能查看客户专属内容。
          </p>
        </div>

        <form action={loginAction} className="auth-form">
          <label className="field-block">
            <span>邮箱</span>
            <input autoComplete="email" className="field-input" name="email" placeholder="client@example.com" required type="email" />
          </label>

          <label className="field-block">
            <span>密码</span>
            <input autoComplete="current-password" className="field-input" name="password" placeholder="请输入密码" required type="password" />
          </label>

          {params.message ? <div className="auth-notice">{params.message}</div> : null}
          {params.error ? <div className="auth-error">{params.error}</div> : null}

          <button className="button-link auth-submit" type="submit">
            登录并进入客户专区
          </button>
        </form>

        <div className="auth-footer">
          <span>还没有账号？</span>
          <Link className="text-link" href="/signup">
            申请注册
          </Link>
        </div>
      </section>
    </main>
  );
}

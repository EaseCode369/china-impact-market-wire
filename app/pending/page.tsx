import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/auth/actions";
import { getAuthState } from "@/lib/auth";

type PendingPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function PendingPage({ searchParams }: PendingPageProps) {
  const params = await searchParams;
  const authState = await getAuthState();

  if (!authState.user) {
    redirect("/login");
  }

  if (authState.status === "approved") {
    redirect("/");
  }

  if (authState.status === "disabled") {
    redirect("/disabled");
  }

  return (
    <main className="auth-shell">
      <section className="status-card">
        <p className="brand-kicker">Pending Review</p>
        <h1 className="auth-title">账号已创建，正在等待审核开通</h1>
        <p className="auth-description">
          当前账号状态为待审核。审核通过后，刷新页面或重新登录即可访问全部资讯内容。你可以在 Supabase 后台把该用户的 `status` 从
          `pending` 改为 `approved`。
        </p>

        <div className="status-grid">
          <div className="status-box">
            <div className="status-label">登录邮箱</div>
            <div className="status-value">{authState.user.email ?? "未读取到邮箱"}</div>
          </div>
          <div className="status-box">
            <div className="status-label">当前状态</div>
            <div className="status-value">待审核</div>
          </div>
        </div>

        {params.message ? <div className="auth-notice">{params.message}</div> : null}

        <div className="detail-actions">
          <form action={logoutAction}>
            <button className="button-link" type="submit">
              退出当前账号
            </button>
          </form>
          <Link className="button-link secondary" href="/login">
            返回登录页
          </Link>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/auth/actions";
import { getAuthState } from "@/lib/auth";

export default async function DisabledPage() {
  const authState = await getAuthState();

  if (!authState.user) {
    redirect("/login");
  }

  if (authState.status === "approved") {
    redirect("/");
  }

  if (authState.status === "pending") {
    redirect("/pending");
  }

  return (
    <main className="auth-shell">
      <section className="status-card">
        <p className="brand-kicker">Access Disabled</p>
        <h1 className="auth-title">当前账号暂不可访问客户专属内容</h1>
        <p className="auth-description">
          该账号已被设置为不可用状态，系统已阻止继续访问高盛研究及后续深度专题功能。如需恢复，请在 Supabase 后台将 `profiles.status` 调整回
          `approved`，再重新登录。
        </p>

        <div className="status-grid">
          <div className="status-box">
            <div className="status-label">登录邮箱</div>
            <div className="status-value">{authState.user.email ?? "未读取到邮箱"}</div>
          </div>
          <div className="status-box">
            <div className="status-label">当前状态</div>
            <div className="status-value">已禁用</div>
          </div>
        </div>

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

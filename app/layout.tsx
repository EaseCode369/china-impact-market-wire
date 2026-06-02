import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import "@/app/globals.css";
import { logoutAction } from "@/app/auth/actions";
import { getAuthState } from "@/lib/auth";

export const metadata: Metadata = {
  title: "香港高盛市场研究",
  description: "独立香港市场研究与资产配置顾问官网，提供公开信息研究与高盛内参客户区。",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authState = await getAuthState();
  const isApproved = authState.user && authState.status === "approved";

  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <div className="brand-lockup brand-lockup-wide">
              <div className="header-brand-frame">
                <Image
                  alt="Goldman Sachs HK Reference 英文品牌章实拍"
                  className="header-brand-mark header-brand-photo"
                  height={98}
                  priority
                  src="/brand/header-brand-photo.jpg"
                  width={150}
                />
              </div>
              <div className="brand-copy">
                <span className="brand-kicker">Goldman Sachs HK Reference</span>
                <Link className="brand-title" href="/">
                  香港高盛市场研究
                </Link>
                <div className="brand-subtitle">独立香港市场研究与资产配置顾问，聚焦公开信息研究与中国资产定价线索。</div>
              </div>
            </div>
            <nav className="top-nav" aria-label="主导航">
              {isApproved ? (
                <>
                  <Link className="nav-pill" href="/insights">
                    高盛内参
                  </Link>
                  <Link className="nav-pill" href="/sources">
                    国际来源
                  </Link>
                  <Link className="nav-pill" href="/reports">
                    策略库预留
                  </Link>
                </>
              ) : (
                <>
                  <Link className="nav-pill" href="/#home">
                    首页
                  </Link>
                  <Link className="nav-pill" href="/#about">
                    关于我们
                  </Link>
                  <Link className="nav-pill" href="/#services">
                    服务领域
                  </Link>
                  <Link className="nav-pill" href="/insights">
                    高盛内参
                  </Link>
                  <Link className="nav-pill" href="/#market-watch">
                    市场观察
                  </Link>
                  <Link className="nav-pill" href="/#contact">
                    联系我们
                  </Link>
                </>
              )}

              <div className="auth-nav">
                {authState.user ? (
                  <>
                    <div className="auth-badge">
                      <span>{authState.user.email ?? "已登录用户"}</span>
                      <strong>{authState.status === "approved" ? "已开通" : authState.status === "disabled" ? "已禁用" : "待审核"}</strong>
                    </div>
                    <form action={logoutAction}>
                      <button className="nav-pill nav-pill-button" type="submit">
                        退出登录
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link className="nav-pill" href="/login">
                      登录
                    </Link>
                    <Link className="nav-pill" href="/signup">
                      注册
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

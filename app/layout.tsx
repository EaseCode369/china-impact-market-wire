import type { Metadata } from "next";
import Link from "next/link";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "观潮财经",
  description: "聚合本地精选资讯与财经网站高质量快讯的中文财经新闻站点。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <div className="brand-lockup">
              <span className="brand-kicker">Market Wire</span>
              <Link className="brand-title" href="/">
                观潮财经
              </Link>
              <div className="brand-subtitle">
                本地导入资讯 + 白名单站点抓取，优先呈现当日市场情绪、重要事件与行业脉络。
              </div>
            </div>
            <nav className="top-nav" aria-label="主导航">
              <Link className="nav-pill" href="/">
                今日资讯
              </Link>
              <Link className="nav-pill" href="/sources/%E4%BB%8A%E6%97%A5%E6%96%B0%E9%97%BB">
                本地导入
              </Link>
              <Link className="nav-pill" href="/reports">
                研报解读
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "高盛内参（香港）",
  description: "聚合高价值国际公开标题流与中国股票直接影响资讯的品牌化站点。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
                  高盛内参（香港）
                </Link>
                <div className="brand-subtitle">公开标题流、精选预览流与中国股票直接影响筛选，聚焦更值得追踪的全球市场线索。</div>
              </div>
            </div>
            <nav className="top-nav" aria-label="主导航">
              <Link className="nav-pill" href="/">
                中国股票影响流
              </Link>
              <Link className="nav-pill" href="/sources">
                国际来源
              </Link>
              <Link className="nav-pill" href="/reports">
                策略库预留
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

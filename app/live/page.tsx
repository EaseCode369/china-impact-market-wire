import Link from "next/link";

import { getLiveFeed } from "@/lib/content";
import type { LiveFeedItem } from "@/lib/content-schema";

function formatDay(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateString));
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(dateString));
}

function groupByDay(items: LiveFeedItem[]) {
  const grouped = new Map<string, LiveFeedItem[]>();

  for (const item of items) {
    const day = formatDay(item.published_at);
    grouped.set(day, [...(grouped.get(day) ?? []), item]);
  }

  return Array.from(grouped.entries());
}

export default function LivePage() {
  const feed = getLiveFeed();
  const groups = groupByDay(feed.items);

  return (
    <main className="page-shell">
      <section className="hero live-hero">
        <div>
          <p className="brand-kicker">X Platform Monitor</p>
          <h1 className="hero-title">7×24</h1>
          <p className="hero-copy">
            跟踪指定 X 平台账号的最新动态，并提炼为中文快讯。Demo 阶段由本地 Mac 每小时抓取、提交 GitHub 并触发 Vercel 更新。
          </p>
          <div className="hero-badges">
            <span className="tag">最近 48 小时</span>
            <span className="tag">X 平台</span>
            <span className="tag">中文提炼</span>
          </div>
        </div>
      </section>

      <section className="live-layout">
        <div className="live-main">
          {groups.length === 0 ? (
            <div className="empty-state">
              当前还没有 7×24 快讯。请先在本机运行 `npm run live:login` 完成 X 登录，再运行 `npm run live:generate` 抓取指定账号最新动态。
            </div>
          ) : (
            groups.map(([day, items]) => (
              <section className="live-day" key={day}>
                <h2>{day}</h2>
                <div className="live-timeline">
                  {items.map((item) => (
                    <article className="live-item" key={item.id}>
                      <div className="live-time">{formatTime(item.published_at)}</div>
                      <div className="live-dot" aria-hidden="true" />
                      <div className="live-card">
                        <div className="news-card-meta">
                          <span className="meta-chip">@{item.handle}</span>
                          <span>{item.category}</span>
                          <span>{item.source_name}</span>
                        </div>
                        <h3 className="live-title">{item.title}</h3>
                        <p className="live-summary">{item.summary}</p>
                        <div className="tags-row">
                          {item.tags.slice(0, 5).map((tag) => (
                            <span className="tag" key={tag}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <div className="live-links">
                          <Link href={item.profile_url}>账号主页</Link>
                          {item.original_url ? (
                            <a href={item.original_url} rel="noreferrer" target="_blank">
                              原文
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <aside className="sidebar-stack">
          <div className="content-panel">
            <p className="brand-kicker">Status</p>
            <h2 className="section-title">抓取状态</h2>
            <p className="news-card-summary">当前展示 {feed.count} 条 7×24 快讯。</p>
            <p className="news-card-summary">最近生成时间：{formatDay(feed.generatedAt)} {formatTime(feed.generatedAt)}</p>
          </div>

          {feed.warnings.length > 0 ? (
            <div className="content-panel">
              <p className="brand-kicker">Warnings</p>
              <h2 className="section-title">抓取提示</h2>
              <div className="quick-list">
                {feed.warnings.map((warning) => (
                  <div className="live-warning" key={warning}>
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="content-panel">
            <p className="brand-kicker">Related</p>
            <h2 className="section-title">公开入口</h2>
            <div className="detail-actions">
              <Link className="button-link" href="/insights">
                公开资讯筛选
              </Link>
              <Link className="button-link secondary" href="/">
                返回首页
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

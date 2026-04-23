import Link from "next/link";

import { getAllPosts, getSiteStats, getSources } from "@/lib/content";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export default function HomePage() {
  const posts = getAllPosts();
  const stats = getSiteStats();
  const sources = getSources();
  const featuredPosts = posts.slice(0, 10);
  const quickList = posts.slice(0, 5);

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-grid">
          <div>
            <span className="brand-kicker" style={{ color: "rgba(255,247,232,0.74)" }}>
              Data-first newsroom
            </span>
            <h1 className="hero-title">把本地精选新闻和主流财经快讯，整理成一条可读的市场主线。</h1>
            <p className="hero-copy">
              当前站点会先读取“今日新闻”文件夹中的扫描版 PDF，并结合大智慧、东方财富、财联社、证券时报的白名单抓取结果，
              自动生成可直接浏览的资讯流页面，后续再继续接审核与研报模块。
            </p>
          </div>
          <aside className="metric-panel">
            <div className="metric-value">{stats.total}</div>
            <div className="metric-label">已生成资讯条目</div>
            <div className="metric-hint">
              本地导入 {stats.localCount} 条，网站抓取 {stats.externalCount} 条。
              {stats.latestPublishedAt ? ` 最近更新时间：${formatDate(stats.latestPublishedAt)}` : " 先运行生成脚本后，这里会展示最新内容。"}
            </div>
          </aside>
        </div>
      </section>

      <section className="content-grid">
        <div className="content-panel">
          <div className="section-heading">
            <div>
              <p className="brand-kicker">News Flow</p>
              <h2 className="section-title">今日市场资讯流</h2>
            </div>
            <div className="section-caption">默认按发布时间倒序排列，优先展示最新生成内容。</div>
          </div>

          {featuredPosts.length === 0 ? (
            <div className="empty-state">
              暂时还没有生成内容。先运行 `npm run generate:all`，站点就会自动读取生成后的 JSON 数据。
            </div>
          ) : (
            <div className="news-list">
              {featuredPosts.map((post) => (
                <Link className="news-card" key={post.id} href={`/news/${post.slug}`}>
                  <div className="news-card-meta">
                    <span className="meta-chip">{post.source_name}</span>
                    <span>{post.category}</span>
                    <span>{formatDate(post.published_at)}</span>
                  </div>
                  <h3 className="news-card-title">{post.title}</h3>
                  <p className="news-card-summary">{post.summary}</p>
                  <div className="tags-row">
                    {post.tags.slice(0, 4).map((tag) => (
                      <span className="tag" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="sidebar-stack">
          <div className="content-panel">
            <div className="section-heading">
              <div>
                <p className="brand-kicker">Sources</p>
                <h2 className="section-title">来源地图</h2>
              </div>
            </div>
            <div className="source-list">
              {sources.map((source) => (
                <Link href={`/sources/${source.slug}`} key={source.name}>
                  <div className="source-name">{source.name}</div>
                  <div className="source-count">{source.count} 条内容</div>
                </Link>
              ))}
            </div>
          </div>

          <div className="content-panel">
            <div className="section-heading">
              <div>
                <p className="brand-kicker">Radar</p>
                <h2 className="section-title">今日速览</h2>
              </div>
            </div>
            <div className="quick-list">
              {quickList.map((post) => (
                <Link href={`/news/${post.slug}`} key={post.id}>
                  <div className="source-name">{post.title}</div>
                  <div className="quick-time">
                    {post.source_name} · {formatDate(post.published_at)}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="placeholder-card">
            <p className="brand-kicker">Reports</p>
            <h2 className="section-title">研报解读入口已预留</h2>
            <p className="news-card-summary">
              当前版本先把资讯流跑通。后续你发来研报或解读成稿后，这里可以直接接入独立栏目、专题页和首页推荐位。
            </p>
            <div className="detail-actions">
              <Link className="button-link secondary" href="/reports">
                查看占位页
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";

import { getAllPosts, getRelevantPosts, getSiteStats, getSourcesByGroup } from "@/lib/content";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export default function InsightsPage() {
  const posts = getAllPosts();
  const relevantPosts = getRelevantPosts();
  const stats = getSiteStats();
  const sourceGroups = getSourcesByGroup();
  const featuredPosts = relevantPosts.slice(0, 10);
  const latestPosts = posts.slice(0, 6);

  return (
    <main className="page-shell">
      <section className="hero hero-brand">
        <div className="hero-grid hero-grid-brand">
          <div>
            <span className="brand-kicker hero-kicker">Goldman Sachs HK Reference</span>
            <h1 className="hero-title">高盛内参</h1>
            <p className="hero-copy">
              围绕中国资产定价主线，汇总全球公开信息、提炼可交易线索，并按影响强度优先呈现。
              覆盖 Reuters、Bloomberg、Financial Times、WSJ、SCMP、华尔街见闻、第一财经、21财经、财联社与证券时报等公开来源。
            </p>
            <div className="hero-badges">
              <span className="tag">客户内参区</span>
              <span className="tag">中国资产定价线索</span>
            </div>
          </div>
          <aside className="metric-panel metric-panel-brand">
            <div className="metric-panel-header">
              <Image
                alt="高盛内参（香港）品牌章"
                className="seal-mark seal-mark-image"
                height={120}
                priority
                src="/brand/seal-hk-cropped.png"
                width={120}
              />
              <div>
                <div className="metric-value">{stats.chinaRelevantCount}</div>
                <div className="metric-label">直接影响中国股票</div>
              </div>
            </div>
            <div className="metric-hint">
              当前样本共纳入 {stats.total} 条资讯，去重过滤 {stats.dedupedCount} 条重复项。
              {stats.latestPublishedAt ? ` 最新入库时间：${formatDate(stats.latestPublishedAt)}。` : " 请先运行 `npm run generate:all` 生成最新样本。"}
            </div>
            <div className="metric-inline">
              <span>纳入监测来源 {stats.activeSources.length}</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="content-grid">
        <div className="content-panel">
          <div className="section-heading">
            <div>
              <p className="brand-kicker">Direct Impact</p>
              <h2 className="section-title">直接影响中国股票</h2>
            </div>
            <div className="section-caption">默认按影响相关性、来源权重与发布时间综合排序。</div>
          </div>

          {featuredPosts.length === 0 ? (
            <div className="empty-state">当前尚无命中“中国股票直接影响”规则的样本。请先运行 `npm run generate:all` 后再查看结果。</div>
          ) : (
            <div className="news-list">
              {featuredPosts.map((post) => (
                <Link className="news-card" key={post.id} href={`/news/${post.slug}`}>
                  <div className="news-card-meta">
                    <span className="meta-chip">{post.source_name}</span>
                    <span>{post.category}</span>
                    <span>{post.content_level === "headline" ? "标题流" : post.content_level === "teaser" ? "预览流" : "摘要流"}</span>
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
                    {post.relevance_reason ? <span className="tag tag-strong">{post.relevance_reason}</span> : null}
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
                <p className="brand-kicker">Source Groups</p>
                <h2 className="section-title">来源地图</h2>
              </div>
            </div>
            <div className="source-groups">
              {sourceGroups.map((group) => (
                <section key={group.group} className="source-group-block">
                  <div className="source-group-title">{formatGroupLabel(group.group)}</div>
                  <div className="source-list">
                    {group.sources.map((source) => (
                      <Link href={`/sources/${source.slug}`} key={source.name}>
                        <div className="source-name">{source.name}</div>
                        <div className="source-count">
                          {source.count} 条内容 · 相关 {source.chinaRelevantCount} 条
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="content-panel">
            <div className="section-heading">
              <div>
                <p className="brand-kicker">Latest Feed</p>
                <h2 className="section-title">全部资讯速览</h2>
              </div>
            </div>
            <div className="quick-list">
              {latestPosts.map((post) => (
                <Link href={`/news/${post.slug}`} key={post.id}>
                  <div className="source-name">{post.title}</div>
                  <div className="quick-time">
                    {post.source_name} · {formatDate(post.published_at)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function formatGroupLabel(group: string) {
  switch (group) {
    case "global_media":
      return "国际高价值公开标题流";
    case "hk_media":
      return "香港与区域媒体";
    case "china_media":
      return "中国补充资讯源";
    case "strategy_feed":
      return "策略与机构源";
    case "local_pdf":
      return "本地导入";
    default:
      return group;
  }
}

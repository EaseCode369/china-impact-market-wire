import Image from "next/image";
import Link from "next/link";

import { getRelevantPosts, getSiteStats, getTopics } from "@/lib/content";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export default function InsightsPage() {
  const relevantPosts = getRelevantPosts();
  const stats = getSiteStats();
  const topics = getTopics();
  const featuredPosts = relevantPosts;
  const latestPosts = relevantPosts.slice(0, 8);

  return (
    <main className="page-shell">
      <section className="hero hero-brand">
        <div className="hero-grid hero-grid-brand">
          <div>
            <span className="brand-kicker hero-kicker">Goldman Sachs HK News</span>
            <h1 className="hero-title">高盛资讯</h1>
            <p className="hero-copy">
              围绕中国资产定价主线，抓取公开财经新闻、生成短摘要，并按影响强度优先呈现。
              覆盖 Reuters、Bloomberg、Financial Times、WSJ、SCMP、联合早报、华尔街见闻、第一财经、21财经、证券时报等公开来源。
            </p>
            <div className="hero-badges">
              <span className="tag">公开资讯流</span>
              <span className="tag">中国资产定价线索</span>
            </div>
            <div className="topic-nav" aria-label="财经栏目">
              {topics.slice(0, 8).map((topic) => (
                <Link className="topic-nav-link" href={`/topics/${topic.slug}`} key={topic.id}>
                  {topic.name}
                  <span>{topic.count}</span>
                </Link>
              ))}
            </div>
          </div>
          <aside className="metric-panel metric-panel-brand">
            <div className="metric-panel-header">
              <Image
                alt="高盛资讯（香港）品牌章"
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
              <h2 className="section-title">中国资产影响信息流</h2>
            </div>
            <div className="section-caption">展示本次生成的全部相关资讯，默认按影响相关性、来源权重与发布时间综合排序。</div>
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
                <p className="brand-kicker">Columns</p>
                <h2 className="section-title">财经栏目</h2>
              </div>
            </div>
            <div className="source-groups">
              <section className="source-group-block">
                <div className="source-group-title">按主题浏览</div>
                <div className="source-list">
                  {topics.map((topic) => (
                    <Link href={`/topics/${topic.slug}`} key={topic.id}>
                      <div className="source-name">{topic.name}</div>
                      <div className="source-count">
                        {topic.count} 条相关内容 · {topic.description}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div className="content-panel">
            <div className="section-heading">
              <div>
                <p className="brand-kicker">Latest Feed</p>
                <h2 className="section-title">相关资讯速览</h2>
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

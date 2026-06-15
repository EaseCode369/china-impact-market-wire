import Link from "next/link";

import { getRelevantPosts, getSiteStats, getTopics } from "@/lib/content";

const marketNotes = [
  {
    title: "公开资讯筛选",
    summary: "抓取公开财经网站信息，保留标题、短摘要、来源和原文入口，帮助客户快速识别市场变量。",
    tag: "资讯",
  },
  {
    title: "主题内参判断",
    summary: "围绕重点主题整合多篇公开文章，输出有结论、有脉络、有投资含义的客户文章。",
    tag: "内参",
  },
  {
    title: "高质量研报服务",
    summary: "面向研报提炼、行业框架和投资人展示内容，后续逐步接入更成熟的研究流程。",
    tag: "研究",
  },
];

const serviceCards = ["公开资讯摘要与筛选", "中国资产主题内参", "高质量研报提炼", "亚太投资机构服务"];

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export default function HomePage() {
  const relevantPosts = getRelevantPosts();
  const stats = getSiteStats();
  const topics = getTopics();
  const latestPosts = relevantPosts.slice(0, 8);

  return (
    <main>
      <section className="market-strip" aria-label="服务摘要">
        <div className="market-strip-inner">
          <span>香港投资集团</span>
          <span>亚太机构服务</span>
          <span>公开资讯筛选</span>
          <span>客户主题内参</span>
          <span>高质量研报服务</span>
        </div>
      </section>

      <section className="portal-shell home-portal" id="home">
        <div className="portal-main">
          <article className="lead-story">
            <div className="lead-media" aria-hidden="true" />
            <div className="lead-body">
              <p className="brand-kicker">Hong Kong Goldman Investment Group</p>
              <h1 className="lead-title">香港高盛投资集团</h1>
              <p className="lead-copy">立足香港，面向亚太地区的投资机构、企业与家族办公室，提供资讯、内参和高质量研报服务。</p>
              <div className="lead-actions">
                <Link className="button-link" href="#market-feed">
                  查看最新资讯
                </Link>
                <Link className="button-link secondary" href="/briefing">
                  进入高盛内参
                </Link>
              </div>
            </div>
          </article>

          <div className="topic-grid">
            {marketNotes.map((note) => (
              <article className="topic-card" key={note.title}>
                <span>{note.tag}</span>
                <h2>{note.title}</h2>
                <p>{note.summary}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="portal-side">
          <section className="side-panel insight-entry">
            <div className="panel-label">Market Feed</div>
            <h2>官网首页直接呈现公开资讯流</h2>
            <p>公开资讯暂不单独设立导航板块。客户打开官网后可直接向下浏览最新市场信息，后续计划升级为每小时更新。</p>
            <div className="insight-bullet-grid">
              <span>当前样本 {stats.total} 条</span>
              <span>中国资产相关 {stats.chinaRelevantCount} 条</span>
              <span>已过滤重复 {stats.dedupedCount} 条</span>
            </div>
            <Link className="text-link panel-link" href="#market-feed">
              跳转到最新资讯
            </Link>
          </section>

          <section className="side-panel compact-list">
            <div className="section-heading compact-heading">
              <div>
                <p className="brand-kicker">Notice</p>
                <h2 className="section-title">重要声明</h2>
              </div>
            </div>
            <p>本站以独立顾问机构口径运营，不代表 Goldman Sachs 集团或其关联实体。站内内容仅用于研究讨论。</p>
          </section>
        </aside>
      </section>

      <section className="page-shell public-section" id="about">
        <div className="section-heading">
          <div>
            <p className="brand-kicker">About Us</p>
            <h2 className="section-title">立足香港，服务亚太专业客户</h2>
          </div>
          <div className="section-caption">面向投资机构、企业与家族办公室，提供资讯筛选、主题内参和研究支持。</div>
        </div>
        <div className="public-news-grid">
          {marketNotes.map((note) => (
            <article className="news-card public-feature-card" key={note.title}>
              <div className="news-card-meta">
                <span className="meta-chip">{note.tag}</span>
                <span>内容服务</span>
              </div>
              <h3 className="news-card-title">{note.title}</h3>
              <p className="news-card-summary">{note.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-band" id="services">
        <div className="page-shell public-service-grid">
          <div>
            <p className="brand-kicker">Services</p>
            <h2 className="section-title">服务领域</h2>
            <p className="detail-summary">官网首页承载公开市场资讯；客户专区承载主题内参和研究服务，重点放在信息结构化与投资人沟通支持。</p>
          </div>
          <div className="service-list">
            {serviceCards.map((item) => (
              <div className="service-item" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-feed-shell" id="market-feed">
        <div className="feed-main">
          <div className="feed-section-heading">
            <div>
              <p className="brand-kicker">Market Updates</p>
              <h2 className="section-title">最新资讯</h2>
            </div>
            <div className="section-caption">公开财经信息按影响相关性、来源权重与发布时间综合排序。</div>
          </div>

          {relevantPosts.length === 0 ? (
            <div className="empty-state">当前尚无命中“中国股票直接影响”规则的样本。请先运行 `npm run generate:all` 后再查看结果。</div>
          ) : (
            <div className="feed-list">
              {relevantPosts.map((post) => (
                <Link className="feed-card" key={post.id} href={`/news/${post.slug}`}>
                  <div className="feed-card-body">
                    <div className="news-card-meta">
                      <span className="meta-chip">{post.source_name}</span>
                      <span>{post.category}</span>
                      <span>{post.content_level === "headline" ? "标题流" : post.content_level === "teaser" ? "预览流" : "摘要流"}</span>
                      <span>{formatDate(post.published_at)}</span>
                    </div>
                    <h3 className="feed-card-title">{post.title}</h3>
                    <p className="feed-card-summary">{post.summary}</p>
                    <div className="tags-row">
                      {post.tags.slice(0, 4).map((tag) => (
                        <span className="tag" key={tag}>
                          #{tag}
                        </span>
                      ))}
                      {post.relevance_reason ? <span className="tag tag-strong">{post.relevance_reason}</span> : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="feed-side">
          <section className="content-panel">
            <div className="section-heading">
              <div>
                <p className="brand-kicker">Columns</p>
                <h2 className="section-title">财经栏目</h2>
              </div>
            </div>
            <div className="topic-nav topic-nav-vertical" aria-label="财经栏目">
              {topics.map((topic) => (
                <Link className="topic-nav-link" href={`/topics/${topic.slug}`} key={topic.id}>
                  {topic.name}
                  <span>{topic.count}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="content-panel">
            <div className="section-heading">
              <div>
                <p className="brand-kicker">Quick View</p>
                <h2 className="section-title">资讯速览</h2>
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
          </section>

          <section className="content-panel" id="contact">
            <p className="brand-kicker">Client Area</p>
            <h2 className="section-title">客户专区</h2>
            <p className="news-card-summary">审核通过的客户可访问高盛内参；高盛研究板块保留入口，后续逐步更新高质量研报提炼内容。</p>
            <div className="detail-actions">
              <Link className="button-link" href="/briefing">
                进入高盛内参
              </Link>
              <Link className="button-link secondary" href="/signup">
                申请注册
              </Link>
            </div>
          </section>
        </aside>
      </section>

      <footer className="public-footer">
        <div className="page-shell public-footer-inner">
          <section>
            <h2>香港高盛投资集团</h2>
            <p>立足香港，面向亚太地区的投资机构、企业与家族办公室，提供资讯、内参和高质量研报服务。</p>
          </section>
          <section>
            <h3>公司信息</h3>
            <Link href="/#about">关于我们</Link>
            <Link href="/#services">服务领域</Link>
            <Link href="/#market-feed">最新资讯</Link>
            <Link href="/#contact">联系我们</Link>
          </section>
          <section>
            <h3>客户入口</h3>
            <Link href="/briefing">高盛内参</Link>
            <Link href="/reports">高盛研究</Link>
            <Link href="/login">客户登录</Link>
            <Link href="/signup">申请注册</Link>
          </section>
          <section>
            <h3>法律信息</h3>
            <p>本站内容基于公开信息整理，仅用于研究讨论，不构成任何金融产品的购买建议。</p>
            <p>本站与 Goldman Sachs 集团及其关联实体无隶属、授权或代理关系。</p>
          </section>
        </div>
        <div className="footer-bottom">© 2026 香港高盛投资集团。客户申请请通过站内注册入口提交。</div>
      </footer>
    </main>
  );
}

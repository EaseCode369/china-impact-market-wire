import Link from "next/link";

const marketNotes = [
  {
    title: "公开资讯摘要",
    summary: "高盛资讯保留单篇新闻的标题、短摘要、来源和原文入口，帮助客户快速筛选每日增量。",
    tag: "News",
  },
  {
    title: "主题内参判断",
    summary: "高盛内参围绕一个主题整合多篇公开文章，输出一篇有结论、有脉络、有投资含义的客户文章。",
    tag: "Briefing",
  },
  {
    title: "研报提炼研究",
    summary: "高盛研究面向高质量研报进行结构化提炼，后续可替换为你提供的真实研报内容。",
    tag: "Research",
  },
];

const featuredTopics = [
  {
    title: "高盛资讯",
    summary: "公开新闻摘要流，直接抓取单篇财经新闻并生成短摘要，适合快速扫读。",
    label: "公开访问",
  },
  {
    title: "高盛内参",
    summary: "围绕单一主题整合多篇公开文章，输出一篇完整判断，降低客户阅读成本。",
    label: "客户专属",
  },
  {
    title: "高盛研究",
    summary: "对高质量研报进行提炼、改写和结构化展示，形成投资人可读版本。",
    label: "客户专属",
  },
];

const serviceCards = [
  "公开资讯摘要与筛选",
  "中国资产主题内参",
  "高质量研报提炼",
  "投资人沟通材料支持",
];

const productEntries = [
  {
    title: "高盛资讯",
    summary: "抓取公开财经新闻，保留标题、摘要、来源和原文入口，适合快速扫读。",
    href: "/insights",
    tag: "公开",
  },
  {
    title: "高盛内参",
    summary: "按主题聚合多篇公开文章，整理成一篇完整判断，降低客户阅读成本。",
    href: "/briefing",
    tag: "客户专属",
  },
  {
    title: "高盛研究",
    summary: "对高质量研报进行提炼、改写和结构化展示，形成投资人可读版本。",
    href: "/reports",
    tag: "客户专属",
  },
];

const insightBullets = ["单篇资讯摘要", "主题深度内参", "研报提炼研究", "客户审核访问"];

export default function HomePage() {
  return (
    <main>
      <section className="market-strip" aria-label="服务摘要">
        <div className="market-strip-inner">
          <span>香港研究机构</span>
          <span>高盛资讯</span>
          <span>高盛内参</span>
          <span>高盛研究</span>
          <span>独立顾问口径</span>
        </div>
      </section>

      <section className="portal-shell" id="home">
        <div className="portal-main">
          <article className="lead-story">
            <div className="lead-media" aria-hidden="true" />
            <div className="lead-body">
              <p className="brand-kicker">Hong Kong Research Institute</p>
              <h1 className="lead-title">香港高盛研究院</h1>
              <p className="lead-copy">
                立足香港，面向专业投资人、企业与家族办公室，提供公开资讯摘要、主题内参和高质量研报提炼。
              </p>
              <div className="lead-actions">
                <Link className="button-link" href="/insights">
                  进入高盛资讯
                </Link>
                <Link className="button-link secondary" href="/briefing">
                  查看高盛内参
                </Link>
              </div>
            </div>
          </article>

          <div className="topic-grid">
            {featuredTopics.map((topic) => (
              <article className="topic-card" key={topic.title}>
                <span>{topic.label}</span>
                <h2>{topic.title}</h2>
                <p>{topic.summary}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="portal-side">
          <section className="side-panel insight-entry">
            <div className="panel-label">产品分区</div>
            <h2>资讯、内参、研究分层交付</h2>
            <p>公开资讯用于快速扫读；内参负责主题判断；研究页承载研报提炼，三个入口分别解决不同阅读场景。</p>
            <div className="insight-bullet-grid">
              {insightBullets.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <Link className="text-link panel-link" href="/insights">
              查看高盛资讯
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
            <h2 className="section-title">专注香港与中国资产的独立研究顾问</h2>
          </div>
          <div className="section-caption">官网公开展示，公司介绍与客户内容分区管理。</div>
        </div>
        <div className="public-news-grid">
          {marketNotes.map((note) => (
            <article className="news-card public-feature-card" key={note.title}>
              <div className="news-card-meta">
                <span className="meta-chip">{note.tag}</span>
                <span>内容产品</span>
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
            <p className="detail-summary">我们不把外部链接或报价看板作为官网核心内容；重点放在信息结构化、主题判断和投资人沟通支持。</p>
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

      <section className="page-shell public-section" id="products">
        <div className="section-heading">
          <div>
            <p className="brand-kicker">Products</p>
            <h2 className="section-title">三类内容产品</h2>
          </div>
          <div className="section-caption">不展示外部网站入口，重点呈现香港高盛研究院自己的内容交付层级。</div>
        </div>
        <div className="source-link-grid">
          {productEntries.map((entry) => (
            <Link className="source-link-card" href={entry.href} key={entry.title}>
              <div className="source-link-meta">
                <span>{entry.tag}</span>
              </div>
              <h3>{entry.title}</h3>
              <p>{entry.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-shell public-section" id="market-watch">
        <div className="content-grid">
          <div className="content-panel">
            <div className="section-heading">
              <div>
                <p className="brand-kicker">Market Watch</p>
                <h2 className="section-title">市场观察</h2>
              </div>
            </div>
            <div className="news-list">
              <article className="news-card">
                <div className="news-card-meta">
                  <span className="meta-chip">主题</span>
                  <span>港股流动性</span>
                </div>
                <h3 className="news-card-title">从资金流向、政策预期与海外风险偏好中寻找港股定价线索。</h3>
                <p className="news-card-summary">公开官网展示研究方向，高盛资讯承载新闻摘要流，高盛内参承载主题判断。</p>
              </article>
              <article className="news-card">
                <div className="news-card-meta">
                  <span className="meta-chip">主题</span>
                  <span>产业链</span>
                </div>
                <h3 className="news-card-title">围绕 AI、半导体、消费、地产与金融板块持续跟踪跨市场影响。</h3>
                <p className="news-card-summary">高盛研究面向研报提炼，帮助投资人快速抓住行业驱动、盈利模式和风险点。</p>
              </article>
            </div>
          </div>

          <aside className="sidebar-stack">
            <div className="content-panel">
              <p className="brand-kicker">Client Area</p>
              <h2 className="section-title">高盛内参</h2>
              <p className="news-card-summary">客户审核通过后，可查看中国房价等主题内参，以及后续按主题扩展的深度文章。</p>
              <div className="detail-actions">
                <Link className="button-link" href="/briefing">
                  进入内参
                </Link>
              </div>
            </div>
            <div className="content-panel" id="contact">
              <p className="brand-kicker">Contact</p>
              <h2 className="section-title">联系我们</h2>
              <p className="news-card-summary">面向专业客户开放注册申请。请通过站内注册提交邮箱，审核通过后进入客户区。</p>
              <div className="detail-actions">
                <Link className="button-link secondary" href="/signup">
                  申请注册
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <footer className="public-footer">
        <div className="page-shell public-footer-inner">
          <section>
            <h2>香港高盛研究院</h2>
            <p>独立香港研究与资产配置顾问机构。</p>
          </section>
          <section>
            <h3>公司信息</h3>
            <Link href="/#about">关于我们</Link>
            <Link href="/#services">服务领域</Link>
            <Link href="/#products">内容产品</Link>
            <Link href="/#market-watch">市场观察</Link>
            <Link href="/#contact">联系我们</Link>
          </section>
          <section>
            <h3>客户入口</h3>
            <Link href="/insights">高盛资讯</Link>
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
        <div className="footer-bottom">© 2026 香港高盛研究院。客户申请请通过站内注册入口提交。</div>
      </footer>
    </main>
  );
}

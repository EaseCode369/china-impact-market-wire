import Link from "next/link";

const marketNotes = [
  {
    title: "公开资讯筛选",
    summary: "抓取公开财经网站信息，保留标题、短摘要、来源和原文入口，帮助客户快速识别市场变量。",
    href: "/insights",
    tag: "公开",
  },
  {
    title: "7×24",
    summary: "跟踪指定 X 平台账号的最新动态，提炼为中文快讯，适合快速浏览市场讨论的增量信息。",
    href: "/live",
    tag: "Demo",
  },
  {
    title: "高盛内参",
    summary: "围绕重点主题整合多篇公开文章，输出有结论、有脉络、有投资含义的客户文章。",
    href: "/briefing",
    tag: "客户专属",
  },
  {
    title: "高盛研究",
    summary: "面向研报提炼、行业框架和投资人展示内容，后续逐步接入更成熟的研究流程。",
    href: "/reports",
    tag: "客户专属",
  },
];

const serviceCards = ["公开资讯摘要与筛选", "7×24 快讯跟踪", "中国资产主题内参", "高质量研报提炼", "亚太投资机构服务", "投资人沟通材料支持"];

export default function HomePage() {
  return (
    <main>
      <section className="market-strip" aria-label="服务摘要">
        <div className="market-strip-inner">
          <span>香港投资集团</span>
          <span>亚太机构服务</span>
          <span>公开资讯筛选</span>
          <span>7×24 快讯</span>
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
                <Link className="button-link" href="/live">
                  查看 7×24
                </Link>
                <Link className="button-link secondary" href="/briefing">
                  进入高盛内参
                </Link>
              </div>
            </div>
          </article>

          <div className="topic-grid product-grid">
            {marketNotes.map((note) => (
              <Link className="topic-card product-card-link" href={note.href} key={note.title}>
                <span>{note.tag}</span>
                <h2>{note.title}</h2>
                <p>{note.summary}</p>
              </Link>
            ))}
          </div>
        </div>

        <aside className="portal-side">
          <section className="side-panel insight-entry">
            <div className="panel-label">Client Services</div>
            <h2>面向专业客户的资讯与研究服务</h2>
            <p>官网主页面保持正式展示口径；市场资讯和 7×24 快讯进入独立页面，方便客户按场景浏览。</p>
            <div className="insight-bullet-grid">
              <span>公开资讯筛选</span>
              <span>7×24 X 平台快讯</span>
              <span>客户主题内参</span>
              <span>高盛研究预留</span>
            </div>
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
          {marketNotes.slice(0, 3).map((note) => (
            <Link className="news-card public-feature-card" href={note.href} key={note.title}>
              <div className="news-card-meta">
                <span className="meta-chip">{note.tag}</span>
                <span>内容服务</span>
              </div>
              <h3 className="news-card-title">{note.title}</h3>
              <p className="news-card-summary">{note.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="public-band" id="services">
        <div className="page-shell public-service-grid">
          <div>
            <p className="brand-kicker">Services</p>
            <h2 className="section-title">服务领域</h2>
            <p className="detail-summary">公开页面负责资讯筛选与 7×24 快讯；客户专区承载主题内参和研究服务，重点放在信息结构化与投资人沟通支持。</p>
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

      <section className="page-shell public-section" id="contact">
        <div className="content-grid">
          <div className="content-panel">
            <p className="brand-kicker">Market Access</p>
            <h2 className="section-title">公开市场入口</h2>
            <p className="news-card-summary">公开资讯筛选用于查看已抓取财经新闻；7×24 用于查看指定 X 平台账号的最新动态提炼。</p>
            <div className="detail-actions">
              <Link className="button-link" href="/insights">
                公开资讯筛选
              </Link>
              <Link className="button-link secondary" href="/live">
                7×24
              </Link>
            </div>
          </div>

          <aside className="sidebar-stack">
            <div className="content-panel">
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
            </div>
          </aside>
        </div>
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
            <Link href="/#contact">联系我们</Link>
          </section>
          <section>
            <h3>公开入口</h3>
            <Link href="/insights">公开资讯筛选</Link>
            <Link href="/live">7×24</Link>
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

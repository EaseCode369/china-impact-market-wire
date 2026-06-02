import Link from "next/link";

const marketNotes = [
  {
    title: "中国资产定价线索",
    summary: "跟踪宏观政策、产业链变化、港股流动性与海外资金风险偏好，将公开信息转化为可追踪的研究主题。",
    tag: "Research",
  },
  {
    title: "香港市场顾问服务",
    summary: "为企业、家族办公室与专业投资人提供市场观察、资产配置讨论和公开信息研究支持。",
    tag: "Advisory",
  },
  {
    title: "跨市场事件跟踪",
    summary: "围绕美股、港股、A股、商品与利率变量，筛选可能影响中国资产价格的高价值增量。",
    tag: "Markets",
  },
];

const serviceCards = [
  "公开信息研究与主题梳理",
  "中国资产定价线索监测",
  "港股与跨境市场观察",
  "企业战略与投资者沟通支持",
];

const insightBullets = ["全球公开标题流聚合", "中国股票直接影响筛选", "来源权重与重复项压缩", "客户审核后访问"];

export default function HomePage() {
  return (
    <main>
      <section className="public-hero" id="home">
        <div className="public-hero-inner">
          <div className="public-hero-copy">
            <span className="brand-kicker hero-kicker">Hong Kong Market Research</span>
            <h1 className="public-hero-title">香港高盛市场研究</h1>
            <p className="hero-copy">
              立足香港，面向专业投资人、企业与家族办公室，提供公开信息研究、跨市场观察与中国资产定价线索梳理。
              我们以独立顾问机构口径运营，不代表 Goldman Sachs 集团或其关联实体。
            </p>
            <div className="hero-actions">
              <Link className="button-link" href="/insights">
                进入高盛内参
              </Link>
              <Link className="button-link secondary" href="#services">
                查看服务领域
              </Link>
            </div>
            <div className="hero-badges">
              <span className="tag">香港市场研究与资产配置顾问</span>
              <span className="tag">公开信息研究</span>
              <span className="tag">中国资产定价线索</span>
            </div>
          </div>
          <aside className="public-hero-panel">
            <div className="panel-label">高盛内参</div>
            <h2>客户专属市场观察入口</h2>
            <p>以公开来源为基础，压缩重复转载和情绪化噪声，优先呈现可能影响中国资产定价的关键信息。</p>
            <div className="insight-bullet-grid">
              {insightBullets.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="page-shell public-section" id="about">
        <div className="section-heading">
          <div>
            <p className="brand-kicker">About Us</p>
            <h2 className="section-title">专注香港与中国资产的独立研究顾问</h2>
          </div>
          <div className="section-caption">官网公开展示，公司介绍与客户内参分区管理。</div>
        </div>
        <div className="public-news-grid">
          {marketNotes.map((note) => (
            <article className="news-card public-feature-card" key={note.title}>
              <div className="news-card-meta">
                <span className="meta-chip">{note.tag}</span>
                <span>公开信息研究</span>
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
            <p className="detail-summary">
              我们不把报价看板作为官网核心内容；重点放在研究判断、信息结构化和客户沟通支持。
            </p>
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
                <p className="news-card-summary">公开官网仅展示研究方向，高盛内参客户区承载更细的来源地图和资讯条目。</p>
              </article>
              <article className="news-card">
                <div className="news-card-meta">
                  <span className="meta-chip">主题</span>
                  <span>产业链</span>
                </div>
                <h3 className="news-card-title">围绕 AI、半导体、消费、地产与金融板块持续跟踪跨市场影响。</h3>
                <p className="news-card-summary">用华尔街见闻式的信息密度呈现研究入口，重点保留公司官网与客户内参的清晰分区。</p>
              </article>
            </div>
          </div>

          <aside className="sidebar-stack">
            <div className="content-panel">
              <p className="brand-kicker">Client Area</p>
              <h2 className="section-title">高盛内参</h2>
              <p className="news-card-summary">客户审核通过后，可访问中国股票影响流、国际来源聚合页和策略库预留入口。</p>
              <div className="detail-actions">
                <Link className="button-link" href="/insights">
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
          <div>
            <div className="brand-title">香港高盛市场研究</div>
            <p>独立香港市场研究与资产配置顾问机构。</p>
          </div>
          <p>
            免责声明：本站内容基于公开信息整理，仅用于研究讨论，不构成证券、基金、保险或任何金融产品的购买建议。
            本站与 Goldman Sachs 集团及其关联实体无隶属、授权或代理关系。
          </p>
        </div>
      </footer>
    </main>
  );
}

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

const featuredTopics = [
  {
    title: "面向专业客户的公开信息研究",
    summary: "围绕港股、A股、海外市场和产业链变量，建立可持续追踪的信息框架。",
    label: "研究方法",
  },
  {
    title: "高盛内参客户区",
    summary: "客户审核通过后，可进入内参区查看中国股票影响流、国际来源聚合和策略库入口。",
    label: "客户入口",
  },
  {
    title: "独立香港顾问机构口径",
    summary: "本站以独立市场研究顾问身份运营，不代表 Goldman Sachs 集团或其关联实体。",
    label: "品牌声明",
  },
];

const serviceCards = [
  "公开信息研究与主题梳理",
  "中国资产定价线索监测",
  "港股与跨境市场观察",
  "企业战略与投资者沟通支持",
];

const domesticSourceLinks = [
  {
    name: "华尔街见闻",
    href: "https://wallstreetcn.com/",
    note: "宏观、市场与全球资产快讯入口",
    status: "内参监测",
  },
  {
    name: "第一财经",
    href: "https://www.yicai.com/",
    note: "股市、政策、产业与公司新闻",
    status: "内参监测",
  },
  {
    name: "21财经",
    href: "https://www.21jingji.com/",
    note: "资本市场、公司与宏观观察",
    status: "内参监测",
  },
  {
    name: "证券时报网",
    href: "https://www.stcn.com/",
    note: "证券市场、上市公司与政策资讯",
    status: "内参监测",
  },
  {
    name: "联合早报",
    href: "https://www.zaobao.com/",
    note: "中国、亚洲与国际时事参考",
    status: "外链参考",
  },
  {
    name: "澎湃新闻",
    href: "https://www.thepaper.cn/",
    note: "时政、经济与社会公共议题",
    status: "外链参考",
  },
  {
    name: "金十数据",
    href: "https://www.jin10.com/",
    note: "全球宏观、商品与金融快讯",
    status: "外链参考",
  },
  {
    name: "财新网",
    href: "https://www.caixin.com/",
    note: "深度财经报道与政策背景",
    status: "外链参考",
  },
  {
    name: "大智慧",
    href: "https://www.gw.com.cn/",
    note: "市场数据与投资资讯参考",
    status: "外链参考",
  },
];

const insightBullets = ["全球公开标题流聚合", "中国股票直接影响筛选", "来源权重与重复项压缩", "客户审核后访问"];

export default function HomePage() {
  return (
    <main>
      <section className="market-strip" aria-label="服务摘要">
        <div className="market-strip-inner">
          <span>香港市场研究</span>
          <span>公开信息研究</span>
          <span>中国资产定价线索</span>
          <span>客户审核制内参</span>
          <span>独立顾问机构</span>
        </div>
      </section>

      <section className="portal-shell" id="home">
        <div className="portal-main">
          <article className="lead-story">
            <div className="lead-media" aria-hidden="true" />
            <div className="lead-body">
              <p className="brand-kicker">Hong Kong Market Research</p>
              <h1 className="lead-title">香港高盛市场研究</h1>
              <p className="lead-copy">
                立足香港，面向专业投资人、企业与家族办公室，提供公开信息研究、跨市场观察与中国资产定价线索梳理。
              </p>
              <div className="lead-actions">
                <Link className="button-link" href="/insights">
                  进入高盛内参
                </Link>
                <Link className="button-link secondary" href="#services">
                  查看服务领域
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
            <div className="panel-label">高盛内参</div>
            <h2>客户专属市场观察入口</h2>
            <p>以公开来源为基础，压缩重复转载和情绪化噪声，优先呈现可能影响中国资产定价的关键信息。</p>
            <div className="insight-bullet-grid">
              {insightBullets.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <Link className="text-link panel-link" href="/insights">
              登录后进入
            </Link>
          </section>

          <section className="side-panel compact-list">
            <div className="section-heading compact-heading">
              <div>
                <p className="brand-kicker">Notice</p>
                <h2 className="section-title">重要声明</h2>
              </div>
            </div>
            <p>
              本站以独立顾问机构口径运营，不代表 Goldman Sachs 集团或其关联实体。站内内容仅用于研究讨论。
            </p>
          </section>
        </aside>
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

      <section className="page-shell public-section" id="sources">
        <div className="section-heading">
          <div>
            <p className="brand-kicker">Source Directory</p>
            <h2 className="section-title">国内金融信息源</h2>
          </div>
          <div className="section-caption">公开官网仅提供权威来源入口；客户区按影响股市规则筛选公开标题流。</div>
        </div>
        <div className="source-link-grid">
          {domesticSourceLinks.map((source) => (
            <a className="source-link-card" href={source.href} key={source.name} rel="noopener noreferrer" target="_blank">
              <div className="source-link-meta">
                <span>{source.status}</span>
              </div>
              <h3>{source.name}</h3>
              <p>{source.note}</p>
            </a>
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
          <section>
            <h2>香港高盛市场研究</h2>
            <p>独立香港市场研究与资产配置顾问机构。</p>
          </section>
          <section>
            <h3>公司信息</h3>
            <Link href="/#about">关于我们</Link>
            <Link href="/#services">服务领域</Link>
            <Link href="/#sources">信息源</Link>
            <Link href="/#market-watch">市场观察</Link>
            <Link href="/#contact">联系我们</Link>
          </section>
          <section>
            <h3>客户入口</h3>
            <Link href="/insights">高盛内参</Link>
            <Link href="/login">客户登录</Link>
            <Link href="/signup">申请注册</Link>
            <Link href="/reports">策略库</Link>
          </section>
          <section>
            <h3>法律信息</h3>
            <p>本站内容基于公开信息整理，仅用于研究讨论，不构成任何金融产品的购买建议。</p>
            <p>本站与 Goldman Sachs 集团及其关联实体无隶属、授权或代理关系。</p>
          </section>
        </div>
        <div className="footer-bottom">© 2026 香港高盛市场研究。客户申请请通过站内注册入口提交。</div>
      </footer>
    </main>
  );
}

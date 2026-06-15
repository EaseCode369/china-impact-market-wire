import Link from "next/link";

export default function ReportsPage() {
  return (
    <main className="page-shell">
      <article className="detail-shell">
        <section className="detail-main">
          <div className="detail-meta">
            <span className="meta-chip">高盛研究</span>
            <span>客户专属</span>
            <span>暂未更新</span>
          </div>
          <h1 className="detail-title">高盛研究：板块建设中</h1>
          <p className="detail-summary">
            高盛研究将用于承载高质量研报提炼、行业框架、投资人展示材料和专题研究内容。当前板块保留入口，暂不更新具体研究文章。
          </p>

          <div className="news-list">
            <section className="news-card">
              <div className="news-card-meta">
                <span className="meta-chip">Research Pipeline</span>
                <span>后续规划</span>
              </div>
              <h2 className="news-card-title">等待成熟研报内容后逐步更新</h2>
              <p className="news-card-summary">
                后续可接入你提供的真实研报、行业材料或投资人沟通文本，再由系统提炼为结构化研究稿，重点呈现研究摘要、产业链、盈利模式、风险因素和投资观察。
              </p>
            </section>
          </div>

          <div className="detail-actions">
            <Link className="button-link" href="/">
              返回官网首页
            </Link>
            <Link className="button-link secondary" href="/briefing">
              查看高盛内参
            </Link>
          </div>
        </section>

        <aside className="sidebar-stack">
          <div className="content-panel">
            <p className="brand-kicker">Research Positioning</p>
            <h2 className="section-title">研究定位</h2>
            <p className="news-card-summary">本板块面向客户专属研究服务，不做公开资讯流，也不展示未经确认的样稿内容。</p>
          </div>
          <div className="content-panel">
            <p className="brand-kicker">Client Area</p>
            <h2 className="section-title">客户专区</h2>
            <p className="news-card-summary">你可以先通过官网首页查看公开资讯流，或进入高盛内参查看已发布的主题文章。</p>
          </div>
        </aside>
      </article>
    </main>
  );
}

const researchSections = [
  {
    title: "研究摘要",
    body: "储能行业正在从政策驱动的装机扩张，进入商业模式、系统效率和项目收益率共同决定竞争格局的新阶段。投资判断不应只看装机规模，而要看电价机制、利用小时、系统成本、运维能力和安全标准。",
  },
  {
    title: "行业驱动",
    body: "新能源发电占比提升后，电网对调峰、调频和容量支撑的需求持续上升。储能的核心价值来自解决新能源波动性、提升电力系统灵活性，并在峰谷价差和辅助服务市场中形成现金流。",
  },
  {
    title: "产业链观察",
    body: "上游关注电芯成本、循环寿命和安全性；中游关注 PCS、BMS、EMS 与系统集成能力；下游关注电站开发、运营效率和并网友好性。未来竞争会从单纯拼价格，转向系统能力和项目全生命周期收益。",
  },
  {
    title: "盈利模式",
    body: "独立储能、工商业储能和户用储能的收益结构不同。独立储能更依赖电力市场规则和容量补偿；工商业储能更依赖峰谷价差、需量管理和企业用电负荷；户储则受海外电价、补贴和渠道能力影响更大。",
  },
  {
    title: "风险因素",
    body: "主要风险包括电芯价格波动、项目利用小时不足、地方电力市场规则变化、安全事故、价格战压缩毛利，以及海外贸易政策扰动。对于投资人而言，低价中标并不等于高质量增长。",
  },
  {
    title: "投资观察",
    body: "更值得跟踪的是具备电芯议价能力、系统集成经验、海外渠道、运维数据和电力市场理解的公司。储能不是单一设备赛道，而是制造能力、电力交易和资产运营能力的复合竞争。",
  },
];

export default function ReportsPage() {
  return (
    <main className="page-shell">
      <article className="detail-shell">
        <section className="detail-main">
          <div className="detail-meta">
            <span className="meta-chip">高盛研究</span>
            <span>研报提炼</span>
            <span>储能行业</span>
          </div>
          <h1 className="detail-title">储能行业研究：从装机增长转向收益率验证</h1>
          <p className="detail-summary">
            本页为高盛研究前端样稿，用于展示后续“抓取高质量研报、读取后提炼为自有研究稿”的产品形态。真实研报内容可在后续替换。
          </p>

          <div className="news-list">
            {researchSections.map((section) => (
              <section className="news-card" key={section.title}>
                <div className="news-card-meta">
                  <span className="meta-chip">Research</span>
                  <span>{section.title}</span>
                </div>
                <h2 className="news-card-title">{section.title}</h2>
                <p className="news-card-summary">{section.body}</p>
              </section>
            ))}
          </div>
        </section>

        <aside className="sidebar-stack">
          <div className="content-panel">
            <p className="brand-kicker">Research Workflow</p>
            <h2 className="section-title">研究定位</h2>
            <p className="news-card-summary">
              高盛研究用于承载研报提炼、行业框架和投资人展示内容。当前为静态样稿，后续可接入你提供的研报文本。
            </p>
          </div>
          <div className="content-panel">
            <p className="brand-kicker">Investor View</p>
            <h2 className="section-title">投资人视角</h2>
            <p className="news-card-summary">页面重点不是复刻研报全文，而是快速呈现研究摘要、产业链、盈利模式、风险因素和投资观察。</p>
          </div>
        </aside>
      </article>
    </main>
  );
}

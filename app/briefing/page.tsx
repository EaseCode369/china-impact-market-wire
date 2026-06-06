const briefingSections = [
  {
    title: "核心结论",
    body: [
      "中国房价正在从过去的普涨周期，切换为结构性修复周期。未来一段时间，判断房地产不应再只看全国均价，而要看城市能级、库存消化、居民收入预期、地方财政约束和金融机构风险偏好。",
      "一线与强二线城市更可能先完成价格出清，部分人口流出、产业支撑弱、库存偏高的城市仍会面对较长时间的价格压力。房地产对宏观经济的影响正在从“拉动增长”转向“稳定资产负债表”。",
    ],
  },
  {
    title: "政策背景",
    body: [
      "当前政策重点不是重新制造一轮房地产高杠杆扩张，而是降低系统性风险，托住居民预期，并让库存通过时间和现金流慢慢消化。限购、首付、房贷利率和收储政策的调整，更多是为了修复成交量和改善市场信心。",
      "政策能改变短期交易条件，但很难单独扭转人口、收入和库存的长期变量。因此，房价修复会更依赖城市基本面，而不是单一政策信号。",
    ],
  },
  {
    title: "城市分化",
    body: [
      "一线城市仍具备就业、教育、医疗和资产配置的综合吸引力，但价格弹性也会受到居民杠杆约束影响。核心区域优质房产可能更早稳定，远郊和供应过剩板块仍需要时间消化。",
      "强二线城市的关键在于产业人口是否持续流入。制造业升级、科技产业集聚和公共服务能力较强的城市，房价底部更容易形成；缺乏产业支撑的城市，即使放松政策，成交恢复也可能偏弱。",
    ],
  },
  {
    title: "居民预期",
    body: [
      "居民购房决策正在从“担心买晚了更贵”转向“担心买早了承压”。这意味着价格企稳之前，成交量通常会先修复，但价格弹性不会立刻出现。",
      "如果收入预期、就业稳定性和二手房流动性没有同步改善，购房者会更重视总价、地段和现金流安全，而不是单纯追逐面积和杠杆。",
    ],
  },
  {
    title: "房企与金融影响",
    body: [
      "房企分化会继续扩大。拥有优质土储、低融资成本和较强交付能力的企业，仍有机会在行业出清后提升份额；高负债、弱城市布局和现金流承压的企业，修复会更慢。",
      "金融机构关注点将从新增按揭规模，转向抵押品质量、开发贷风险和地方化债联动。房地产稳定对银行资产质量和居民财富预期仍然重要，但其投资逻辑已经不同于上一轮周期。",
    ],
  },
  {
    title: "投资含义",
    body: [
      "房地产链条的机会不再适合简单押注全面反转，更适合沿着“政策托底、库存消化、城市分化、资产负债表修复”的顺序寻找结构性线索。",
      "更值得跟踪的方向包括：核心城市成交恢复、优质房企融资改善、物业与存量运营、建材家居需求修复、银行地产风险重估，以及地方财政压力缓和后对基建和消费的传导。",
    ],
  },
];

export default function BriefingPage() {
  return (
    <main className="page-shell">
      <article className="detail-shell">
        <section className="detail-main">
          <div className="detail-meta">
            <span className="meta-chip">高盛内参</span>
            <span>主题研究</span>
            <span>中国房价</span>
          </div>
          <h1 className="detail-title">中国房价：从普涨逻辑转向结构性修复</h1>
          <p className="detail-summary">
            本篇为客户内参样稿，目标不是复述新闻，而是把多篇公开信息背后的共同线索压缩成一篇可阅读、可讨论、可跟踪的主题判断。
          </p>

          <div className="news-list">
            {briefingSections.map((section) => (
              <section className="news-card" key={section.title}>
                <div className="news-card-meta">
                  <span className="meta-chip">Briefing</span>
                  <span>{section.title}</span>
                </div>
                <h2 className="news-card-title">{section.title}</h2>
                {section.body.map((paragraph) => (
                  <p className="news-card-summary" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </section>

        <aside className="sidebar-stack">
          <div className="content-panel">
            <p className="brand-kicker">Client Note</p>
            <h2 className="section-title">内参定位</h2>
            <p className="news-card-summary">
              高盛内参用于把多个公开来源压缩为一篇主题文章，重点呈现结论、分歧、传导路径和可跟踪指标。
            </p>
          </div>
          <div className="content-panel">
            <p className="brand-kicker">Next Topics</p>
            <h2 className="section-title">后续主题</h2>
            <p className="news-card-summary">后续可扩展到港股流动性、人民币汇率、AI 算力链、地产链修复和银行资产质量等主题。</p>
          </div>
        </aside>
      </article>
    </main>
  );
}

import Link from "next/link";

import { getInternationalSourceStatuses, getPostsBySource } from "@/lib/content";

export default function SourcesIndexPage() {
  const sources = getInternationalSourceStatuses();
  const posts = sources.flatMap((source) => getPostsBySource(source.name)).slice(0, 12);
  const availableCount = sources.filter((source) => source.hasData).length;

  return (
    <main className="page-shell">
      <section className="content-panel">
        <div className="section-heading">
          <div>
            <p className="brand-kicker">International Sources</p>
            <h1 className="section-title">国际来源聚合页</h1>
          </div>
          <div className="section-caption">
            已配置 {sources.length} 个国际来源，当前抓到 {availableCount} 个来源的数据。
          </div>
        </div>

        <div className="news-card-summary" style={{ marginBottom: 20 }}>
          这里展示的是“对中国故事、中国股票、港股、产业链和政策面有影响”的国际公开标题流。
          如果某个来源暂时没有数据，不再返回 404，而是明确展示当前抓取状态。
        </div>

        <div className="source-groups">
          {sources.map((source) => (
            <Link href={`/sources/${encodeURIComponent(source.name)}`} key={source.id} className="news-card">
              <div className="news-card-meta">
                <span className="meta-chip">{source.group === "global_media" ? "国际媒体" : "香港/区域媒体"}</span>
                <span>{source.name}</span>
                <span>{source.hasData ? "已抓到数据" : "暂未抓到数据"}</span>
              </div>
              <h2 className="news-card-title">{source.name}</h2>
              <p className="news-card-summary">
                {source.hasData
                  ? `当前共 ${source.count} 条，其中 ${source.chinaRelevantCount} 条被判定为直接影响中国股票。`
                  : "当前这个来源还没有生成可展示内容。页面会保留来源状态，便于继续排查抓取问题。"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="content-grid">
        <div className="content-panel">
          <div className="section-heading">
            <div>
              <p className="brand-kicker">Latest International Items</p>
              <h2 className="section-title">国际来源最新条目</h2>
            </div>
          </div>
          {posts.length === 0 ? (
            <div className="empty-state">当前国际来源还没有成功落库的条目。我们已经把入口改成聚合页，同时正在逐个修复抓取链路。</div>
          ) : (
            <div className="news-list">
              {posts.map((post) => (
                <Link className="news-card" key={post.id} href={`/news/${post.slug}`}>
                  <div className="news-card-meta">
                    <span className="meta-chip">{post.source_name}</span>
                    <span>{post.content_level === "headline" ? "标题流" : post.content_level === "teaser" ? "预览流" : "摘要流"}</span>
                    <span>{new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(post.published_at))}</span>
                  </div>
                  <h3 className="news-card-title">{post.title}</h3>
                  <p className="news-card-summary">{post.summary}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

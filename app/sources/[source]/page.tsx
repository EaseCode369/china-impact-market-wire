import Link from "next/link";

import { getActiveSourceStatuses, getPostsBySource } from "@/lib/content";

type SourcePageProps = {
  params: Promise<{ source: string }>;
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export async function generateStaticParams() {
  return getActiveSourceStatuses().map((source) => ({ source: encodeURIComponent(source.name) }));
}

export default async function SourcePage({ params }: SourcePageProps) {
  const { source } = await params;
  const sourceName = decodeURIComponent(source);
  const posts = getPostsBySource(sourceName);
  const status = getActiveSourceStatuses().find((item) => item.name === sourceName);

  return (
    <main className="page-shell">
      <section className="content-panel">
        <div className="section-heading">
          <div>
            <p className="brand-kicker">Source View</p>
            <h1 className="section-title">{sourceName}</h1>
          </div>
          <div className="section-caption">
            {posts.length > 0 ? `共 ${posts.length} 条，其中 ${posts.filter((post) => post.is_china_stock_relevant).length} 条直接影响中国股票。` : "当前暂无可展示条目。"}
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="empty-state">
            <p>当前这个来源还没有成功生成可展示条目，所以这里不再返回 404。</p>
            <p>
              {status
                ? `当前状态：${status.hasData ? "已有数据" : "暂未抓到数据"}。`
                : "当前状态：未找到对应来源配置。"}
            </p>
            <p>我们已经把来源入口改成聚合页，并在继续排查这个来源的抓取链路。</p>
            <div className="detail-actions">
              <Link className="button-link secondary" href="/sources">
                返回来源聚合页
              </Link>
              <Link className="button-link secondary" href="/">
                返回官网首页
              </Link>
              <Link className="button-link secondary" href="/insights">
                返回高盛资讯
              </Link>
            </div>
          </div>
        ) : (
          <div className="news-list">
            {posts.map((post) => (
              <Link className="news-card" href={`/news/${post.slug}`} key={post.id}>
                <div className="news-card-meta">
                  <span className="meta-chip">{post.category}</span>
                  <span>{post.source_group}</span>
                  <span>{post.content_level === "headline" ? "标题流" : post.content_level === "teaser" ? "预览流" : "摘要流"}</span>
                  <span>{formatDate(post.published_at)}</span>
                </div>
                <h2 className="news-card-title">{post.title}</h2>
                <p className="news-card-summary">{post.summary}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { getAllPosts, getPostBySlug, getSources } from "@/lib/content";

type NewsDetailPageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedSources = getSources().slice(0, 4);
  const levelLabel = post.content_level === "headline" ? "公开标题流" : post.content_level === "teaser" ? "公开预览流" : "站内摘要流";

  return (
    <main className="page-shell">
      <div className="detail-shell">
        <article className="detail-main">
          <div className="detail-meta">
            <span className="meta-chip">{post.source_name}</span>
            <span>{post.category}</span>
            <span>{levelLabel}</span>
            <span>{formatDate(post.published_at)}</span>
          </div>

          <h1 className="detail-title">{post.title}</h1>
          <p className="detail-summary">{post.summary}</p>

          <div className="tags-row">
            {post.tags.map((tag) => (
              <span className="tag" key={tag}>
                #{tag}
              </span>
            ))}
            {post.is_china_stock_relevant && post.relevance_reason ? (
              <span className="tag tag-strong">直接影响中国股票：{post.relevance_reason}</span>
            ) : null}
          </div>

          <div className="detail-actions">
            {post.original_url ? (
              <a className="button-link" href={post.original_url} rel="noreferrer" target="_blank">
                查看原文链接
              </a>
            ) : (
              <span className="button-link secondary">当前条目没有外部原文链接</span>
            )}
            <Link className="button-link secondary" href="/">
              返回官网首页
            </Link>
            <Link className="button-link secondary" href="/#market-feed">
              返回官网资讯流
            </Link>
          </div>
        </article>

        <aside className="sidebar-stack">
          <div className="content-panel">
            <div className="section-heading">
              <div>
                <p className="brand-kicker">About This Entry</p>
                <h2 className="section-title">条目说明</h2>
              </div>
            </div>
            <p className="news-card-summary">
              {post.content_level === "headline"
                ? "本条为公开标题流，只保留来源、标题、时间与原文链接，用来快速识别事件与后续追踪方向。"
                : post.content_level === "teaser"
                  ? "本条为公开预览流，站内保留来源公开提供的导语或 teaser，适合快速判断是否值得打开原文。"
                  : "本条为摘要流，站内保留了更完整的公开摘要信息，适合直接浏览关键信息。"}
            </p>
            <p className="news-card-summary">
              {post.is_china_stock_relevant
                ? `系统判定其与中国股票存在直接影响：${post.relevance_reason ?? "命中相关规则"}。`
                : "系统未将其判定为中国股票直接影响条目，但仍保留在全量资讯流中供参考。"}
            </p>
          </div>

          <div className="content-panel">
            <div className="section-heading">
              <div>
                <p className="brand-kicker">Explore Sources</p>
                <h2 className="section-title">继续浏览</h2>
              </div>
            </div>
            <div className="source-list">
              {relatedSources.map((source) => (
                <Link href={`/sources/${source.slug}`} key={source.name}>
                  <div className="source-name">{source.name}</div>
                  <div className="source-count">
                    {source.count} 条内容 · 相关 {source.chinaRelevantCount} 条
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

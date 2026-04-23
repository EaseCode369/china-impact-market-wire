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

  return (
    <main className="page-shell">
      <div className="detail-shell">
        <article className="detail-main">
          <div className="detail-meta">
            <span className="meta-chip">{post.source_name}</span>
            <span>{post.category}</span>
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
          </div>

          <div className="detail-actions">
            {post.original_url ? (
              <a className="button-link" href={post.original_url} rel="noreferrer" target="_blank">
                查看原文链接
              </a>
            ) : (
              <span className="button-link secondary">本地导入内容，无外部原文链接</span>
            )}
            <Link className="button-link secondary" href="/">
              返回首页
            </Link>
          </div>
        </article>

        <aside className="sidebar-stack">
          <div className="content-panel">
            <div className="section-heading">
              <div>
                <p className="brand-kicker">About</p>
                <h2 className="section-title">条目说明</h2>
              </div>
            </div>
            <p className="news-card-summary">
              {post.source_type === "local_pdf"
                ? "这条资讯来自你的本地“今日新闻”目录，通过 PDF 转图片 + OCR + 摘要提取后生成。"
                : "这条资讯来自白名单财经站点抓取，站内保存标题、摘要与原文链接，用于快速浏览和跳转。"}
            </p>
          </div>

          <div className="content-panel">
            <div className="section-heading">
              <div>
                <p className="brand-kicker">Explore</p>
                <h2 className="section-title">继续浏览</h2>
              </div>
            </div>
            <div className="source-list">
              {relatedSources.map((source) => (
                <Link href={`/sources/${source.slug}`} key={source.name}>
                  <div className="source-name">{source.name}</div>
                  <div className="source-count">{source.count} 条内容</div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

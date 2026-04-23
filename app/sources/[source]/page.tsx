import Link from "next/link";
import { notFound } from "next/navigation";

import { getAllPosts, getPostsBySource } from "@/lib/content";

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
  const names = new Set(getAllPosts().map((post) => post.source_name));
  return Array.from(names).map((source) => ({ source: encodeURIComponent(source) }));
}

export default async function SourcePage({ params }: SourcePageProps) {
  const { source } = await params;
  const sourceName = decodeURIComponent(source);
  const posts = getPostsBySource(sourceName);

  if (posts.length === 0) {
    notFound();
  }

  return (
    <main className="page-shell">
      <section className="content-panel">
        <div className="section-heading">
          <div>
            <p className="brand-kicker">Source View</p>
            <h1 className="section-title">{sourceName}</h1>
          </div>
          <div className="section-caption">共 {posts.length} 条内容，按时间倒序展示。</div>
        </div>
        <div className="news-list">
          {posts.map((post) => (
            <Link className="news-card" href={`/news/${post.slug}`} key={post.id}>
              <div className="news-card-meta">
                <span className="meta-chip">{post.category}</span>
                <span>{formatDate(post.published_at)}</span>
              </div>
              <h2 className="news-card-title">{post.title}</h2>
              <p className="news-card-summary">{post.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

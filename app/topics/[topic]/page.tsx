import Link from "next/link";
import { notFound } from "next/navigation";

import { getPostsByTopic, getTopicBySlug, getTopics } from "@/lib/content";

type TopicPageProps = {
  params: Promise<{ topic: string }>;
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function generateStaticParams() {
  return getTopics().map((topic) => ({ topic: topic.slug }));
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { topic: slug } = await params;
  const topic = getTopicBySlug(slug);

  if (!topic) {
    notFound();
  }

  const posts = getPostsByTopic(topic.slug);

  return (
    <main className="page-shell">
      <section className="content-panel">
        <div className="section-heading">
          <div>
            <p className="brand-kicker">Market Columns</p>
            <h1 className="section-title">{topic.name}</h1>
          </div>
          <div className="section-caption">
            {topic.description}。当前共 {posts.length} 条相关内容。
          </div>
        </div>

        <div className="topic-nav" aria-label="切换栏目">
          {getTopics().map((item) => (
            <Link className={`topic-nav-link${item.slug === topic.slug ? " is-active" : ""}`} href={`/topics/${item.slug}`} key={item.id}>
              {item.name}
              <span>{item.count}</span>
            </Link>
          ))}
        </div>

        <div className="detail-actions">
          <Link className="button-link secondary" href="/#market-feed">
            返回官网资讯流
          </Link>
        </div>

        <div className="news-list">
          {posts.map((post) => (
            <Link className="news-card" href={`/news/${post.slug}`} key={post.id}>
              <div className="news-card-meta">
                <span className="meta-chip">{post.source_name}</span>
                <span>{post.category}</span>
                <span>{post.content_level === "headline" ? "标题流" : post.content_level === "teaser" ? "预览流" : "摘要流"}</span>
                <span>{formatDate(post.published_at)}</span>
              </div>
              <h2 className="news-card-title">{post.title}</h2>
              <p className="news-card-summary">{post.summary}</p>
              <div className="tags-row">
                {post.tags.slice(0, 4).map((tag) => (
                  <span className="tag" key={tag}>
                    #{tag}
                  </span>
                ))}
                {post.relevance_reason ? <span className="tag tag-strong">{post.relevance_reason}</span> : null}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

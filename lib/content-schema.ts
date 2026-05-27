export type SourceType = "local_pdf" | "crawled_site";
export type SourceGroup = "global_media" | "hk_media" | "china_media" | "strategy_feed" | "local_pdf";
export type FetchMode = "rss" | "listing" | "article";
export type ContentLevel = "headline" | "teaser" | "summary";

export type NewsPost = {
  id: string;
  slug: string;
  source_type: SourceType;
  source_name: string;
  source_id: string;
  source_group: SourceGroup;
  source_priority: number;
  title: string;
  summary: string;
  original_url: string | null;
  published_at: string;
  imported_at: string;
  category: string;
  tags: string[];
  is_china_stock_relevant: boolean;
  relevance_reason: string | null;
  dedupe_key: string;
  content_level: ContentLevel;
};

export type GeneratedCollection = {
  generatedAt: string;
  count: number;
  posts: NewsPost[];
};

export type SourceSummary = {
  id: string;
  name: string;
  slug: string;
  group: SourceGroup;
  count: number;
  chinaRelevantCount: number;
};

export type SiteSummary = {
  generatedAt: string;
  total: number;
  external: number;
  chinaRelevantCount: number;
  dedupedCount: number;
  activeSources: string[];
  pausedSources: string[];
  lastSuccessfulRunAt: string;
};

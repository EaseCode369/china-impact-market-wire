export type SourceType = "local_pdf" | "crawled_site";

export type NewsPost = {
  id: string;
  slug: string;
  source_type: SourceType;
  source_name: string;
  title: string;
  summary: string;
  original_url: string | null;
  published_at: string;
  imported_at: string;
  category: string;
  tags: string[];
};

export type GeneratedCollection = {
  generatedAt: string;
  count: number;
  posts: NewsPost[];
};

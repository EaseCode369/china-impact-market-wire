import type { FetchMode, SourceGroup } from "@/lib/content-schema";

export type SourceConfig = {
  id: string;
  displayName: string;
  sourceGroup: SourceGroup;
  fetchMode: FetchMode;
  priority: number;
  isActive: boolean;
};

export const SOURCE_CONFIGS: SourceConfig[] = [
  { id: "reuters", displayName: "Reuters", sourceGroup: "global_media", fetchMode: "rss", priority: 100, isActive: true },
  { id: "bloomberg", displayName: "Bloomberg", sourceGroup: "global_media", fetchMode: "rss", priority: 95, isActive: true },
  { id: "ft", displayName: "Financial Times", sourceGroup: "global_media", fetchMode: "rss", priority: 92, isActive: true },
  { id: "wsj", displayName: "WSJ", sourceGroup: "global_media", fetchMode: "rss", priority: 90, isActive: true },
  { id: "wallstreetcn", displayName: "华尔街见闻", sourceGroup: "china_media", fetchMode: "rss", priority: 82, isActive: true },
  { id: "scmp", displayName: "SCMP", sourceGroup: "hk_media", fetchMode: "rss", priority: 80, isActive: true },
  { id: "cls", displayName: "财联社", sourceGroup: "china_media", fetchMode: "listing", priority: 72, isActive: true },
  { id: "stcn", displayName: "证券时报", sourceGroup: "china_media", fetchMode: "article", priority: 68, isActive: true },
  { id: "eastmoney", displayName: "东方财富", sourceGroup: "china_media", fetchMode: "listing", priority: 52, isActive: false },
  { id: "dzh", displayName: "大智慧", sourceGroup: "china_media", fetchMode: "article", priority: 48, isActive: false },
  { id: "wind", displayName: "Wind", sourceGroup: "strategy_feed", fetchMode: "article", priority: 0, isActive: false },
];

export function getActiveSourceConfigs(ids?: string[]) {
  return SOURCE_CONFIGS.filter((source) => source.isActive && (!ids || ids.includes(source.id)));
}

export function getPausedSourceConfigs() {
  return SOURCE_CONFIGS.filter((source) => !source.isActive);
}

export function getSourceConfigById(id: string) {
  return SOURCE_CONFIGS.find((source) => source.id === id);
}

export function getSourceConfigByDisplayName(name: string) {
  return SOURCE_CONFIGS.find((source) => source.displayName === name);
}

export function getInternationalSourceConfigs() {
  return SOURCE_CONFIGS.filter((source) => source.isActive && (source.sourceGroup === "global_media" || source.sourceGroup === "hk_media"));
}

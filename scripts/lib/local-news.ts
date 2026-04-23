import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { createWorker, PSM } from "tesseract.js";

import type { NewsPost } from "@/lib/content-schema";
import { CRAWLER_LIMIT, GENERATED_DIR, LOCAL_NEWS_DIR, OCR_CACHE_DIR, TMP_DIR } from "@/scripts/lib/constants";
import {
  createSlug,
  ensureDir,
  inferCategory,
  inferTags,
  normalizeText,
  safeDate,
  stableId,
  summarizeText,
  writeCollection,
} from "@/scripts/lib/helpers";

type Extraction = {
  title: string;
  summary: string;
  text: string;
};

export async function generateLocalNews() {
  ensureDir(GENERATED_DIR);
  ensureDir(TMP_DIR);
  ensureDir(OCR_CACHE_DIR);

  const dirEntries = fs
    .readdirSync(LOCAL_NEWS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".pdf")
    .slice(0, CRAWLER_LIMIT);

  const worker = await createWorker("chi_sim", 1, {
    cachePath: OCR_CACHE_DIR,
    logger: ({ status, progress }) => {
      if (progress === 1) {
        console.log(`[OCR] ${status}`);
      }
    },
  });

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: "1",
  });

  const posts: NewsPost[] = [];

  for (const entry of dirEntries) {
    const filePath = path.join(LOCAL_NEWS_DIR, entry.name);
    const fileStat = fs.statSync(filePath);
    const extraction = await extractPdf(worker, filePath);

    if (!extraction.summary) {
      continue;
    }

    const id = stableId(`${filePath}:${fileStat.mtimeMs}:${fileStat.size}`);
    const slug = createSlug(extraction.title, id);

    posts.push({
      id,
      slug,
      source_type: "local_pdf",
      source_name: "今日新闻",
      title: extraction.title,
      summary: extraction.summary,
      original_url: null,
      published_at: safeDate(fileStat.mtime),
      imported_at: new Date().toISOString(),
      category: inferCategory(extraction.title, extraction.summary, "今日新闻"),
      tags: inferTags(extraction.title, extraction.summary, "今日新闻"),
    });
  }

  await worker.terminate();

  posts.sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at));
  writeCollection("local-news.json", posts);
  return posts;
}

async function extractPdf(worker: Awaited<ReturnType<typeof createWorker>>, filePath: string): Promise<Extraction> {
  const pdfBaseName = path.basename(filePath, path.extname(filePath));
  const renderDir = path.join(TMP_DIR, "pdf-pages", stableId(filePath).slice(0, 12));
  ensureDir(renderDir);

  const prefix = path.join(renderDir, "page");
  const render = spawnSync("pdftoppm", ["-png", "-f", "1", "-l", "2", filePath, prefix], {
    encoding: "utf8",
  });

  if (render.status !== 0) {
    return {
      title: pdfBaseName,
      summary: buildFallbackSummary(pdfBaseName),
      text: "",
    };
  }

  const images = fs
    .readdirSync(renderDir)
    .filter((name) => name.endsWith(".png"))
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((name) => path.join(renderDir, name));

  let ocrText = "";
  for (const imagePath of images) {
    const result = await worker.recognize(imagePath, { rotateAuto: true });
    ocrText += `${result.data.text}\n`;
  }

  const normalized = normalizeText(ocrText);
  const title = pickTitle(normalized, pdfBaseName);
  const summary = pickSummary(normalized, title) || buildFallbackSummary(pdfBaseName);

  return {
    title,
    summary,
    text: normalized,
  };
}

function pickTitle(text: string, fallback: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  for (const line of lines) {
    const compact = line.replace(/\s+/g, "");
    if (compact.length < 8 || compact.length > 45) {
      continue;
    }
    if (/^\d+[:：.-]/.test(compact) || compact.includes("阅读")) {
      continue;
    }
    if ((compact.match(/[。！？]/g) ?? []).length > 1) {
      continue;
    }
    return compact;
  }

  return fallback;
}

function pickSummary(text: string, title: string) {
  const withoutTitle = text.replace(title, "").replace(/\n+/g, "\n");
  const summary = summarizeText(withoutTitle, 3, 180);
  return summary;
}

function buildFallbackSummary(title: string) {
  return `本地导入资讯聚焦“${title}”相关动态，已生成站内摘要条目，后续可继续补充更完整的正文解读。`;
}

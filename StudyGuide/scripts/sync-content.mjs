#!/usr/bin/env node
/**
 * Content pipeline.
 *
 * Reads `content.config.json`, copies every configured source into
 * `public/content/<slug>/`, then writes the two files the app consumes:
 *
 *   public/content/manifest.json  — topics, chapters, pages, parse options
 *   public/content/index.json     — flat search index (titles only)
 *
 * Adding a topic = adding an entry to `content.config.json`. No app code changes.
 * Runs automatically via the `predev` / `prebuild` npm hooks.
 *
 * Only markdown/html files are copied so build output stays small. Re-running is
 * cheap: stale output is pruned, never the folder itself (Vite's watcher loses a
 * deleted `public/` subtree).
 */

import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_FILE = path.join(APP_DIR, "content.config.json");
const OUT_DIR = path.join(APP_DIR, "public", "content");
const CONTENT_EXT = new Set([".md", ".markdown", ".html"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".github", "__pycache__", "venv", ".venv"]);
const ROOT_GROUP = "__root__";
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Output files written during this run, relative to OUT_DIR. */
const written = new Set();

const toPosix = (p) => p.split(path.sep).join("/");

/**
 * Resolve a topic `source` against the app folder.
 *
 * The app is self-contained: every source must live inside it. A path that
 * escapes the folder (e.g. `../../DSA/notes.md`, which breaks as soon as the
 * folder is moved or renamed) is rejected with an actionable message instead of
 * silently reading from somewhere outside the project.
 */
const resolveSource = (source) => {
  const resolved = path.resolve(APP_DIR, source);
  const rel = path.relative(APP_DIR, resolved);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(
      `source "${source}" resolves outside the app folder.\n` +
        `  Study Hub must be self-contained - keep notes in content/<slug>/ and ` +
        `use a relative path like "content/${path.basename(resolved)}".\n` +
        `  (resolves to ${resolved}, app folder is ${APP_DIR})`,
    );
  }
  return resolved;
};

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

/** Recursively collect markdown/html files, skipping noise directories. */
async function walk(dir) {
  const found = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => collator.compare(a.name, b.name))) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(abs)));
    else if (CONTENT_EXT.has(path.extname(entry.name).toLowerCase())) found.push(abs);
  }
  return found;
}

async function copyInto(srcFile, destFile) {
  await mkdir(path.dirname(destFile), { recursive: true });
  await copyFile(srcFile, destFile);
  written.add(toPosix(path.relative(OUT_DIR, destFile)));
  const { size } = await stat(destFile);
  return size;
}

/** Every file currently in the output dir, whatever its extension. */
async function walkAll(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walkAll(abs)));
    else found.push(abs);
  }
  return found;
}

/** Depth-first; deletes `dir` itself once it holds nothing. */
async function removeIfEmpty(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) await removeIfEmpty(path.join(dir, entry.name));
  }
  if ((await readdir(dir)).length === 0) await rm(dir, { recursive: true });
}

/**
 * Drop files that are no longer part of the manifest, then empty directories.
 * Pruning instead of deleting `public/content` keeps Vite's file watcher working
 * when the sync re-runs while `npm run dev` is up.
 */
async function pruneStale(keep) {
  for (const abs of await walkAll(OUT_DIR)) {
    if (!keep.has(toPosix(path.relative(OUT_DIR, abs)))) await rm(abs);
  }
  for (const entry of await readdir(OUT_DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) await removeIfEmpty(path.join(OUT_DIR, entry.name));
  }
}

/**
 * Fence-aware heading scan. Code fences can legally contain lines starting with
 * `#` (shell / sql comments), so track open fences while scanning.
 */
function scanHeadings(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const headings = [];
  let fence = null;
  for (const [i, line] of lines.entries()) {
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (marker === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const heading = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
    if (heading) headings.push({ level: heading[1].length, title: heading[2].trim(), line: i + 1 });
  }
  return headings;
}

/**
 * Some notes were pasted as a single ```markdown block, which would render the
 * whole page as one code block. Strip that wrapper. Tolerates a missing closing
 * fence (a truncated paste) by unwrapping whatever follows.
 */
function unwrapFenced(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let start = 0;
  while (start < lines.length && lines[start].trim() === "") start += 1;
  const open = /^\s*(`{3,}|~{3,})\s*([A-Za-z0-9+-]*)\s*$/.exec(lines[start] ?? "");
  if (!open) return { text: markdown, unwrapped: false };

  const info = open[2].toLowerCase();
  if (info !== "" && info !== "markdown" && info !== "md")
    return { text: markdown, unwrapped: false };

  let end = lines.length - 1;
  while (end > start && lines[end].trim() === "") end -= 1;
  const closeRe = new RegExp(`^\\s*${open[1][0] === "`" ? "`" : "~"}{${open[1].length},}\\s*$`);
  const closed = closeRe.test(lines[end] ?? "");
  return { text: lines.slice(start + 1, closed ? end : lines.length).join("\n"), unwrapped: true };
}

async function readMarkdown(abs) {
  const raw = await readFile(abs, "utf8");
  const { text, unwrapped } = unwrapFenced(raw);
  if (unwrapped) console.log(`      ↳ unwrapped fenced markdown: ${path.basename(abs)}`);
  // A BOM hides the first `# ` from every heading scan, so strip it up front.
  return { text: text.replace(/^\uFEFF/, ""), headings: scanHeadings(text.replace(/^\uFEFF/, "")) };
}

const stripNumberPrefix = (value) => value.replace(/^\d+[).\-–—:]?\s+/, "");

/** Tidy a heading into a nav title: drop "Section 40 — ", decorative dashes, ticks. */
function cleanTitle(value) {
  return stripNumberPrefix(
    value
      .replace(/^section\s+\d+\s*[—–:-]\s*/i, "")
      .replace(/^[—–\-*•]+\s*/, "")
      .replace(/\s*[—–\-*•]+$/, "")
      .replace(/^`+|`+$/g, "")
      .trim(),
  );
}

const ACRONYMS = new Set([
  "SQL",
  "HTML",
  "CSS",
  "API",
  "JSON",
  "JVM",
  "JPA",
  "JDBC",
  "HTTP",
  "HTTPS",
  "URL",
  "URI",
  "OS",
  "DB",
  "DDL",
  "DML",
  "DQL",
  "DCL",
  "TCL",
  "NULL",
  "ACID",
]);

function prettifyName(name) {
  const text = stripNumberPrefix(name.replace(/[-_]+/g, " ").trim());
  if (text !== text.toUpperCase()) return text;
  // SHOUTED filenames ("SQL-MASTER-CHEAT-SHEET") read better title-cased, but
  // keep real acronyms intact ("SQL Master Cheat Sheet").
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper) || word.length <= 2) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function groupTitle(dirName) {
  const clean = prettifyName(dirName);
  return /^\d/.test(dirName) ? `${dirName.slice(0, 2)} · ${clean}` : clean;
}

/**
 * Title candidates for a page, best first: the document's H1 (only when it is
 * unambiguous — near the top and the only one), then the filename. Notes in the
 * wild are inconsistent, so callers resolve the rest (many chapters reuse a
 * generic H1 like "Interview Questions").
 */
function titleCandidates(headings, relPath) {
  const h1s = headings.filter((h) => h.level === 1);
  const earlyH1 = h1s.length === 1 && h1s[0].line <= 5 ? h1s[0] : null;
  const fromName = prettifyName(path.basename(relPath, path.extname(relPath)));
  return [...(earlyH1 ? [cleanTitle(earlyH1.title)] : []), fromName].filter(Boolean);
}

/* ---------------------------------------------------------------- topic kinds */

/** Same rule the runtime parser uses to recognise a trackable section. */
const NUMBERED_HEADING = /^(\d{1,4})\s*[.)\]–—-]\s*(.*)$/;
const DEFAULT_NUMBER_MIN = 1;

/** How many numbered sections a `markdown-doc` topic will produce. */
function countUnits(headings, splitLevel) {
  let count = 0;
  for (const heading of headings) {
    if (heading.level > splitLevel) continue;
    const match = NUMBERED_HEADING.exec(heading.title);
    if (!match) continue;
    if (Number(match[1]) >= DEFAULT_NUMBER_MIN) count += 1;
  }
  return count;
}

async function buildMarkdownDoc(topic, index) {
  const src = resolveSource(topic.source);
  if (!(await exists(src))) throw new Error(`source not found: ${topic.source}`);
  const fileName = topic.fileName ?? path.basename(src);
  const destRel = `${topic.slug}/${fileName}`;
  const bytes = await copyInto(src, path.join(OUT_DIR, destRel));

  const { headings } = await readMarkdown(src);
  const splitLevel = topic.parse?.splitLevel ?? 2;
  const docTitle = headings.find((h) => h.level === 1)?.title ?? topic.title;

  // Search index: every heading the reader can land on.
  for (const heading of headings) {
    if (heading.level > splitLevel) continue;
    if (heading.title === docTitle) continue;
    index.push({ topic: topic.slug, title: heading.title });
  }

  return {
    meta: {
      slug: topic.slug,
      kind: topic.kind,
      title: topic.title,
      subtitle: topic.subtitle ?? null,
      summary: topic.summary ?? null,
      icon: topic.icon ?? null,
      units: topic.units ?? "sections",
      unitsTotal: countUnits(headings, splitLevel) || null,
      docTitle,
      file: destRel,
      parse: topic.parse ?? null,
    },
    files: 1,
    bytes,
  };
}

async function buildHtmlDoc(topic) {
  const src = resolveSource(topic.source);
  if (!(await exists(src))) throw new Error(`source not found: ${topic.source}`);
  const fileName = topic.fileName ?? path.basename(src);
  const destRel = `${topic.slug}/${fileName}`;
  const bytes = await copyInto(src, path.join(OUT_DIR, destRel));
  const raw = await readFile(src, "utf8");
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(raw);

  return {
    meta: {
      slug: topic.slug,
      kind: topic.kind,
      title: topic.title,
      subtitle: topic.subtitle ?? null,
      summary: topic.summary ?? null,
      icon: topic.icon ?? null,
      units: topic.units ?? "documents",
      docTitle: titleMatch ? titleMatch[1].trim() : topic.title,
      file: destRel,
    },
    files: 1,
    bytes,
  };
}

async function buildMarkdownBook(topic, rootGroupTitle, index) {
  const srcDir = resolveSource(topic.source);
  if (!(await exists(srcDir))) throw new Error(`source not found: ${topic.source}`);
  const files = await walk(srcDir);
  const groups = new Map();

  let bytes = 0;
  for (const abs of files) {
    const relPosix = toPosix(path.relative(srcDir, abs));
    const destRel = `${topic.slug}/${relPosix}`;
    bytes += await copyInto(abs, path.join(OUT_DIR, destRel));

    const segments = relPosix.split("/");
    const groupId = segments.length > 1 ? segments[0] : ROOT_GROUP;
    if (!groups.has(groupId)) groups.set(groupId, { id: groupId, pages: [] });

    const pageId = relPosix.replace(/\.[^.]+$/, "");
    const { headings } = await readMarkdown(abs);
    const candidates = titleCandidates(headings, relPosix);

    groups.get(groupId).pages.push({ id: pageId, candidates, file: destRel });
  }

  const groupOf = (page) => [...groups.values()].find((group) => group.pages.includes(page));
  const shortGroup = (page) => {
    const group = groupOf(page);
    return group.id === ROOT_GROUP ? rootGroupTitle : prettifyName(group.id);
  };

  // Several chapters reuse a generic H1 ("Interview Questions"), so prefer a
  // candidate no other page claims, then de-duplicate with a chapter prefix.
  const pages = [...groups.values()].flatMap((group) => group.pages);
  const claimCount = (title) => pages.filter((page) => page.candidates[0] === title).length;
  const assigned = new Map();
  for (const page of pages) {
    const base =
      page.candidates.find((candidate) => claimCount(candidate) === 0) ?? page.candidates[0];
    const taken = assigned.get(base) ?? 0;
    page.title = taken === 0 ? base : `${shortGroup(page)} · ${base}`;
    assigned.set(base, taken + 1);
    index.push({ topic: topic.slug, title: page.title, page: page.id });
  }

  const chapters = [...groups.values()]
    .map((group) => ({
      id: group.id,
      title: group.id === ROOT_GROUP ? rootGroupTitle : groupTitle(group.id),
      pages: group.pages.sort((a, b) => collator.compare(a.file, b.file)),
    }))
    .sort((a, b) => collator.compare(a.title, b.title));

  return {
    meta: {
      slug: topic.slug,
      kind: topic.kind,
      title: topic.title,
      subtitle: topic.subtitle ?? null,
      summary: topic.summary ?? null,
      icon: topic.icon ?? null,
      units: topic.units ?? "pages",
      chapters,
    },
    files: files.length,
    bytes,
  };
}

/* ----------------------------------------------------------------------- main */

async function main() {
  const config = JSON.parse(await readFile(CONFIG_FILE, "utf8"));
  const rootGroupTitle = config.rootGroupTitle ?? "Reference";
  const topics = [];
  const slugs = new Set();
  const index = [];
  let totalFiles = 0;
  let totalBytes = 0;

  // Create the folder but never delete it: Vite's watcher loses a removed
  // public/ subtree, which would 404 the content until the server restarts.
  await mkdir(OUT_DIR, { recursive: true });

  for (const topic of config.topics ?? []) {
    if (!topic.slug || !topic.kind || !topic.source) {
      throw new Error(`topic needs "slug", "kind" and "source": ${JSON.stringify(topic)}`);
    }
    if (slugs.has(topic.slug)) throw new Error(`duplicate topic slug: ${topic.slug}`);
    slugs.add(topic.slug);

    let built;
    if (topic.kind === "markdown-doc") built = await buildMarkdownDoc(topic, index);
    else if (topic.kind === "markdown-book")
      built = await buildMarkdownBook(topic, rootGroupTitle, index);
    else if (topic.kind === "html-doc") built = await buildHtmlDoc(topic);
    else throw new Error(`unknown kind "${topic.kind}" for topic ${topic.slug}`);

    topics.push(built.meta);
    totalFiles += built.files;
    totalBytes += built.bytes;

    const nav =
      built.meta.kind === "markdown-book"
        ? `${built.meta.chapters.length} chapters / ${built.meta.chapters.reduce((n, c) => n + c.pages.length, 0)} ${built.meta.units}`
        : built.meta.kind === "markdown-doc"
          ? "split at runtime"
          : "standalone";
    console.log(
      `  ${built.meta.slug.padEnd(15)} ${built.meta.kind.padEnd(14)} ` +
        `${String(built.files).padStart(4)} files  ${(built.bytes / 1024).toFixed(0).padStart(5)} KB  ${nav}`,
    );
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    defaultTopic: config.defaultTopic ?? topics[0]?.slug ?? null,
    topics,
  };

  await writeFile(path.join(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(
    path.join(OUT_DIR, "index.json"),
    `${JSON.stringify({ generatedAt: manifest.generatedAt, entries: index }, null, 2)}\n`,
  );
  written.add("manifest.json");
  written.add("index.json");
  await pruneStale(written);

  console.log(
    `\n  ${topics.length} topics · ${totalFiles} files · ${(totalBytes / 1024).toFixed(0)} KB · ` +
      `${index.length} search entries\n  → public/content/manifest.json + public/content/index.json\n`,
  );
}

main().catch((error) => {
  console.error(`\nsync-content failed: ${error.message}\n`);
  process.exitCode = 1;
});

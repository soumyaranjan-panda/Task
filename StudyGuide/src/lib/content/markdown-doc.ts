import type { DocParseOptions } from "./manifest";

/**
 * Generic markdown-document parser.
 *
 * A `markdown-doc` topic is one big file that gets cut into navigable sections:
 * everything before the first heading is the intro, then each heading up to
 * `splitLevel` starts a section. Numbered headings ("## 12. Detect a Cycle")
 * become trackable units with stable ids (`p-12`), part headings ("# PART B — …"
 * or "# Part 2: …") group them, and `partRanges` can override the label.
 *
 * Heading scanning is fence-aware: `# comment` lines inside code blocks are
 * never mistaken for headings.
 */

export type SectionKind = "intro" | "part" | "problem" | "section";

export type DocSection = {
  id: string;
  level: number;
  title: string;
  number: number | null;
  part: string;
  kind: SectionKind;
  markdown: string;
  searchable: string;
};

export type ParsedDoc = {
  title: string;
  intro: DocSection;
  sections: DocSection[];
};

const DEFAULTS = {
  splitLevel: 2,
  introTitle: "How to read this",
  introId: "intro",
  idPrefix: "p",
  numberMin: 1,
  numberMax: null as number | null,
  defaultPart: "Start",
};

const PART_HEADING = /^(?:PART|Part)\s+([A-Z]|\d{1,3})\b\s*(?:[—–:.-]+\s*)?(.*)$/;
const SUMMARY_HEADING = /^(?:final\s+)?summary\b/i;
const NUMBERED_HEADING = /^(\d{1,4})\s*[.)\]–—-]\s*(.*)$/;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function uniqueSlug(base: string, used: Set<string>): string {
  const slug = slugify(base) || "section";
  if (!used.has(slug)) {
    used.add(slug);
    return slug;
  }
  for (let n = 2; ; n += 1) {
    const candidate = `${slug}-${n}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
}

/** Split lines at headings of level <= splitLevel, ignoring fenced code. */
function scanHeadings(
  lines: string[],
  splitLevel: number,
): { index: number; level: number; title: string }[] {
  const headingRe = new RegExp(`^(#{1,${splitLevel}})\\s+(.*?)\\s*$`);
  const found: { index: number; level: number; title: string }[] = [];
  let fence: string | null = null;

  for (const [index, line] of lines.entries()) {
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1]![0]!;
      if (fence === null) fence = marker;
      else if (marker === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const heading = headingRe.exec(line);
    if (heading) found.push({ index, level: heading[1]!.length, title: heading[2]!.trim() });
  }
  return found;
}

function partForNumber(number: number, ranges: DocParseOptions["partRanges"], fallback: string) {
  for (const range of ranges ?? []) {
    if (number <= range.max) return range.name;
  }
  return fallback;
}

export function parseMarkdownDoc(raw: string, options?: DocParseOptions | null): ParsedDoc {
  const opt = { ...DEFAULTS, ...(options ?? {}) };
  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/^\uFEFF/, "")
    .split("\n");
  const headings = scanHeadings(lines, opt.splitLevel);

  const titleHeading = headings.find((h) => h.level === 1);
  const firstLine = (lines[0] ?? "").replace(/^#+\s*/, "").trim();
  const title = titleHeading?.title ?? (firstLine || "Notes");

  // Everything up to the first content heading is the intro; the document's own
  // H1 is the title, not a section.
  const firstIndex = titleHeading?.index === 0 ? 1 : 0;
  const introStart = titleHeading?.index === 0 ? 1 : 0;
  const introEnd = headings[firstIndex]?.index ?? lines.length;
  const introBody = lines.slice(introStart, introEnd).join("\n").trim();

  const intro: DocSection = {
    id: opt.introId,
    level: 1,
    title: opt.introTitle,
    number: null,
    part: opt.defaultPart,
    kind: "intro",
    markdown: introBody ? `# ${title}\n\n${introBody}` : `# ${title}`,
    searchable: `${opt.introTitle}\n${title}`.toLowerCase(),
  };

  const usedIds = new Set<string>([opt.introId]);
  const sections: DocSection[] = [];
  let activePart = opt.defaultPart;

  for (let i = firstIndex; i < headings.length; i += 1) {
    const start = headings[i]!;
    const end = headings[i + 1]?.index ?? lines.length;
    const heading = start.title;
    if (heading === title) continue;

    const partMatch = PART_HEADING.exec(heading);
    const summary = SUMMARY_HEADING.test(heading);
    const numbered = NUMBERED_HEADING.exec(heading);
    const number = numbered ? Number(numbered[1]) : null;

    let kind: SectionKind;
    if (partMatch) {
      activePart = partForPartHeading(partMatch[0]);
      kind = "part";
    } else if (
      number !== null &&
      number >= opt.numberMin &&
      (opt.numberMax === null || number <= opt.numberMax)
    ) {
      kind = "problem";
    } else {
      kind = "section";
    }
    if (summary) activePart = "Summary";

    const part = number !== null ? partForNumber(number, opt.partRanges, activePart) : activePart;

    let id: string;
    if (number !== null) {
      id = `${opt.idPrefix}-${number}`;
      if (usedIds.has(id)) id = uniqueSlug(heading, usedIds);
      else usedIds.add(id);
    } else {
      id = uniqueSlug(heading, usedIds);
    }

    sections.push({
      id,
      level: start.level,
      title: heading,
      number,
      part,
      kind,
      markdown: lines.slice(start.index, end).join("\n").trim(),
      searchable: `${heading}\n${part}`.toLowerCase(),
    });
  }

  return { title, intro, sections };
}

/** "PART A — Traversal" -> "PART A · Traversal", "Part 2: Rotation" -> "Part 2 · Rotation". */
function partForPartHeading(heading: string): string {
  const match = PART_HEADING.exec(heading);
  if (!match) return heading;
  const keyword = heading.slice(0, 4).trim();
  const detail = match[2]!.trim();
  return detail ? `${keyword} ${match[1]} · ${detail}` : `${keyword} ${match[1]}`;
}

/** Ids in reading order, skipping part headers (they are group labels only). */
export function readableIds(doc: ParsedDoc): string[] {
  return [doc.intro.id, ...doc.sections.filter((s) => s.kind !== "part").map((s) => s.id)];
}

/** Sections that count as trackable units, used for the progress denominator. */
export function unitSections(doc: ParsedDoc): DocSection[] {
  return doc.sections.filter((section) => section.kind === "problem");
}

/** Ids matching a query; with an empty query every id is returned. */
export function matchIds(items: { id: string; searchable: string }[], query: string): Set<string> {
  const q = query.trim().toLowerCase();
  if (!q) return new Set(items.map((item) => item.id));
  const hit = new Set<string>();
  for (const item of items) {
    if (item.searchable.toLowerCase().includes(q)) hit.add(item.id);
  }
  return hit;
}

/**
 * Find the best item for a jump query. Exact substrings win; otherwise every
 * word of the query must appear, so punctuation differences between a search
 * hit and the stored heading do not break the jump.
 */
export function findJumpTarget<T extends { searchable: string }>(
  items: T[],
  query: string,
): T | null {
  const q = query.trim().toLowerCase();
  if (!q || items.length === 0) return null;

  const exact = items.find((item) => item.searchable.toLowerCase().includes(q));
  if (exact) return exact;

  const words = q.split(/\s+/).filter((word) => word.length > 1);
  if (words.length === 0) return null;
  return (
    items.find((item) => {
      const haystack = item.searchable.toLowerCase();
      return words.every((word) => haystack.includes(word));
    }) ?? null
  );
}

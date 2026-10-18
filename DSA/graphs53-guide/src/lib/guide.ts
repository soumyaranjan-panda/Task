export type GuideSection = {
  id: string;
  level: 1 | 2;
  number: number | null;
  title: string;
  part: string;
  markdown: string;
  searchable: string;
};

export type ParsedGuide = {
  title: string;
  intro: GuideSection;
  sections: GuideSection[];
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function partForNumber(n: number): string {
  if (n <= 0) return "Foundation";
  if (n <= 6) return "A · Traversal";
  if (n <= 20) return "B · BFS / DFS";
  if (n <= 27) return "C · Topo";
  if (n <= 40) return "D · Shortest Path";
  if (n <= 50) return "E · MST / DSU";
  if (n <= 53) return "F · Tarjan / SCC";
  return "Summary";
}

function isSectionHeading(line: string): boolean {
  return (/^# /.test(line) || /^## /.test(line)) && !/^###/.test(line);
}

export function parseGuide(raw: string): ParsedGuide {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const title =
    (lines[0] ?? "").replace(/^#\s+/, "").trim() ||
    "Graphs — 53 Problems Study Guide (Java)";

  const headingAt: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (isSectionHeading(lines[i] ?? "")) headingAt.push(i);
  }

  const introMd = lines.slice(1, headingAt[0] ?? lines.length).join("\n").trim();
  const intro: GuideSection = {
    id: "intro",
    level: 1,
    number: null,
    title: "How to read this",
    part: "Start",
    markdown: `# ${title}\n\n${introMd}`,
    searchable: `how to read this\n${title}`.toLowerCase(),
  };

  let activePart = "Foundation";
  const sections: GuideSection[] = [];

  for (let h = 0; h < headingAt.length; h++) {
    const start = headingAt[h]!;
    const end = headingAt[h + 1] ?? lines.length;
    const headingLine = lines[start] ?? "";
    const level: 1 | 2 = headingLine.startsWith("## ") ? 2 : 1;
    const heading = headingLine.replace(/^##?\s+/, "").trim();
    if (heading.startsWith("Graphs —")) continue;

    const numMatch = heading.match(/^(\d+)\.\s+(.*)$/);
    const number = numMatch ? Number(numMatch[1]) : null;
    if (level === 1) {
      if (heading.startsWith("PART ")) {
        activePart = heading.replace(/^PART\s+/, "").replace(/\s+—.*$/, "");
      } else if (heading.startsWith("Final Summary")) {
        activePart = "Summary";
      }
    }

    const part = number !== null ? partForNumber(number) : activePart;
    const id = number !== null ? `p-${number}` : slugify(heading) || `s-${start}`;
    const markdown = lines.slice(start, end).join("\n").trim();
    sections.push({
      id,
      level,
      number,
      title: heading,
      part,
      markdown,
      searchable: heading.toLowerCase(),
    });
  }

  return { title, intro, sections };
}

export function filterSections(sections: GuideSection[], query: string): Set<string> {
  const q = query.trim().toLowerCase();
  if (!q) return new Set(sections.map((s) => s.id));
  const hit = new Set<string>();
  for (const s of sections) {
    if (s.searchable.includes(q)) hit.add(s.id);
  }
  return hit;
}

export function escapeHtml(s: string): string {
  const amp = "\u0026";
  const lt = "\u003c";
  const gt = "\u003e";
  const dq = "\u0022";
  return s
    .split(amp)
    .join(amp + "amp;")
    .split(lt)
    .join(amp + "lt;")
    .split(gt)
    .join(amp + "gt;")
    .split(dq)
    .join(amp + "quot;");
}

const JAVA_KEYWORDS = new Set([
  "abstract",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extends",
  "final",
  "finally",
  "float",
  "for",
  "if",
  "implements",
  "import",
  "instanceof",
  "int",
  "interface",
  "long",
  "new",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "throws",
  "try",
  "void",
  "while",
  "true",
  "false",
  "null",
  "var",
  "record",
]);

const JAVA_TYPES = new Set([
  "String",
  "Integer",
  "List",
  "ArrayList",
  "ArrayDeque",
  "PriorityQueue",
  "TreeSet",
  "HashSet",
  "HashMap",
  "Map",
  "Set",
  "Arrays",
  "Math",
  "Comparator",
  "Objects",
  "StringBuilder",
  "Optional",
  "DisjointSet",
]);

export function highlightFence(code: string, lang: string | undefined): string {
  if (lang !== "java") return escapeHtml(code);
  return highlightJava(code);
}

function highlightJava(src: string): string {
  const out: string[] = [];
  let i = 0;
  const n = src.length;

  const flushIdent = (start: number, end: number) => {
    const ident = src.slice(start, end);
    const esc = escapeHtml(ident);
    if (JAVA_KEYWORDS.has(ident)) out.push(`<span class="kw">${esc}</span>`);
    else if (JAVA_TYPES.has(ident)) out.push(`<span class="typ">${esc}</span>`);
    else out.push(esc);
  };

  while (i < n) {
    const ch = src[i]!;
    const next = src[i + 1];

    if (ch === "/" && next === "/") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      out.push(`<span class="cmt">${escapeHtml(src.slice(i, stop))}</span>`);
      i = stop;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      out.push(`<span class="cmt">${escapeHtml(src.slice(i, stop))}</span>`);
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      out.push(`<span class="str">${escapeHtml(src.slice(i, j))}</span>`);
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(src[j]!)) j += 1;
      flushIdent(i, j);
      i = j;
      continue;
    }
    out.push(escapeHtml(ch));
    i += 1;
  }
  return out.join("");
}

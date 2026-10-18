import { marked, type MarkedExtension, type Tokens } from "marked";
import { escapeHtml, highlightFence } from "./content/highlight";

/**
 * marked is configured once, module-wide. Heading ids are de-duplicated with a
 * per-render counter so repeated headings ("Notes") keep working anchors.
 */
let usedIds = new Set<string>();

/**
 * Optional per-render hook that rewrites a markdown link target into an in-app
 * route (e.g. a sibling `.md` file -> `/topic/<slug>?p=<page>`). Set by
 * `renderMarkdown`; when it returns null the link is rendered untouched.
 */
export type LinkResolver = (
  href: string,
) => { href: string; external?: boolean } | null;

let resolveLink: LinkResolver | null = null;

/**
 * GitHub-compatible heading slug, so hand-written in-document tables of
 * contents (`[Parts of Speech](#2-parts-of-speech)`) actually land on the
 * heading. Punctuation is dropped (an `&` or `—` leaves two spaces -> `--`),
 * matching the anchors authors paste from GitHub.
 */
function uniqueHeadingId(base: string): string {
  const slug =
    base
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, "")
      .trim()
      .replace(/\s/g, "-")
      .slice(0, 80) || "section";
  if (!usedIds.has(slug)) {
    usedIds.add(slug);
    return slug;
  }
  for (let n = 1; ; n += 1) {
    const candidate = `${slug}-${n}`;
    if (!usedIds.has(candidate)) {
      usedIds.add(candidate);
      return candidate;
    }
  }
}

const SAY_SPEAKER_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>' +
  '<path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

/**
 * Inline pronunciation token: `{{say:word}}`, `{{say:word~/ipa/}}`, or
 * `{{say:word~/ipa/~/audio/file.mp3}}`.
 * Renders a small speaker button; the reader plays `data-audio` when present,
 * otherwise speaks `data-say` via the Web Speech API. The optional IPA becomes
 * a tooltip. The separator is `~` (not `|`) because `|` splits table columns.
 */
const sayExtension: MarkedExtension = {
  extensions: [
    {
      name: "say",
      level: "inline",
      start(src) {
        const index = src.indexOf("{{say:");
        return index === -1 ? undefined : index;
      },
      tokenizer(src) {
        const match = /^\{\{say:([^~}|]+?)(?:~([^~}]*))?(?:~([^}]*))?\}\}/.exec(src);
        if (!match) return undefined;
        return {
          type: "say",
          raw: match[0],
          text: match[1]!.trim(),
          ipa: (match[2] ?? "").trim(),
          audio: (match[3] ?? "").trim(),
        };
      },
      renderer(token) {
        const { text, ipa, audio } = token as unknown as {
          text: string;
          ipa: string;
          audio: string;
        };
        const word = escapeHtml(text);
        const title = ipa ? ` title="${escapeHtml(ipa)}"` : "";
        const src = audio ? ` data-audio="${escapeHtml(audio)}"` : "";
        return (
          `<button type="button" class="say" data-say="${word}" ` +
          `aria-label="Play pronunciation of ${word}"${title}${src}>${SAY_SPEAKER_ICON}</button>`
        );
      },
    },
  ],
};

/** Block `javascript:` and friends; everything else is passed through escaped. */
function safeHref(href: string | null | undefined): string {
  const value = (href ?? "").trim();
  if (/^(javascript|vbscript|data):/i.test(value)) return "#";
  return escapeHtml(value);
}

type RendererContext = {
  parser: { parseInline: (tokens: Tokens.Generic[]) => string };
};

const renderer = {
  code({ text, lang }: Tokens.Code) {
    const langSafe = (lang ?? "text").replace(/[^a-z0-9+#-]/gi, "");

    // Mermaid fences become placeholders the client renders into SVG. The
    // source is kept both as text (for mermaid to read) and in `data-src` (so a
    // theme switch can restore and re-render without re-fetching the markdown).
    if (langSafe.toLowerCase() === "mermaid") {
      const source = escapeHtml(text);
      return (
        `<figure class="diagram">` +
        `<div class="mermaid" data-src="${source}">${source}</div>` +
        `</figure>`
      );
    }

    const body = highlightFence(text, langSafe);
    const label = langSafe
      ? `<span class="code-lang">${escapeHtml(langSafe)}</span>`
      : `<span class="code-lang">text</span>`;
    return (
      `<div class="code-block" data-lang="${langSafe}">` +
      `<div class="code-head">${label}` +
      `<button type="button" class="code-copy" data-code-copy aria-label="Copy code to clipboard">Copy</button>` +
      `</div>` +
      `<pre><code>${body}</code></pre>` +
      `</div>`
    );
  },
  heading(this: RendererContext, token: Tokens.Heading) {
    const html = this.parser.parseInline(token.tokens);
    const plain = token.tokens.map((t) => ("raw" in t ? t.raw : "")).join("");
    const id = uniqueHeadingId(plain);
    return `<h${token.depth} id="${id}"><a class="hash" href="#${id}" aria-hidden="true">#</a>${html}</h${token.depth}>\n`;
  },
  link(this: RendererContext, token: Tokens.Link) {
    const html = this.parser.parseInline(token.tokens);
    const resolved = resolveLink?.(token.href ?? "") ?? null;
    const target = resolved?.href ?? token.href;
    const href = safeHref(target);
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";
    const external = resolved?.external ?? /^https?:\/\//i.test(token.href ?? "");
    const rel = external ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${href}"${title}${rel}>${html}</a>`;
  },
  table(this: RendererContext, token: Tokens.Table) {
    const cell = (tag: "th" | "td", token: Tokens.TableCell, align?: string | null) => {
      const style = align ? ` style="text-align:${align}"` : "";
      return `<${tag}${style}>${this.parser.parseInline(token.tokens)}</${tag}>`;
    };
    const head = token.header
      .map((cellToken) => cell("th", cellToken, cellToken.align))
      .join("");
    const rows = token.rows
      .map(
        (row) =>
          `<tr>${row.map((cellToken) => cell("td", cellToken, cellToken.align)).join("")}</tr>`,
      )
      .join("");
    return (
      `<div class="table-wrap"><table><thead><tr>${head}</tr></thead>` +
      `<tbody>${rows}</tbody></table></div>`
    );
  },
};

marked.use({ ...sayExtension, renderer, gfm: true, breaks: false });

export function renderMarkdown(md: string, linkResolver?: LinkResolver | null): string {
  usedIds = new Set<string>();
  resolveLink = linkResolver ?? null;
  try {
    return marked.parse(md, { async: false }) as string;
  } finally {
    resolveLink = null;
  }
}

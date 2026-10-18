import type { Theme } from "./progress";

/**
 * Client-side Mermaid renderer for ` ```mermaid ` fences.
 *
 * `renderMarkdown` emits `<div class="mermaid" data-src="…">` placeholders; this
 * module lazily loads mermaid (kept out of the main bundle), renders each
 * placeholder to SVG, and can re-render in place when the light/dark theme
 * flips. The original source lives in `data-src`, so a re-render restores it
 * before running mermaid again.
 */

type MermaidApi = typeof import("mermaid")["default"];

let loader: Promise<MermaidApi> | null = null;

async function getMermaid(theme: Theme): Promise<MermaidApi> {
  if (!loader) loader = import("mermaid").then((mod) => mod.default);
  const mermaid = await loader;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: theme === "dark" ? "dark" : "neutral",
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif",
    themeVariables: { background: "transparent" },
  });
  return mermaid;
}

/**
 * Render every `.mermaid` placeholder under `root`. Safe to call repeatedly:
 * already-rendered nodes are reset from `data-src` first, so a theme change
 * simply re-runs the same source with the new palette.
 */
export async function renderMermaid(root: HTMLElement, theme: Theme): Promise<void> {
  if (typeof window === "undefined") return;
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(".mermaid"));
  if (!nodes.length) return;

  const mermaid = await getMermaid(theme);

  for (const el of nodes) {
    const source = el.getAttribute("data-src");
    if (source != null) el.innerHTML = source;
    el.removeAttribute("data-processed");
  }

  try {
    await mermaid.run({ nodes, suppressErrors: true });
  } catch {
    /* fall through to the source fallback below */
  }

  for (const el of nodes) {
    if (!el.querySelector("svg")) {
      const source = el.getAttribute("data-src") ?? "";
      el.innerHTML = `<pre class="diagram-source">${source}</pre>`;
    }
  }
}

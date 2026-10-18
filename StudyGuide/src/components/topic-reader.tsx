import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Download, List, ListTree, X } from "lucide-react";
import { contentUrl, topicPages, unitNoun, type TopicMeta } from "@/lib/content/manifest";
import { useTopicNav, type TopicSearch } from "@/lib/topic-nav";
import { renderMarkdown, type LinkResolver } from "@/lib/render-markdown";
import { renderMermaid } from "@/lib/mermaid";
import { NavSidebar } from "./nav-sidebar";
import { SolutionEditor } from "./solution-editor";
import { TableOfContents } from "./table-of-contents";
import { scrollToHeading, useArticleToc } from "@/lib/use-article-toc";
import { playAudioFile, speak, stopSpeaking } from "@/lib/speech";

/** posix-style path normaliser for resolving a book's relative `.md` links. */
function normalizePath(input: string): string {
  const out: string[] = [];
  for (const segment of input.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") out.pop();
    else out.push(segment);
  }
  return out.join("/");
}

/**
 * Source notes are hand-written, so chapter folder names drift (`3-Joins` vs
 * the manifest's `03-Joins`). Compare path segments loosely: case-insensitively,
 * and treating a leading number with/without zero padding as equal.
 */
function looseSegment(a: string, b: string): boolean {
  if (a.toLowerCase() === b.toLowerCase()) return true;
  const am = /^(\d+)(.*)$/.exec(a);
  const bm = /^(\d+)(.*)$/.exec(b);
  if (am && bm) return Number(am[1]) === Number(bm[1]) && am[2].toLowerCase() === bm[2].toLowerCase();
  return false;
}

/** Clipboard write with a graceful fallback for insecure contexts. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Reading layout for a topic: grouped sidebar + article + on-page contents.
 * The three content kinds differ only in what the article pane shows — rendered
 * markdown, a loading/error state, or the original HTML page in a sandboxed frame.
 */
export function TopicReader({ topic, search }: { topic: TopicMeta; search: TopicSearch }) {
  const nav = useTopicNav(topic, search);
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Leave browser/app shortcuts alone: Cmd+K opens global search, and
      // ⌘J / ⌘K must not also walk the guide.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (event.key === "/" && !typing) {
        event.preventDefault();
        nav.searchRef.current?.focus();
        return;
      }
      if (event.key === "Escape") {
        setNavOpen(false);
        setTocOpen(false);
        (event.target as HTMLElement | null)?.blur?.();
        return;
      }
      if (typing) return;
      if (event.key === "j" || event.key === "ArrowRight") nav.step(1);
      if (event.key === "k" || event.key === "ArrowLeft") nav.step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);

  // Resolve a book's relative `.md` cross-links (e.g. `../02-Ch/03-Page.md`)
  // into in-app routes so "See also" sections actually navigate.
  const pageId = nav.activePage?.id ?? null;
  const bookPages = useMemo(() => (nav.isBook ? topicPages(topic) : []), [nav.isBook, topic]);
  const linkResolver = useMemo<LinkResolver | null>(() => {
    if (!nav.isBook || !pageId) return null;
    const known = bookPages.map((page) => page.id.split("/"));
    const exact = new Set(bookPages.map((page) => page.id));
    const lookup = (target: string): string | null => {
      if (exact.has(target)) return target;
      const segments = target.split("/");
      for (const candidate of known) {
        if (
          candidate.length === segments.length &&
          candidate.every((segment, i) => looseSegment(segment, segments[i]!))
        ) {
          return candidate.join("/");
        }
      }
      return null;
    };
    const dir = pageId.includes("/") ? pageId.slice(0, pageId.lastIndexOf("/")) : "";
    return (href) => {
      if (!href || /^(https?:|mailto:|tel:|data:|#|\/)/i.test(href)) return null;
      const [rawPath, rawHash = ""] = href.split("#");
      if (!rawPath || !/\.(md|markdown)$/i.test(rawPath)) return null;
      const strip = (value: string) => value.replace(/\.(md|markdown)$/i, "");
      const targetId =
        lookup(strip(normalizePath(dir ? `${dir}/${rawPath}` : rawPath))) ??
        lookup(strip(normalizePath(rawPath)));
      if (!targetId) return null;
      const hash = rawHash ? `#${rawHash}` : "";
      return {
        href: `/topic/${topic.slug}?p=${encodeURIComponent(targetId)}${hash}`,
        external: false,
      };
    };
  }, [nav.isBook, pageId, bookPages, topic.slug]);

  const html = useMemo(
    () =>
      nav.loading || nav.isHtml || nav.error ? "" : renderMarkdown(nav.markdown, linkResolver),
    [nav.loading, nav.isHtml, nav.error, nav.markdown, linkResolver],
  );

  // Copy buttons and in-app link clicks inside the article body.
  useEffect(() => {
    const el = nav.articleRef.current;
    if (!el) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const copyButton = target.closest<HTMLButtonElement>("[data-code-copy]");
      if (copyButton) {
        event.preventDefault();
        const code = copyButton.closest(".code-block")?.querySelector("code");
        if (!code) return;
        void copyText(code.textContent ?? "").then((ok) => {
          if (!ok) return;
          copyButton.dataset.copied = "true";
          copyButton.textContent = "Copied";
          window.setTimeout(() => {
            copyButton.dataset.copied = "false";
            copyButton.textContent = "Copy";
          }, 1600);
        });
        return;
      }

      const sayButton = target.closest<HTMLButtonElement>("[data-say]");
      if (sayButton) {
        event.preventDefault();
        if (sayButton.dataset.state === "unavailable") return;
        const word = sayButton.dataset.say ?? "";
        const audio = sayButton.dataset.audio;
        const lang = sayButton.dataset.lang || undefined;
        const clear = () => delete sayButton.dataset.speaking;
        const fail = () => {
          delete sayButton.dataset.speaking;
          sayButton.dataset.state = "unavailable";
          sayButton.title = "Audio isn't available on this device or browser.";
        };

        let started: boolean;
        if (audio) {
          // Prefer a real recording; fall back to speech synthesis if it fails.
          started = playAudioFile(audio, {
            onEnd: clear,
            onError: () => {
              if (!speak(word, lang ? { lang } : undefined, clear)) fail();
            },
          });
        } else {
          started = speak(word, lang ? { lang } : undefined, clear);
        }

        if (!started) {
          fail();
          return;
        }
        sayButton.dataset.speaking = "true";
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("/topic/")) return;
      event.preventDefault();
      const url = new URL(href, window.location.origin);
      const slug = url.pathname.split("/").filter(Boolean)[1] ?? "";
      const p = url.searchParams.get("p") ?? undefined;
      navigate({
        to: "/topic/$topicSlug",
        params: { topicSlug: slug },
        search: p ? { p } : {},
        hash: url.hash ? url.hash.slice(1) : undefined,
      });
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [navigate, nav.articleRef]);

  // Stop any pronunciation audio when the reader moves to another section.
  useEffect(() => {
    return () => stopSpeaking();
  }, [nav.activeId]);

  // Render Mermaid diagrams after the article HTML lands, and re-render them
  // when the light/dark theme flips (the toggle only mutates a class).
  useEffect(() => {
    const el = nav.articleRef.current;
    if (!el || !html) return;
    let cancelled = false;
    const currentTheme = () =>
      document.documentElement.classList.contains("dark") ? "dark" : "light";
    const paint = () => {
      if (!cancelled) void renderMermaid(el, currentTheme());
    };
    paint();
    const observer = new MutationObserver(paint);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [html, nav.articleRef]);

  const toc = useArticleToc(nav.articleRef, `${nav.activeId ?? ""}::${html.length}`);

  const unitLabel = topic.units.replace(/s$/, "");
  const unitText = unitNoun(topic.units, nav.trackable.length);
  const active = nav.activeItem;
  const activeDone = active ? nav.studied.has(active.id) : false;
  const showStudied = active?.trackable === true;
  const downloadHref = topic.file ? contentUrl(topic.file) : null;

  const index = nav.order.indexOf(nav.activeId ?? "");
  const prevItem = index > 0 ? nav.items[index - 1] : null;
  const nextItem = index >= 0 && index < nav.items.length - 1 ? nav.items[index + 1] : null;

  const crumb = active?.part && active.part !== topic.title ? active.part : null;

  return (
    <div className="flex flex-1 min-h-0">
      <aside
        className={[
          "bg-surface border-r border-border",
          "fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] pt-14 flex-col",
          "lg:static lg:flex lg:w-72 xl:w-80 lg:pt-0 lg:max-w-none lg:h-full lg:min-h-0 shrink-0",
          navOpen ? "flex" : "hidden lg:flex",
        ].join(" ")}
      >
        <nav className="scroll-thin h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain px-3 pb-10 lg:h-full lg:min-h-0">
          <NavSidebar
            groups={nav.groups}
            hits={nav.hits}
            activeId={nav.activeId ?? ""}
            studied={nav.studied}
            query={nav.query}
            onQueryChange={nav.setQuery}
            onSelect={(id) => {
              nav.go(id);
              setNavOpen(false);
            }}
            searchRef={nav.searchRef}
            searchHint={nav.isBook ? `Search ${topic.units}  /` : "Search sections  /"}
          />
        </nav>
      </aside>

      {navOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-fg/30 lg:hidden"
          aria-label="Close contents"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <main className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="flex items-center gap-2 px-4 sm:px-6 lg:px-10 h-14 shrink-0 border-b border-border/70">
          <button
            type="button"
            className="lg:hidden h-9 min-w-[42px] grid place-items-center rounded-md hover:bg-surface-2 shrink-0 -ml-1.5 px-2"
            aria-label={navOpen ? "Close contents" : "Open contents"}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="flex flex-col items-center gap-0.5">
              {navOpen ? <X size={16} /> : <List size={16} />}
              <span className="text-[10px] leading-none">
                {navOpen ? "Close" : "Contents"}
              </span>
            </span>
          </button>

          <Breadcrumbs
            topic={topic}
            part={crumb}
            title={active?.title ?? topic.docTitle ?? topic.title}
          />

          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className="hidden md:inline text-xs text-muted tabular-nums">
              {nav.studiedCount}/{nav.trackable.length} {unitText}
            </span>
            {toc.items.length >= 2 ? (
              <button
                type="button"
                onClick={() => setTocOpen((v) => !v)}
                aria-expanded={tocOpen}
                className="xl:hidden h-9 min-w-[44px] grid place-items-center rounded-md hover:bg-surface-2 text-muted shrink-0 px-2"
                aria-label="On this page"
              >
                <span className="flex flex-col items-center gap-0.5">
                  <ListTree size={16} />
                  <span className="text-[10px] leading-none">On this page</span>
                </span>
              </button>
            ) : null}
            {downloadHref ? (
              <a
                href={downloadHref}
                download
                className="h-9 min-w-[44px] grid place-items-center rounded-md hover:bg-surface-2 text-muted shrink-0 px-2"
                aria-label={`Download ${topic.title} source`}
              >
                <span className="flex flex-col items-center gap-0.5">
                  <Download size={16} />
                  <span className="text-[10px] leading-none">Download</span>
                </span>
              </a>
            ) : null}
          </div>
        </div>

        {tocOpen && toc.items.length >= 2 ? (
          <div className="xl:hidden border-b border-border bg-surface px-4 py-3 max-h-[45vh] overflow-y-auto scroll-thin">
            <TableOfContents
              items={toc.items}
              activeId={toc.activeId}
              onSelect={(id) => {
                scrollToHeading(nav.articleRef.current!, id);
                setTocOpen(false);
              }}
            />
          </div>
        ) : null}

        <div className="flex-1 min-h-0 flex">
          <article
            ref={nav.articleRef}
            className="scroll-thin flex-1 min-w-0 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-8 lg:px-12 py-7"
          >
            {nav.error ? (
              <p className="measure text-muted">{nav.error}</p>
            ) : nav.isHtml && topic.file ? (
              <div className="h-full min-h-[70vh] rounded-lg border border-border overflow-hidden bg-white">
                <iframe
                  src={contentUrl(topic.file)}
                  title={topic.docTitle ?? topic.title}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
                />
              </div>
            ) : nav.loading ? (
              <p className="text-muted text-sm tracking-wide">Loading {topic.title}…</p>
            ) : (
              <>
                <div className="measure mb-7 flex flex-wrap items-center gap-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted font-medium">
                    {active && active.number !== null
                      ? `${unitLabel} ${active.number} of ${nav.trackable.length}`
                      : (topic.subtitle ?? "")}
                  </p>
                  {showStudied ? (
                    <button
                      type="button"
                      onClick={() => nav.toggleStudied(active!.id)}
                      className={[
                        "ml-auto h-9 px-3 rounded-md border text-[13px] inline-flex items-center gap-1.5 shrink-0",
                        activeDone
                          ? "bg-primary text-primary-fg border-primary"
                          : "bg-surface border-border text-muted hover:text-fg hover:bg-surface-2",
                      ].join(" ")}
                    >
                      <Check size={15} />
                      {activeDone ? "Complete" : "Mark complete"}
                    </button>
                  ) : null}
                </div>
                <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
                {active ? (
                  <SolutionEditor
                    key={active.id}
                    topic={topic.slug}
                    unitId={active.id}
                    unitTitle={active.title}
                  />
                ) : null}
              </>
            )}

            {!nav.isHtml ? (
              <nav className="measure mt-14 mb-6 grid gap-3 sm:grid-cols-2" aria-label="Pagination">
                {prevItem ? (
                  <button
                    type="button"
                    onClick={() => nav.go(prevItem.id)}
                    className="group flex flex-col items-start gap-1 rounded-lg border border-border bg-surface px-4 py-3 text-left hover:border-border-strong hover:bg-surface-2"
                  >
                    <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-faint">
                      <ChevronLeft size={13} /> Previous
                    </span>
                    <span className="text-sm text-fg line-clamp-2">{prevItem.title}</span>
                  </button>
                ) : (
                  <span className="hidden sm:block" />
                )}
                {nextItem ? (
                  <button
                    type="button"
                    onClick={() => nav.go(nextItem.id)}
                    className="group flex flex-col items-end gap-1 rounded-lg border border-border bg-surface px-4 py-3 text-right hover:border-border-strong hover:bg-surface-2 sm:col-start-2"
                  >
                    <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-faint">
                      Next <ChevronRight size={13} />
                    </span>
                    <span className="text-sm text-fg line-clamp-2">{nextItem.title}</span>
                  </button>
                ) : null}
              </nav>
            ) : null}
          </article>

          <aside className="hidden xl:block w-60 2xl:w-64 shrink-0 overflow-y-auto scroll-thin border-l border-border px-5 py-7">
            <div className="sticky top-0">
              <TableOfContents
                items={toc.items}
                activeId={toc.activeId}
                onSelect={(id) => scrollToHeading(nav.articleRef.current!, id)}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Breadcrumbs({
  topic,
  part,
  title,
}: {
  topic: TopicMeta;
  part: string | null;
  title: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0 flex items-center gap-1.5 text-[13px]">
      <Link
        to="/"
        className="shrink-0 text-muted hover:text-fg transition-colors"
        aria-label="All topics"
      >
        All topics
      </Link>
      <ChevronRight size={13} className="shrink-0 text-faint" aria-hidden />
      <span className="shrink-0 text-muted">{topic.title}</span>
      {part ? (
        <>
          <ChevronRight size={13} className="shrink-0 text-faint hidden sm:block" aria-hidden />
          <span className="hidden sm:block shrink-0 text-muted truncate max-w-[16ch]">{part}</span>
        </>
      ) : null}
      <ChevronRight size={13} className="shrink-0 text-faint hidden sm:block" aria-hidden />
      <span className="hidden sm:block min-w-0 truncate max-w-[22ch] font-medium text-fg">{title}</span>
    </nav>
  );
}

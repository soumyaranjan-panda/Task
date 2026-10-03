import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  List,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { filterSections, parseGuide, type GuideSection, type ParsedGuide } from "@/lib/guide";
import { loadStudied, loadTheme, saveStudied, saveTheme } from "@/lib/progress";
import { renderMarkdown } from "@/lib/render-markdown";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function GuideReader() {
  const [guide, setGuide] = useState<ParsedGuide | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState("intro");
  const [query, setQuery] = useState("");
  const [studied, setStudied] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [navOpen, setNavOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const t = loadTheme();
    setTheme(t);
    applyTheme(t);
    setStudied(loadStudied());
    fetch("/guide.md")
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load the guide (${r.status}).`);
        return r.text();
      })
      .then((text) => {
        const parsed = parseGuide(text);
        setGuide(parsed);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load guide."));
  }, []);

  const allSections = useMemo(() => {
    if (!guide) return [];
    return [guide.intro, ...guide.sections];
  }, [guide]);

  const readable = useMemo(
    () => allSections.filter((s) => s.level === 2 || s.id === "intro" || s.title.startsWith("Final Summary") || s.title.startsWith("PART ")),
    [allSections],
  );

  const hits = useMemo(() => filterSections(allSections, query), [allSections, query]);

  const active = allSections.find((s) => s.id === activeId) ?? allSections[0];

  const problemSections = useMemo(
    () => allSections.filter((s) => s.number !== null && s.number >= 1),
    [allSections],
  );

  const studiedCount = problemSections.filter((s) => studied.has(s.id)).length;

  const readableIds = useMemo(() => readable.map((s) => s.id), [readable]);

  const go = useCallback(
    (id: string) => {
      setActiveId(id);
      setNavOpen(false);
      articleRef.current?.scrollTo({ top: 0 });
    },
    [],
  );

  const step = useCallback(
    (dir: -1 | 1) => {
      const idx = readableIds.indexOf(activeId);
      const next = readableIds[idx + dir];
      if (next) go(next);
    },
    [activeId, go, readableIds],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        setNavOpen(false);
        (e.target as HTMLElement | null)?.blur?.();
        return;
      }
      if (typing) return;
      if (e.key === "j" || e.key === "ArrowRight") step(1);
      if (e.key === "k" || e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const toggleStudied = (id: string) => {
    setStudied((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveStudied(next);
      return next;
    });
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    saveTheme(next);
    applyTheme(next);
  };

  const html = useMemo(() => (active ? renderMarkdown(active.markdown) : ""), [active]);

  if (error) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <p className="text-muted max-w-md text-center">{error}</p>
      </div>
    );
  }

  if (!guide || !active) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <p className="text-muted text-sm tracking-wide">Loading the 53-problem guide…</p>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-hidden bg-bg text-fg flex flex-col">
      <header className="shrink-0 z-50 border-b border-border bg-surface/90 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-3 sm:px-5 h-14">
          <button
            type="button"
            className="lg:hidden size-11 grid place-items-center rounded-md hover:bg-surface-2"
            aria-label={navOpen ? "Close contents" : "Open contents"}
            onClick={() => setNavOpen((v) => !v)}
          >
            {navOpen ? <X size={20} /> : <List size={20} />}
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen size={18} className="shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate leading-tight">Graphs 53</p>
              <p className="text-[11px] text-muted truncate leading-tight hidden sm:block">
                Striver A2Z · Java study guide
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="hidden sm:inline text-xs text-muted tabular-nums pr-2">
              {studiedCount}/53 studied
            </span>
            <a
              href="/Graphs_53_Problems_StudyGuide.md"
              download="Graphs_53_Problems_StudyGuide.md"
              className="size-11 grid place-items-center rounded-md hover:bg-surface-2 text-muted"
              aria-label="Download Markdown"
            >
              <Download size={18} />
            </a>
            <button
              type="button"
              className="size-11 grid place-items-center rounded-md hover:bg-surface-2 text-muted"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside
          className={[
            "bg-surface border-r border-border",
            "fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] pt-14 flex-col",
            "lg:static lg:flex lg:w-72 xl:w-80 lg:pt-0 lg:max-w-none lg:h-full lg:min-h-0 shrink-0",
            navOpen ? "flex" : "hidden lg:flex",
          ].join(" ")}
        >
          <nav className="h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain px-3 pb-8 lg:h-full lg:min-h-0">
            <label className="sticky top-0 bg-surface pt-3 pb-2 block z-10">
              <span className="sr-only">Search</span>
              <span className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-faint" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search problems  /"
                  className="w-full h-11 pl-9 pr-3 rounded-md bg-bg border border-border text-sm placeholder:text-faint"
                />
              </span>
            </label>
            <SidebarList
              sections={allSections}
              hits={hits}
              activeId={activeId}
              studied={studied}
              querying={query.trim().length > 0}
              onSelect={go}
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
          <article
            ref={articleRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-8 lg:px-12 py-8"
          >
            <div className="flex items-start justify-between gap-3 max-w-[72ch] mb-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted font-medium">
                  {active.part}
                  {active.number !== null ? ` · Problem ${active.number}` : ""}
                </p>
              </div>
              {active.number !== null && active.number >= 1 && active.number <= 53 ? (
                <button
                  type="button"
                  onClick={() => toggleStudied(active.id)}
                  className={[
                    "h-11 px-3 rounded-md border text-sm inline-flex items-center gap-2",
                    studied.has(active.id)
                      ? "bg-primary text-primary-fg border-primary"
                      : "bg-surface border-border text-muted hover:text-fg",
                  ].join(" ")}
                >
                  <Check size={16} />
                  {studied.has(active.id) ? "Studied" : "Mark studied"}
                </button>
              ) : null}
            </div>
            <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
            <div className="max-w-[72ch] mt-12 mb-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => step(-1)}
                className="h-11 px-3 rounded-md border border-border bg-surface text-sm inline-flex items-center gap-1 hover:bg-surface-2"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="h-11 px-3 rounded-md border border-border bg-surface text-sm inline-flex items-center gap-1 hover:bg-surface-2"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}

function SidebarList({
  sections,
  hits,
  activeId,
  studied,
  querying,
  onSelect,
}: {
  sections: GuideSection[];
  hits: Set<string>;
  activeId: string;
  studied: Set<string>;
  querying: boolean;
  onSelect: (id: string) => void;
}) {
  let lastPart = "";
  const rows: ReactNode[] = [];
  for (const s of sections) {
    if (querying && !hits.has(s.id) && s.level === 2) continue;
    if (s.level === 1 && s.id !== "intro") {
      if (querying && !hits.has(s.id) && !sections.some((x) => x.part === s.part && hits.has(x.id))) {
        continue;
      }
      lastPart = s.part;
      rows.push(
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className={[
            "mt-4 mb-1 w-full text-left px-2 py-2 rounded-sm text-[11px] uppercase tracking-[0.14em] font-medium",
            activeId === s.id ? "text-fg" : "text-muted hover:text-fg",
          ].join(" ")}
        >
          {s.title.replace(/^PART\s+/, "Part ")}
        </button>,
      );
      continue;
    }
    const n = s.number;
    const label =
      n !== null ? `${n}. ${s.title.replace(/^\d+\.\s+/, "")}` : s.id === "intro" ? "How to read this" : s.title;
    rows.push(
      <button
        key={s.id}
        type="button"
        onClick={() => onSelect(s.id)}
        className={[
          "w-full text-left rounded-md px-2.5 py-2 text-[13px] leading-snug flex items-start gap-2 min-h-11",
          activeId === s.id ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/70 hover:text-fg",
        ].join(" ")}
      >
        <span
          className={[
            "mt-0.5 size-4 shrink-0 rounded-full border grid place-items-center",
            studied.has(s.id) ? "bg-primary border-primary text-primary-fg" : "border-border",
          ].join(" ")}
          aria-hidden
        >
          {studied.has(s.id) ? <Check size={10} strokeWidth={3} /> : null}
        </span>
        <span className="min-w-0">
          <span className="block truncate">{label}</span>
          {n !== null && lastPart ? null : null}
        </span>
      </button>,
    );
  }
  if (querying && rows.length === 0) {
    return <p className="text-sm text-muted px-2 py-6">No matching sections.</p>;
  }
  return <div className="flex flex-col gap-0.5">{rows}</div>;
}

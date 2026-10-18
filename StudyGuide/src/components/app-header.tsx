import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, LayoutGrid, Moon, Search, Sun } from "lucide-react";
import { APP } from "@/lib/app-config";
import { useManifest, type TopicMeta } from "@/lib/content/manifest";
import { SearchContext } from "@/lib/search-context";
import { useTheme } from "@/lib/use-theme";
import { GlobalSearch } from "./global-search";
import { topicIcon } from "./topic-icon";

/**
 * Full-height app frame: brand bar with the topic switcher, ⌘K search and theme
 * toggle, then the page body. Children fill the remaining flex space, so both
 * the dashboard and the reader scroll independently.
 */
export function AppShell({ topic, children }: { topic?: TopicMeta | null; children: ReactNode }) {
  const { manifest } = useManifest();
  const { theme, toggle } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <SearchContext.Provider value={{ openSearch: () => setSearchOpen(true) }}>
      <div className="h-dvh overflow-hidden bg-bg text-fg flex flex-col">
        <header className="shrink-0 z-50 border-b border-border bg-surface/90 backdrop-blur-sm">
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 h-14">
            <Link to="/" className="flex items-center gap-2 min-w-0 rounded-md px-1 py-1">
              <LayoutGrid size={18} className="shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate leading-tight">{APP.name}</span>
                <span className="hidden sm:block text-[11px] text-muted truncate leading-tight">
                  {APP.tagline}
                </span>
              </span>
            </Link>

            <span className="hidden sm:block h-6 w-px bg-border" />

            <TopicSwitcher current={topic ?? null} topics={manifest?.topics ?? []} />

            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-keyshortcuts="Meta+K Control+K"
                className="h-11 pl-2.5 pr-2 sm:pl-3.5 sm:pr-2.5 rounded-md inline-flex items-center gap-2 border border-border bg-bg text-muted hover:bg-surface-2 hover:text-fg"
                aria-label="Search everything"
              >
                <Search size={17} />
                <span className="hidden md:inline text-xs">Search</span>
                <kbd className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded border border-border text-faint">
                  ⌘K
                </kbd>
              </button>
              <button
                type="button"
                onClick={toggle}
                className="size-11 grid place-items-center rounded-md hover:bg-surface-2 text-muted"
                aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>
        </header>

        {children}

        {searchOpen ? <GlobalSearch onClose={() => setSearchOpen(false)} /> : null}
      </div>
    </SearchContext.Provider>
  );
}

function TopicSwitcher({ current, topics }: { current: TopicMeta | null; topics: TopicMeta[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (topics.length === 0) return null;
  const CurrentIcon = topicIcon(current?.icon);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="h-11 max-w-[52vw] px-2 sm:px-3 rounded-md inline-flex items-center gap-2 border border-border bg-bg hover:bg-surface-2"
      >
        <CurrentIcon size={16} className="shrink-0 text-primary" />
        <span className="text-sm truncate">{current?.title ?? "All topics"}</span>
        <ChevronDown size={14} className="shrink-0 text-faint" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 z-50 w-72 max-w-[90vw] rounded-lg border border-border bg-surface shadow-lg overflow-hidden"
        >
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-surface-2"
          >
            <LayoutGrid size={16} className="text-muted" />
            <span className="font-medium">All topics</span>
          </Link>
          <div className="border-t border-border" />
          {topics.map((item) => {
            const Icon = topicIcon(item.icon);
            return (
              <Link
                key={item.slug}
                to="/topic/$topicSlug"
                params={{ topicSlug: item.slug }}
                onClick={() => setOpen(false)}
                role="menuitem"
                className={[
                  "flex items-start gap-2.5 px-3 py-2.5 text-sm hover:bg-surface-2",
                  item.slug === current?.slug ? "bg-surface-2/60" : "",
                ].join(" ")}
              >
                <Icon size={16} className="mt-0.5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.title}</span>
                  {item.subtitle ? (
                    <span className="block text-xs text-muted truncate">{item.subtitle}</span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

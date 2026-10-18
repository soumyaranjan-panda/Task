import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { loadSearchIndex, useManifest, type SearchEntry } from "@/lib/content/manifest";

const MAX_RESULTS = 40;

/**
 * Relevance score for one entry. Higher is better, 0 means "no match".
 *
 * Titles are ranked instead of filtered in index order: the index is written
 * topic by topic, so taking the first N matches would hand every visible slot
 * to whichever topic happens to be configured first.
 */
function scoreEntry(title: string, q: string): number {
  const t = title.toLowerCase();
  if (t === q) return 1000;
  if (t.startsWith(q)) return 700;
  const at = t.indexOf(q);
  if (at === -1) return 0;
  // Matching at a word boundary is a stronger signal than mid-word ("in" in
  // "Flood Fill" beats "in" in "Minimum").
  const boundary = at === 0 || /[\s\-—–:·/(),.!?[\]]/.test(t[at - 1]!);
  return (boundary ? 400 : 150) - Math.min(at, 60);
}

/**
 * Take the best `limit` matches while guaranteeing every topic a fair share, so
 * a broad query ("a", "search") still surfaces the SQL handbook and not just
 * the first topic. Leftover slots are back-filled in rank order.
 */
function diversify<T extends { entry: SearchEntry }>(
  ranked: T[],
  limit: number,
  topicCount: number,
): T[] {
  if (topicCount <= 1) return ranked.slice(0, limit);
  const cap = Math.max(6, Math.ceil(limit / topicCount));
  const used = new Map<string, number>();
  const picked: T[] = [];
  const rest: T[] = [];
  for (const item of ranked) {
    if (picked.length >= limit) break;
    const seen = used.get(item.entry.topic) ?? 0;
    if (seen < cap) {
      used.set(item.entry.topic, seen + 1);
      picked.push(item);
    } else {
      rest.push(item);
    }
  }
  for (const item of rest) {
    if (picked.length >= limit) break;
    picked.push(item);
  }
  return picked;
}

/**
 * ⌘K palette over the generated search index — every heading and page of every
 * topic. Book pages carry their id; split documents are matched by heading text
 * and resolved by the reader (`?q=`).
 */
export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { manifest } = useManifest();
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    let cancelled = false;
    loadSearchIndex()
      .then((index) => {
        if (!cancelled) setEntries(index.entries);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const topicTitle = (slug: string) => manifest?.topics.find((t) => t.slug === slug)?.title ?? slug;

  const topicCount = manifest?.topics.length ?? 1;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // No query: show the start of every topic rather than the first topic twice over.
      const all = entries.map((entry, i) => ({ entry, rank: 1000 - i }));
      return diversify(all, MAX_RESULTS, topicCount).map((item) => item.entry);
    }
    const ranked = entries
      .map((entry, i) => ({ entry, rank: scoreEntry(entry.title, q), i }))
      .filter((item) => item.rank > 0)
      .sort(
        (a, b) =>
          b.rank - a.rank ||
          a.entry.title.length - b.entry.title.length ||
          a.i - b.i,
      );
    return diversify(ranked, MAX_RESULTS, topicCount).map((item) => item.entry);
  }, [entries, query, topicCount]);

  useEffect(() => setCursor(0), [query]);

  const open = (entry: SearchEntry) => {
    onClose();
    navigate({
      to: "/topic/$topicSlug",
      params: { topicSlug: entry.topic },
      search: entry.page ? { p: entry.page } : { q: entry.title },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0 bg-fg/30"
        aria-label="Close search"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-surface shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 border-b border-border">
          <Search size={16} className="text-faint shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              }
              if (event.key === "Enter") {
                const hit = results[cursor];
                if (hit) open(hit);
              }
            }}
            placeholder="Search every note, problem and page…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted hover:text-fg px-1.5 py-1 rounded"
          >
            esc
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">
              {entries.length === 0 ? "Search index unavailable." : "No matches."}
            </p>
          ) : (
            results.map((entry, i) => (
              <button
                key={`${entry.topic}-${entry.page ?? entry.title}`}
                type="button"
                onMouseEnter={() => setCursor(i)}
                onClick={() => open(entry)}
                className={[
                  "w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm",
                  i === cursor ? "bg-surface-2" : "hover:bg-surface-2/60",
                ].join(" ")}
              >
                <span className="text-[11px] uppercase tracking-[0.12em] text-faint w-24 shrink-0 truncate">
                  {topicTitle(entry.topic)}
                </span>
                <span className="truncate">{entry.title}</span>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-border text-[11px] text-faint">
          {results.length}
          {results.length === MAX_RESULTS ? "+" : ""} result{results.length === 1 ? "" : "s"} · ↑↓
          to move · ↵ to open
        </div>
      </div>
    </div>
  );
}

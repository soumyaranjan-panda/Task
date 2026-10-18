import { useEffect, useRef, useState, type RefObject } from "react";
import { Check, ChevronRight, Search } from "lucide-react";

export type NavItem = {
  id: string;
  title: string;
  number: number | null;
  part: string;
  /** Can be ticked off as "studied". */
  trackable: boolean;
  searchable: string;
};

export type NavGroup = { id: string; label: string; items: NavItem[] };

/**
 * Sidebar navigation shared by every topic kind: a filter box plus grouped,
 * collapsible lists. Each group shows its own progress tally, and the active
 * section keeps itself scrolled into view as you move through the guide.
 */
export function NavSidebar({
  groups,
  hits,
  activeId,
  studied,
  query,
  onQueryChange,
  onSelect,
  searchRef,
  searchHint,
}: {
  groups: NavGroup[];
  hits: Set<string>;
  activeId: string;
  studied: Set<string>;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  searchRef?: RefObject<HTMLInputElement | null>;
  searchHint: string;
}) {
  const querying = query.trim().length > 0;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const listRef = useRef<HTMLDivElement>(null);

  const visible = groups
    .map((group) => ({
      ...group,
      items: querying ? group.items.filter((item) => hits.has(item.id)) : group.items,
    }))
    .filter((group) => group.items.length > 0);

  // Follow the reader: keep the active row in view without hijacking the page.
  useEffect(() => {
    if (querying || !activeId) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-nav-id="${activeId}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [activeId, querying]);

  return (
    <div ref={listRef}>
      <label className="sticky top-0 z-10 block bg-surface pt-3 pb-2">
        <span className="sr-only">Search contents</span>
        <span className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-faint" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchHint}
            className="h-11 w-full rounded-md border border-border bg-bg pl-9 pr-3 text-sm placeholder:text-faint"
          />
        </span>
      </label>

      {visible.length === 0 ? (
        <p className="px-2 py-6 text-sm text-muted">No matching sections.</p>
      ) : (
        visible.map((group) => {
          const trackables = group.items.filter((item) => item.trackable);
          const done = trackables.filter((item) => studied.has(item.id)).length;
          const isCollapsed = !querying && collapsed[group.id];
          return (
            <div key={group.id} className="mb-1">
              <button
                type="button"
                onClick={() => setCollapsed((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                aria-expanded={!isCollapsed}
                className="mt-3 mb-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left hover:bg-surface-2"
              >
                <ChevronRight
                  size={12}
                  className={[
                    "shrink-0 text-faint transition-transform",
                    isCollapsed ? "" : "rotate-90",
                  ].join(" ")}
                />
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
                  {group.label}
                </span>
                {trackables.length > 0 ? (
                  <span className="shrink-0 text-[10px] tabular-nums text-faint">
                    {done}/{trackables.length}
                  </span>
                ) : null}
              </button>

              {isCollapsed ? null : (
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = item.id === activeId;
                    const isDone = studied.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-nav-id={item.id}
                        onClick={() => onSelect(item.id)}
                        aria-current={active ? "page" : undefined}
                        className={[
                          "relative flex min-h-11 w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-[13px] leading-snug",
                          "before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:transition-colors",
                          active
                            ? "bg-surface-2 font-medium text-fg before:bg-accent"
                            : "text-muted hover:bg-surface-2/70 hover:text-fg before:bg-transparent",
                        ].join(" ")}
                      >
                        <span
                          aria-hidden
                          className={[
                            "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                            item.trackable
                              ? isDone
                                ? "border-primary bg-primary text-primary-fg"
                                : "border-border"
                              : "border-transparent",
                          ].join(" ")}
                        >
                          {item.trackable && isDone ? <Check size={10} strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

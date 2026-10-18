import { useCallback } from "react";
import type { TocItem } from "@/lib/use-article-toc";

/** Compact vertical table of contents for the right rail (and mobile sheet). */
export function TableOfContents({
  items,
  activeId,
  onSelect,
  className = "",
}: {
  items: TocItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const handle = useCallback(
    (event: React.MouseEvent, id: string) => {
      event.preventDefault();
      onSelect(id);
    },
    [onSelect],
  );

  if (items.length < 2) return null;

  return (
    <nav aria-label="On this page" className={className}>
      <p className="mb-2 px-2 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">
        On this page
      </p>
      <ul className="flex flex-col gap-0.5 border-l border-border">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(event) => handle(event, item.id)}
                aria-current={active ? "true" : undefined}
                className={[
                  "block border-l-2 py-1 text-[12.5px] leading-snug transition-colors",
                  item.depth === 3 ? "pl-5 pr-2" : "pl-3 pr-2",
                  active
                    ? "-ml-px border-accent font-medium text-fg"
                    : "-ml-px border-transparent text-muted hover:border-border-strong hover:text-fg",
                ].join(" ")}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

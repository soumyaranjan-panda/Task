import { useEffect, useState, type RefObject } from "react";

export type TocItem = { id: string; text: string; depth: number };

/**
 * Collect the headings inside the rendered article and track which one the
 * reader is currently looking at. The article element is the scroll container,
 * so the "active" heading is the last one that has passed a small offset from
 * the top of that container.
 *
 * `revision` should change whenever the rendered markdown changes (page id or
 * html), which is when the heading set needs re-scanning.
 */
export function useArticleToc(
  containerRef: RefObject<HTMLElement | null>,
  revision: string,
): { items: TocItem[]; activeId: string | null } {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      setItems([]);
      return;
    }
    const nodes = Array.from(
      container.querySelectorAll<HTMLElement>(".prose h2[id], .prose h3[id]"),
    );
    const next: TocItem[] = nodes.map((node) => ({
      id: node.id,
      text: node.textContent?.replace(/^#\s*/, "").trim() ?? node.id,
      depth: node.tagName === "H3" ? 3 : 2,
    }));
    setItems(next);
    setActiveId(next[0]?.id ?? null);
  }, [containerRef, revision]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const top = container.getBoundingClientRect().top;
      let current = items[0]?.id ?? null;
      for (const item of items) {
        const node = container.querySelector<HTMLElement>(`#${CSS.escape(item.id)}`);
        if (!node) continue;
        if (node.getBoundingClientRect().top - top <= 96) current = item.id;
        else break;
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [containerRef, items]);

  return { items, activeId };
}

export function scrollToHeading(container: HTMLElement, id: string): void {
  const node = container.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (!node) return;
  const offset = node.getBoundingClientRect().top - container.getBoundingClientRect().top;
  container.scrollTo({ top: container.scrollTop + offset - 20, behavior: "smooth" });
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { findPage, topicPages, useContentText, type TopicMeta } from "./content/manifest";
import {
  findJumpTarget,
  matchIds,
  parseMarkdownDoc,
  type DocSection,
  type ParsedDoc,
} from "./content/markdown-doc";
import { loadLastPage, loadStudied, saveLastPage, saveStudied } from "./progress";
import type { NavGroup, NavItem } from "@/components/nav-sidebar";

export type TopicSearch = { p?: string; q?: string };

export const HTML_DOC_ITEM_ID = "document";

function itemFromSection(section: DocSection): NavItem {
  return {
    id: section.id,
    title: section.title,
    number: section.number,
    part: section.part,
    trackable: section.kind === "problem",
    searchable: section.searchable,
  };
}

/**
 * All state for reading one topic, whatever its kind:
 *   - resolves the URL (`?p=`, `?q=`) into an active section or page,
 *   - exposes a grouped nav model for the sidebar,
 *   - loads the markdown text (books) or parses the document once (docs),
 *   - tracks per-topic "studied" progress.
 */
export function useTopicNav(topic: TopicMeta, search: TopicSearch) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [studied, setStudied] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const jumpedFor = useRef<string | null>(null);

  const isBook = topic.kind === "markdown-book";
  const isHtml = topic.kind === "html-doc";

  const pages = useMemo(() => (isBook ? topicPages(topic) : []), [isBook, topic]);
  const activePage = useMemo(() => {
    if (!isBook) return null;
    return search.p ? (findPage(topic, search.p) ?? pages[0] ?? null) : (pages[0] ?? null);
  }, [isBook, pages, search.p, topic]);

  const rel = isBook ? (activePage?.file ?? null) : (topic.file ?? null);
  const { text, error, loading } = useContentText(rel);

  const doc = useMemo<ParsedDoc | null>(() => {
    if (isBook || isHtml || !text) return null;
    return parseMarkdownDoc(text, topic.parse);
  }, [isBook, isHtml, text, topic.parse]);

  useEffect(() => {
    setStudied(loadStudied(topic.slug));
  }, [topic.slug]);

  const groups = useMemo<NavGroup[]>(() => {
    if (isBook) {
      return (topic.chapters ?? []).map((chapter) => ({
        id: chapter.id,
        label: chapter.title,
        items: chapter.pages.map((page) => ({
          id: page.id,
          title: page.title,
          number: null,
          part: chapter.title,
          trackable: true,
          searchable: `${page.title}\n${chapter.title}`.toLowerCase(),
        })),
      }));
    }
    if (isHtml) {
      const title = topic.docTitle ?? topic.title;
      return [
        {
          id: HTML_DOC_ITEM_ID,
          label: topic.title,
          items: [
            {
              id: HTML_DOC_ITEM_ID,
              title,
              number: null,
              part: topic.title,
              trackable: true,
              searchable: title.toLowerCase(),
            },
          ],
        },
      ];
    }
    if (!doc) return [];
    const out: NavGroup[] = [{ id: "start", label: "Start", items: [itemFromSection(doc.intro)] }];
    let current = out[0]!;
    for (const section of doc.sections) {
      if (section.kind === "part") {
        current = { id: section.id, label: section.part, items: [] };
        out.push(current);
        continue;
      }
      current.items.push(itemFromSection(section));
    }
    return out;
  }, [doc, isBook, isHtml, topic]);

  const items = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const order = useMemo(() => items.map((item) => item.id), [items]);

  // Without `?p=`, reopen wherever this topic was last read — unless the URL
  // carries a `?q=` search jump, which is a more explicit intent.
  const restored = useMemo(
    () => (search.p || search.q ? null : loadLastPage(topic.slug)),
    [search.p, search.q, topic.slug],
  );

  const fallbackId = isBook ? (activePage?.id ?? null) : doc ? doc.intro.id : null;
  const activeId = useMemo(() => {
    if (search.p && order.includes(search.p)) return search.p;
    if (!search.p && restored && order.includes(restored)) return restored;
    return fallbackId ?? order[0] ?? null;
  }, [search.p, restored, order, fallbackId]);

  const activeItem = items.find((item) => item.id === activeId) ?? null;
  const activeSection = useMemo(
    () => (doc ? (doc.sections.find((section) => section.id === activeId) ?? doc.intro) : null),
    [doc, activeId],
  );

  // Put the resolved position in the URL so links stay shareable. Skipped while
  // a `?q=` jump is pending, otherwise this would overwrite it with the
  // restored page.
  useEffect(() => {
    if (search.p || search.q || !activeId) return;
    navigate({
      to: "/topic/$topicSlug",
      params: { topicSlug: topic.slug },
      search: { p: activeId },
      replace: true,
    });
  }, [activeId, navigate, search.p, search.q, topic.slug]);

  useEffect(() => {
    if (activeId) saveLastPage(topic.slug, activeId);
  }, [activeId, topic.slug]);

  const go = useCallback(
    (id: string) => {
      navigate({
        to: "/topic/$topicSlug",
        params: { topicSlug: topic.slug },
        search: { p: id },
      });
      articleRef.current?.scrollTo({ top: 0 });
    },
    [navigate, topic.slug],
  );

  // A global-search hit on a split document arrives as `?q=`; jump to best match.
  useEffect(() => {
    const q = search.q;
    if (!q || items.length === 0 || jumpedFor.current === q) return;
    const hit = findJumpTarget(items, q);
    if (!hit) return;
    jumpedFor.current = q;
    setQuery(q);
    navigate({
      to: "/topic/$topicSlug",
      params: { topicSlug: topic.slug },
      search: { p: hit.id },
      replace: true,
    });
  }, [search.q, items, navigate, topic.slug]);

  const step = useCallback(
    (dir: -1 | 1) => {
      const index = order.indexOf(activeId ?? "");
      const next = order[index + dir];
      if (next) go(next);
    },
    [activeId, go, order],
  );

  const toggleStudied = useCallback(
    (id: string) => {
      setStudied((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        saveStudied(topic.slug, next);
        return next;
      });
    },
    [topic.slug],
  );

  const hits = useMemo(() => matchIds(items, query), [items, query]);
  const trackable = useMemo(() => items.filter((item) => item.trackable), [items]);
  const studiedCount = trackable.filter((item) => studied.has(item.id)).length;

  const markdown = isBook ? (text ?? "") : (activeSection?.markdown ?? "");

  return {
    topic,
    isBook,
    isHtml,
    doc,
    text,
    error,
    loading,
    markdown,
    groups,
    items,
    order,
    activeId,
    activeItem,
    activeSection,
    activePage,
    query,
    setQuery,
    hits,
    studied,
    studiedCount,
    trackable,
    toggleStudied,
    go,
    step,
    searchRef,
    articleRef,
  };
}

export type TopicNav = ReturnType<typeof useTopicNav>;

import { useEffect, useState } from "react";

/**
 * Shape of `public/content/manifest.json`, produced by `scripts/sync-content.mjs`
 * from `content.config.json`. Everything the UI knows about a topic comes from
 * here, so adding a subject needs no code changes.
 */

export type TopicKind = "markdown-doc" | "markdown-book" | "html-doc";

export type DocParseOptions = {
  /** Heading level at which a document is cut into sections (1 or 2). */
  splitLevel?: number;
  introTitle?: string;
  introId?: string;
  /** Prefix for numbered section ids, e.g. `p-12`. Keeps stored progress stable. */
  idPrefix?: string;
  /** Lowest number that counts as a trackable unit (progress denominator). */
  numberMin?: number;
  numberMax?: number | null;
  /** Part label used before any part heading is seen. */
  defaultPart?: string;
  /** Explicit number -> part mapping; wins over the enclosing part heading. */
  partRanges?: { max: number; name: string }[];
};

export type PageMeta = { id: string; title: string; file: string };
export type ChapterMeta = { id: string; title: string; pages: PageMeta[] };

export type TopicMeta = {
  slug: string;
  kind: TopicKind;
  title: string;
  subtitle: string | null;
  summary: string | null;
  icon: string | null;
  /** Noun for counts, e.g. "problems", "pages". */
  units: string;
  /** Precomputed denominator for `markdown-doc` topics; null when unknown. */
  unitsTotal?: number | null;
  /** Document heading, as opposed to the display title. */
  docTitle?: string;
  /** Path (under `/content`) for single-file topics. */
  file?: string;
  parse?: DocParseOptions | null;
  chapters?: ChapterMeta[];
};

export type Manifest = {
  generatedAt: string;
  defaultTopic: string | null;
  topics: TopicMeta[];
};

export type SearchEntry = { topic: string; title: string; page?: string };
export type SearchIndex = { generatedAt: string; entries: SearchEntry[] };

export const CONTENT_BASE = "/content";

export function contentUrl(rel: string): string {
  return `${CONTENT_BASE}/${rel.replace(/^\/+/, "")}`;
}

/* ------------------------------------------------------------- topic queries */

export function findTopic(manifest: Manifest | null, slug: string): TopicMeta | null {
  return manifest?.topics.find((topic) => topic.slug === slug) ?? null;
}

export function topicPages(topic: TopicMeta): PageMeta[] {
  return (topic.chapters ?? []).flatMap((chapter) => chapter.pages);
}

export function findPage(topic: TopicMeta, id: string): PageMeta | null {
  return topicPages(topic).find((page) => page.id === id) ?? null;
}

/** Progress denominator known before parsing, or null when it needs the parser. */
export function knownUnitCount(topic: TopicMeta): number | null {
  if (topic.kind === "markdown-book") return topicPages(topic).length;
  if (topic.kind === "html-doc") return 1;
  return topic.unitsTotal ?? null;
}

/** `("problems", 53) -> "problems"`, `("notes", 1) -> "note"`. */
export function unitNoun(units: string, total: number): string {
  return total === 1 ? units.replace(/s$/, "") : units;
}

/* ------------------------------------------------------------------ loaders */

const jsonCache = new Map<string, Promise<unknown>>();
const textCache = new Map<string, Promise<string>>();

function fetchJsonCached<T>(url: string): Promise<T> {
  const hit = jsonCache.get(url);
  if (hit) return hit as Promise<T>;
  const promise = fetch(url, { cache: "no-cache" }).then(async (response) => {
    if (!response.ok) throw new Error(`Could not load ${url} (${response.status}).`);
    return (await response.json()) as T;
  });
  jsonCache.set(url, promise);
  promise.catch(() => jsonCache.delete(url));
  return promise;
}

/** Markdown/HTML sources are served verbatim, so they must be read as text. */
function fetchTextCached(url: string): Promise<string> {
  const hit = textCache.get(url);
  if (hit) return hit;
  const promise = fetch(url, { cache: "no-cache" }).then(async (response) => {
    if (!response.ok) throw new Error(`Could not load ${url} (${response.status}).`);
    return await response.text();
  });
  textCache.set(url, promise);
  promise.catch(() => textCache.delete(url));
  return promise;
}

function errorText(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Something went wrong.";
}

export function loadManifest(): Promise<Manifest> {
  return fetchJsonCached<Manifest>(contentUrl("manifest.json"));
}

export function loadSearchIndex(): Promise<SearchIndex> {
  return fetchJsonCached<SearchIndex>(contentUrl("index.json"));
}

export function loadContentText(rel: string): Promise<string> {
  return fetchTextCached(contentUrl(rel));
}

/* -------------------------------------------------------------------- hooks */

export function useManifest(): { manifest: Manifest | null; error: string | null } {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadManifest()
      .then((data) => {
        if (!cancelled) setManifest(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorText(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { manifest, error };
}

type TextState = { rel: string; text: string | null; error: string | null };

/** Load one content file by its manifest-relative path. */
export function useContentText(rel: string | null | undefined): {
  text: string | null;
  error: string | null;
  loading: boolean;
} {
  const [state, setState] = useState<TextState>({ rel: "", text: null, error: null });

  useEffect(() => {
    if (!rel) return;
    let cancelled = false;
    setState({ rel, text: null, error: null });
    loadContentText(rel)
      .then((text) => {
        if (!cancelled) setState({ rel, text, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ rel, text: null, error: errorText(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [rel]);

  if (!rel) return { text: null, error: null, loading: false };
  const settled = state.rel === rel && (state.text !== null || state.error !== null);
  return { text: state.text, error: state.error, loading: !settled };
}

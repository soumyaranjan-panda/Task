/**
 * Saved solutions: the notes you write next to a problem, kept in Postgres.
 *
 * The API is a small standalone server (`server/api.mjs`) rather than a route in
 * this app, because Vite only wires up framework server code during `build` —
 * in `npm run dev` a route file would 404. Vite proxies `/api` to it.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

export type Solution = {
  topic: string;
  unitId: string;
  language: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type SaveInput = {
  topic: string;
  unitId: string;
  language: string;
  title?: string;
  body: string;
};

/** Languages offered per topic; the first one is the default. */
export const LANGUAGES = ["java", "python", "cpp", "javascript", "sql"] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Record<string, Language> = {
  graphs: "java",
  "binary-search": "java",
  "sliding-window": "java",
  sql: "sql",
};

const keyOf = (unitId: string, language: string) => `${unitId}::${language}`;

class ApiError extends Error {
  readonly offline: boolean;
  constructor(message: string, offline = false) {
    super(message);
    this.name = "ApiError";
    this.offline = offline;
    
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    // fetch itself failed: API process down, or no Docker stack running.
    throw new ApiError(
      "Can't reach the solutions API. Start it with `docker compose up`.",
      true,
    );
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) message = payload.error;
    } catch {
      /* keep the status-based message */
    }
    throw new ApiError(message, response.status === 503);
  }

  return (await response.json()) as T;
}

export function loadTopicSolutions(topic: string): Promise<Solution[]> {
  return request<{ solutions: Solution[] }>(`/api/solutions?topic=${encodeURIComponent(topic)}`).then(
    (payload) => payload.solutions,
  );
}

export function saveSolution(input: SaveInput): Promise<Solution> {
  return request<{ solution: Solution }>("/api/solutions", {
    method: "PUT",
    body: JSON.stringify(input),
  }).then((payload) => payload.solution);
}

export function deleteSolution(input: {
  topic: string;
  unitId: string;
  language: string;
}): Promise<void> {
  const query = new URLSearchParams({
    topic: input.topic,
    unitId: input.unitId,
    language: input.language,
  });
  return request<{ deleted: boolean }>(`/api/solutions?${query}`, {
    method: "DELETE",
  }).then(() => undefined);
}

export type SolutionsStatus = "loading" | "ready" | "unavailable";

/**
 * Topic-level cache.
 *
 * The editor mounts once per problem, so without this every section you open
 * would re-fetch the whole topic. Settled results are shared across mounts, and
 * saves patch the cache in place so other mounts see them immediately.
 */
type CacheEntry = {
  status: SolutionsStatus;
  error: string | null;
  solutions: Solution[];
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry>>();

async function fetchTopic(topic: string): Promise<CacheEntry> {
  const existing = inflight.get(topic);
  if (existing) return existing;

  const request = loadTopicSolutions(topic)
    .then<CacheEntry>((solutions) => {
      const entry = { status: "ready" as const, error: null, solutions };
      cache.set(topic, entry);
      return entry;
    })
    .catch((cause: unknown) => {
      const entry = {
        status: cause instanceof ApiError && cause.offline ? ("unavailable" as const) : ("ready" as const),
        error: cause instanceof Error ? cause.message : "Could not load saved solutions.",
        solutions: [],
      };
      // Don't cache failures as permanent: a stopped database should recover
      // once it is running again.
      cache.delete(topic);
      return entry;
    })
    .finally(() => inflight.delete(topic));

  inflight.set(topic, request);
  return request;
}

/** Every saved solution for one topic, loaded once and shared across mounts. */
export function useSolutions(topic: string) {
  const [entry, setEntry] = useState<CacheEntry>(
    () => cache.get(topic) ?? { status: "loading", error: null, solutions: [] },
  );

  useEffect(() => {
    let cancelled = false;
    const cached = cache.get(topic);
    if (cached) setEntry(cached);
    else setEntry({ status: "loading", error: null, solutions: [] });

    // Always revalidate in the background: another tab (or another container
    // replica) may have saved something since the last mount.
    void fetchTopic(topic).then((next) => {
      if (!cancelled) setEntry(next);
    });

    return () => {
      cancelled = true;
    };
  }, [topic]);

  const solutions = entry.solutions;

  const byKey = useMemo(() => {
    const map = new Map<string, Solution>();
    for (const solution of solutions) map.set(keyOf(solution.unitId, solution.language), solution);
    return map;
  }, [solutions]);

  const put = useCallback(
    (solution: Solution) => {
      const current = cache.get(solution.topic) ?? {
        status: "ready" as const,
        error: null,
        solutions: [],
      };
      const key = keyOf(solution.unitId, solution.language);
      const next = current.solutions.filter((item) => keyOf(item.unitId, item.language) !== key);
      next.push(solution);
      const updated = { ...current, solutions: next };
      cache.set(solution.topic, updated);
      setEntry((live) => {
        const liveKey = keyOf(solution.unitId, solution.language);
        return {
          ...live,
          solutions: [
            ...live.solutions.filter((item) => keyOf(item.unitId, item.language) !== liveKey),
            solution,
          ],
        };
      });
    },
    [],
  );

  const remove = useCallback(
    (unitId: string, language: string) => {
      const key = keyOf(unitId, language);
      const strip = (list: Solution[]) =>
        list.filter((item) => keyOf(item.unitId, item.language) !== key);

      const current = cache.get(topic);
      if (current) cache.set(topic, { ...current, solutions: strip(current.solutions) });
      setEntry((live) => ({ ...live, solutions: strip(live.solutions) }));
    },
    [topic],
  );

  return { solutions, byKey, status: entry.status, error: entry.error, put, remove };
}
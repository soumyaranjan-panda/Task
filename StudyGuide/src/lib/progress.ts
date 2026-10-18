/**
 * Per-topic study progress + theme, persisted in localStorage.
 *
 * Progress is namespaced by topic slug (`{ graphs: ["p-1", …], sql: [...] }`) so
 * two topics can use the same section ids. The original single-topic keys from
 * the graphs-only app are migrated on first read.
 */

const PROGRESS_KEY = "study-hub:studied:v2";
const LAST_PAGE_KEY = "study-hub:last-page:v2";
const THEME_KEY = "study-hub:theme";

const LEGACY_PROGRESS_KEY = "graphs53-studied";
const LEGACY_THEME_KEY = "graphs53-theme";
const LEGACY_TOPIC = "graphs";

type ProgressStore = Record<string, string[]>;

function readStore(): ProgressStore {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const store: ProgressStore = {};
    for (const [topic, ids] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(ids))
        store[topic] = ids.filter((id): id is string => typeof id === "string");
    }
    return store;
  } catch {
    return {};
  }
}

function writeStore(store: ProgressStore): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
  } catch {
    /* storage full or blocked — progress is best-effort */
  }
}

/** Fold the old flat `graphs53-studied` list into the graphs topic. */
function migrateLegacyProgress(): void {
  let legacy: string | null = null;
  try {
    legacy = localStorage.getItem(LEGACY_PROGRESS_KEY);
  } catch {
    return;
  }
  if (!legacy) return;
  const store = readStore();
  if (!store[LEGACY_TOPIC]) {
    try {
      const parsed: unknown = JSON.parse(legacy);
      if (Array.isArray(parsed)) {
        store[LEGACY_TOPIC] = parsed.filter((id): id is string => typeof id === "string");
        writeStore(store);
      }
    } catch {
      /* ignore malformed legacy value */
    }
  }
  try {
    localStorage.removeItem(LEGACY_PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

export function loadStudied(topic: string): Set<string> {
  migrateLegacyProgress();
  return new Set(readStore()[topic] ?? []);
}

export function saveStudied(topic: string, ids: Set<string>): void {
  const store = readStore();
  store[topic] = [...ids];
  writeStore(store);
}

export function loadAllStudied(): Record<string, string[]> {
  migrateLegacyProgress();
  return readStore();
}

/** Last section/page opened per topic, so the dashboard can offer "Resume". */
type LastPageEntry = { id: string; at: number };

function readLastPageStore(): Record<string, LastPageEntry> {
  try {
    const raw = localStorage.getItem(LAST_PAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const store: Record<string, LastPageEntry> = {};
    for (const [topic, value] of Object.entries(parsed as Record<string, unknown>)) {
      // Older versions stored the id as a plain string; accept both shapes.
      if (typeof value === "string") store[topic] = { id: value, at: 0 };
      else if (value && typeof value === "object" && typeof (value as LastPageEntry).id === "string") {
        const entry = value as LastPageEntry;
        store[topic] = { id: entry.id, at: typeof entry.at === "number" ? entry.at : 0 };
      }
    }
    return store;
  } catch {
    return {};
  }
}

export function loadLastPage(topic: string): string | null {
  return readLastPageStore()[topic]?.id ?? null;
}

export function saveLastPage(topic: string, id: string): void {
  try {
    const store = readLastPageStore();
    store[topic] = { id, at: Date.now() };
    localStorage.setItem(LAST_PAGE_KEY, JSON.stringify(store));
  } catch {
    /* best-effort */
  }
}

export type RecentTopic = { slug: string; id: string; at: number };

/** Topics the reader has opened, most recent first. Powers "Recently viewed". */
export function loadRecentTopics(): RecentTopic[] {
  return Object.entries(readLastPageStore())
    .map(([slug, entry]) => ({ slug, id: entry.id, at: entry.at }))
    .sort((a, b) => b.at - a.at);
}

export type Theme = "light" | "dark";

export function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY) ?? localStorage.getItem(LEGACY_THEME_KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

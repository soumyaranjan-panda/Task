# Study Hub

One app for every subject: the graphs guide, binary search, sliding window, the
SQL handbook, the Java interview handbook, contract testing and the Stack & Queue guide. Subjects are **data, not code** — add one to `content.config.json`,
run `npm run sync`, and it appears in the app (dashboard card, sidebar, search,
progress tracking) with no code changes.

Built with Vite + React 19 + TanStack Start/Router + Tailwind 4 + marked.

## Commands

| Command                                     | What it does                                          |
| ------------------------------------------- | ----------------------------------------------------- |
| `npm run dev`                               | Syncs content, then serves on `0.0.0.0:8082`          |
| `npm run sync`                              | Rebuilds `public/content/` from `content.config.json` |
| `npm run build`                             | Syncs content, then builds for production             |
| `npm run typecheck`                         | `tsc --noEmit`                                        |
| `npm run lint`                              | ESLint                                                |
| `npm run format`                            | Prettier                                              |
| `npm run import:html -- <in.html> <out.md>` | Convert a styled HTML notes page into markdown        |

## How content works

```
content/<slug>/…                    ← YOUR notes, edit these (git-tracked)
content.config.json                ← topic registry (the only config you edit)
      │  npm run sync  (scripts/sync-content.mjs)
      ▼
public/content/<slug>/…            ← generated, git-ignored
public/content/manifest.json       ← topics, chapters, pages, parse options
public/content/index.json          ← titles for the ⌘K palette
```

Every source lives inside `content/`, so the folder is self-contained — it builds
and runs on its own, with no files pulled in from anywhere else. `source` in
`content.config.json` is always relative to this folder, and should point into
`content/`.
sync copies markdown/HTML only, derives titles from each file's `# heading`
(falling back to a tidied filename when the heading is missing or duplicated),
unwraps notes that were pasted inside a single ` ```markdown ` block, and
prunes files that are no longer configured.

## Adding a topic

Add one entry to `content.config.json` and run `npm run sync`.

**A folder of notes** (`markdown-book`) — sub-folders become chapters, files
become pages:

```json
{
  "slug": "system-design",
  "kind": "markdown-book",
  "title": "System Design",
  "subtitle": "Basics → concepts → case studies",
  "summary": "Scaling, caching, consistency, databases.",
  "icon": "network",
  "source": "content/system-design",
  "units": "pages"
}
```

**One big guide** (`markdown-doc`) — the file is split into sections at each
heading. Numbered headings (`## 12. Detect a Cycle`) become trackable units with
stable ids (`p-12`, so saved progress survives edits), and `# PART A — …`
headings group them:

```json
{
  "slug": "trees",
  "kind": "markdown-doc",
  "title": "Trees",
  "source": "content/trees/guide.md",
  "units": "problems",
  "parse": {
    "splitLevel": 2,
    "introTitle": "How to read this",
    "idPrefix": "p",
    "numberMin": 1,
    "defaultPart": "Foundation",
    "partRanges": [{ "max": 20, "name": "A · Traversal" }]
  }
}
```

**A pre-styled HTML page** (`html-doc`) — rendered in a sandboxed iframe with its
own theme and scripts, plus a download link:

```json
{
  "slug": "dynamic-programming",
  "kind": "html-doc",
  "title": "Dynamic Programming",
  "source": "content/dynamic-programming/source.html",
  "units": "notes"
}
```

Notes on the fields:

- `source` — path relative to this folder; keep it inside `content/<slug>/`.
- `icon` — any key from `src/components/topic-icon.tsx` (unknown names fall back
  to a book icon).
- `fileName` — optional served name inside `public/content/<slug>/`.
- `parse.partRanges` — optional; labels sections by their number, otherwise the
  enclosing `# PART …` heading is used.
- `rootGroupTitle` (top level) — names the chapter for loose files that sit
  outside any sub-folder.

## Importing a styled HTML notes page

Some notes were written as self-contained HTML (cards, tabs, collapsible
sections). Those can be converted to markdown so they behave like every other
topic — same navigation, search, progress and theme instead of an iframe:

```bash
npm run import:html -- content/sliding-window/source.html content/sliding-window/guide.md
```

`scripts/import-html.mjs` reads the page in headless Chrome and emits markdown:
patterns and problem cards become sections, each language tab becomes a fenced
code block, and the idea/steps/complexity/links are preserved. Register the
resulting `.md` in `content.config.json` as a `markdown-doc`. The original HTML
stays where it is, so you can re-run the import if the notes change.

The sliding-window notes were converted this way, so its in-page checkbox
tracker was dropped — ticking problems now happens in the app itself (sidebar
checkbox or **Mark studied**), and that state is saved per topic. The
`html-doc` kind is still available for any page you would rather embed as-is.

## Using the app

- `/` — dashboard with every topic, progress and search.
- `/topic/<slug>?p=<section-or-page>` — reader; the URL is shareable, and a
  topic reopens where you left it.
- `⌘K` / `Ctrl+K` — search every section and page across all topics.
- `/` inside a topic focuses the sidebar filter; `j` / `k` (or `←` / `→`) walk
  sections; `Esc` closes overlays.
- Progress, theme and last-read position are stored per topic in `localStorage`
  (the old graphs-only keys are migrated automatically on first load).

## Code map

```
content/<slug>/…                   your notes: graphs, binary-search, sliding-window, sql, java, contract-testing, stack-queue
content.config.json              topic registry (the only config you edit)
scripts/sync-content.mjs         content -> public/content + manifest + index
scripts/import-html.mjs          styled HTML notes page -> markdown
src/lib/content/manifest.ts      manifest types, fetchers, hooks
src/lib/content/markdown-doc.ts  fence-aware heading parser for markdown-doc
src/lib/content/highlight.ts     java + sql code highlighting
src/lib/topic-nav.ts             per-topic state: routing, nav groups, progress
src/lib/render-markdown.ts       marked setup (anchors, safe links)
src/components/app-header.tsx    app shell: switcher, search, theme
src/components/home-dashboard.tsx
src/components/topic-reader.tsx  reader layout for all three topic kinds
```

## Known content issues

Some source notes in `content/sql` were saved mid-generation and start with
chat text instead of a heading (e.g. `03-Joins/15-INNER-JOIN.md`). The app copes
(title falls back to the filename) but those pages read oddly until the notes are
finished.

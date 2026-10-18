# Study Hub — Current-State UI/UX Audit

**Audit scope:** Read-only review of the existing StudyGuide application on 18 October 2026. No application code, routes, content files, data models, or behaviour were changed. The only audit artifacts added are this report and the screenshots in `audit-screenshots/`.

## Evidence and confidence

- **Verified in source:** architecture, routes, data flow, tokens, keyboard interactions, persistence, and component behaviour described below.
- **Verified in a running local build:** dashboard plus guide and handbook reader templates at 1440 × 900 and 390 × 844. Screenshot references are included below.
- **Not verified:** database-backed saves, because the local solutions API/database was not configured during inspection; its unavailable state and fallback UI are source-verified.
- **Not an assumption:** there are only two application routes in `src/routes`: `/` and `/topic/$topicSlug`. The topic reader is a reusable template with three content modes.

## 1. Technology stack

| Area | Current implementation | Evidence |
| --- | --- | --- |
| Frontend | React 19 + TypeScript | `package.json`, `src/` |
| App/routing | TanStack Start and file-based TanStack Router | `src/router.tsx`, `src/routes/` |
| Build/dev | Vite 8; Nitro configured for production deployment | `vite.config.ts` |
| Styling | Tailwind CSS 4 utility classes plus a substantial global CSS design layer | `src/styles.css` |
| Icons | `lucide-react` | UI components |
| Markdown/rendering | `marked`, custom renderer/highlighting, Mermaid diagrams | `src/lib/render-markdown.ts`, `src/lib/content/highlight.ts`, `src/lib/mermaid.ts` |
| Content storage | Markdown source files plus JSON topic registry; generated static manifest and search index | `content/`, `content.config.json`, `scripts/sync-content.mjs` |
| Browser persistence | `localStorage` for theme, per-topic progress and last-read location | `src/lib/progress.ts` |
| Optional server persistence | Node HTTP API + PostgreSQL for solution scratchpads | `server/api.mjs`, `server/db.mjs` |
| Other UI-relevant integrations | Google-hosted IBM Plex Sans/Mono, Web Speech API/audio playback, downloadable original guide files | root route, `src/lib/speech.ts`, reader |

There is no installed component-library dependency such as shadcn/ui, Radix, MUI, or Chakra. Components are custom and styled with Tailwind/global CSS.

## 2. Project structure and important files

```text
StudyGuide/
├── content.config.json                 topic registry (8 subjects)
├── content/                            editable source notes
├── public/content/                     generated, runtime-served copies + manifest/index
├── src/
│   ├── routes/                         `/` and `/topic/$topicSlug`
│   ├── components/                     app shell, dashboard, reader, navigation, search
│   ├── lib/                            content parsing, rendering, nav, progress, theme, solutions
│   └── styles.css                      global design tokens and prose/code styles
├── scripts/sync-content.mjs            Markdown/HTML → runtime manifest and search index
├── server/                             optional solutions API and PostgreSQL access
└── public/audio/english/               pronunciation audio assets
```

Key presentation files likely to change in a redesign:

- `src/styles.css` — tokens, global prose, code, Markdown tables, Mermaid and responsive styles.
- `src/components/app-header.tsx` — fixed application header, subject switcher, theme/search controls.
- `src/components/home-dashboard.tsx` — dashboard hierarchy, cards and progress summary.
- `src/components/topic-reader.tsx` — three-column reader shell, mobile controls and pagination.
- `src/components/nav-sidebar.tsx`, `table-of-contents.tsx`, `global-search.tsx` — navigation and discovery patterns.
- `src/components/solution-editor.tsx` — in-reader scratchpad.
- `src/components/topic-icon.tsx` and `src/lib/app-config.ts` — brand/icon presentation.

The redesign should **not** need to alter `content/`, `content.config.json`, `scripts/sync-content.mjs`, the route URLs, manifest schema, or progress keys.

## 3. Content, state, and navigation flow

### Content source — verified

`content.config.json` registers eight subjects: Graphs 53, Binary Search, Sliding Window, SQL Handbook, Contract Testing, Stack & Queue, English Grammar and Java Interview Handbook. Source notes live in `content/<slug>/` as Markdown (one HTML source remains for sliding-window import history). `npm run sync` copies configured Markdown/HTML into `public/content/`, creates `manifest.json` (topic/chapter/page metadata), and creates `index.json` (search titles). The client fetches these static assets; it does not fetch notes from a database or external content API.

Two content models are actively configured:

- `markdown-doc`: one large Markdown file parsed at headings into navigable sections, normally numbered problems/lessons.
- `markdown-book`: a folder of Markdown pages grouped by chapter directories.

`html-doc` is supported by the reader (sandboxed iframe) but is **not currently registered** in `content.config.json`.

### State and persistence — verified

- Studied IDs are saved per topic in `study-hub:studied:v2` in `localStorage`.
- Last visited unit/page is saved per topic in `study-hub:last-page:v2`; the dashboard uses this for “Pick up where you left off.”
- Theme is persisted in `study-hub:theme`, defaults to system preference, and migrates legacy Graphs-only keys.
- Personal solutions are separate from study progress: one Postgres record per topic/unit/language. The reader remains usable if that API is offline.

### Navigation flow — verified

```text
Dashboard (/)
  ├─ subject card / subject switcher ──> Reader (/topic/:slug?p=:unit)
  ├─ recent card ─────────────────────> remembered reader location
  └─ ⌘K / Ctrl+K global search ───────> page or matching document section

Reader
  ├─ left contents/filter ────────────> active page/section
  ├─ right “On this page” TOC ────────> article heading
  ├─ previous/next or j/k/arrow keys ─> adjacent unit
  └─ mark studied / solution editor ──> localStorage / optional PostgreSQL
```

## 4. Page inventory, appearance, and behaviour

### A. Dashboard — `/`

**Verified screenshots:** [desktop](audit-screenshots/home-desktop.png) · [mobile](audit-screenshots/home-mobile.png)

At desktop, a 56 px global header sits above a paper-toned dashboard. Content is constrained to `max-w-5xl` (about 1,024 px) with 32 px horizontal and 56 px vertical padding at `sm+`. The top area has the 36–40 px “Study Hub” title, a muted descriptive paragraph, an outlined global-search button, then three compact metrics. Topic cards form a two-column grid. Each card has a rounded 12 px border, 20 px padding, subject icon, title/subtitle, description, type/count meta row, thin progress bar and study count. A “resume” row appears only after prior reading exists.

At mobile, the same header condenses: the tagline and text “Search” label disappear, while the brand, subject switcher, icon-only search, and theme control remain. The dashboard becomes one column with 20 px side padding. The search CTA wraps its label into two lines. Cards remain readable, but the captured view shows a horizontal scrollbar/overflow at the bottom — a verified layout defect.

**Behaviour:** subject cards and resume cards route to the shared reader. Counts and progress derive from the generated manifest plus `localStorage`; global search opens the palette. The dashboard body independently scrolls under the fixed-height shell.

### B. Guide reader — split `markdown-doc` (Graphs 53 example)

**Verified screenshots:** [desktop](audit-screenshots/graphs-desktop.png) · [mobile](audit-screenshots/graphs-mobile.png)

Desktop is a three-pane reading workspace below the global 56 px header and a second 56 px reader toolbar. The left navigation is 288 px at `lg`, 320 px at `xl`; it has a sticky content-filter input, collapsible uppercase groups with per-group progress, active-row tint/accent bar, and circular completion controls. The main article has 48 px desktop side padding and an ~80ch reading measure. The right “On this page” rail is 240 px at `xl` (256 px at `2xl`), with heading-depth indentation and active blue rule.

The article begins with an uppercase unit label and a right-aligned “Mark studied” button, followed by rendered Markdown. The live sample shows a 30 px H1, 19 px H3, 17 px body copy at 1.72 line height, inline monospace chips, bullets and bordered code blocks. Previous/next cards appear below the article. The visible header presents breadcrumbs, global progress and a download action.

Mobile removes the desktop rails. It adds a contents hamburger in the reader toolbar and an on-page-TOC button where applicable; the left contents becomes a fixed overlay drawer with a backdrop. The reading column uses 16 px side padding. Breadcrumbs intentionally collapse to topic-level; the screenshots show the article is readable, although long inline-code examples wrap quite aggressively.

**Behaviour:** sidebar filter `/` shortcut, `j`/`k` and left/right movement, group collapsing, URL-addressable `?p=`, global search jump via `?q=`, code-copy controls, Mermaid rendering, optional pronunciation controls, downloadable source, progress marking, and an optional per-unit solution editor.

### C. Handbook reader — multi-page `markdown-book` (SQL example)

**Verified screenshots:** [desktop](audit-screenshots/sql-desktop.png) · [mobile](audit-screenshots/sql-mobile.png)

This uses the same reader shell and responsive breakpoints as the guide reader, proving the layout is shared rather than subject-specific. Its left rail groups individual files into numbered chapters (“01 · Fundamentals”), marks every page trackable, and shows 0/8-style chapter progress. The main heading is the page’s H1; the SQL sample begins with a Markdown Table of Contents and a very long right rail. Desktop retains all three panes; mobile retains the compact reader toolbar and single reading column.

**Behaviour:** selecting a file updates `?p=<chapter/page>`, page-relative Markdown links are rewritten to in-app routes, and progress applies to pages rather than parsed problems.

### D. Search, topic menu, theme, and states

**Verified in source; search/modal/menu visuals inferred from component styles, not separately screenshot-captured.**

- The global search palette is an overlay with a dimmed backdrop, 640 px max width, title-only matching, keyboard cursor/Enter support, topic labels, result cap of 40, and topic-diversification logic.
- The subject switcher is an anchored 288 px menu, with the current subject tinted and topic subtitle visible. It closes on outside press or Escape.
- Light/dark mode swaps the same semantic CSS variables under `html.dark`; no per-component dark branches are needed.
- Error/empty states exist for unavailable content, unknown topic, no sidebar matches, no search matches and unavailable solution storage.

## 5. Component inventory

| Component | Responsibility |
| --- | --- |
| `AppShell` / `app-header` | full-height frame, brand, topic picker, global search trigger, theme toggle |
| `HomeDashboard` | subject discovery, progress totals, resume cards, subject cards |
| `TopicReader` | responsive reader layout and article interactions |
| `NavSidebar` | chapter/section navigation, filter, group collapse and completion indicators |
| `TableOfContents` | right rail / mobile disclosure for article headings |
| `GlobalSearch` | cross-topic command palette |
| `SolutionEditor` | optional language-specific solution scratchpad |
| `TopicIcon` | subject icon mapping |

Reusable logic includes `useTopicNav`, content manifest fetchers, Markdown document parser, Markdown renderer/highlighter, Mermaid renderer, article TOC observer, theme hook, progress store, solution API cache, and speech helpers.

## 6. Existing functionality that must be preserved

- All current content and the config-driven ability to add subjects without UI code changes.
- Both Markdown content models, link rewriting, heading parsing, Mermaid, syntax-highlighted code, copy buttons, details disclosures, and audio/speech where authored.
- `/` and `/topic/:topicSlug` URLs; `?p=` deep links and `?q=` search jumps.
- Subject switcher, global search, local sidebar filtering, collapsible groups, breadcrumbs, in-page TOC, download, previous/next navigation and keyboard shortcuts.
- Dark/light/system theme handling and reduced-motion support.
- Study progress, last-read/resume behaviour, legacy migration, and resilient offline behaviour when storage/API is unavailable.
- Solution editor semantics: language choice, explicit save, Cmd/Ctrl+S, delete/revert and unsaved-work warning.

## 7. Current design system

### Tokens — verified

| Token category | Light values / pattern | Dark counterpart |
| --- | --- | --- |
| Backgrounds | `#faf9f6` page; `#fff` surface; `#f2f0eb` raised/active | `#1b1b17`, `#222320`, `#2a2b26` |
| Type | `#22201c` foreground, `#5c584f` muted, `#6f6a5f` faint | `#d9d6cc`, `#a8a498`, `#8a867b` |
| Interaction | navy `#33445a` primary; blue `#2e5a8c` accent/focus ring family | pale blue-grey primary/accent |
| Borders | `#e6e2d8`, strong `#d3cdbf` | `#34352f`, strong `#46473f` |
| Fonts | IBM Plex Sans; IBM Plex Mono for code | same |
| Radii | 4, 6, 8, 12, 16 px | same |
| Shadows | restrained, with 1–3 px and 6/20 px levels; menu has 16/44 px | darker equivalents |

The palette is deliberately warm, restrained and low-glare. Most controls are bordered rather than heavily elevated. Default control height is 44 px (`h-11`); reader utility controls are often 36 px.

### Typography and content pattern — verified

- Dashboard title: 30–36 px depending on breakpoint; card titles around 16 px.
- Reading prose: 17 px, 1.72 line height, max 80ch (88ch above 1700 px).
- Article H1/H2/H3: 30/23/19 px, semibold, tight 1.28 leading; H2 sections add a top divider.
- Prose has styled links, inline code, blockquotes, details panels, tables, code blocks, headings and selection state.
- Code blocks have a 36 px language/copy header, 12 px-ish mono text, border, warm code surface, and horizontal overflow handling.

## 8. Responsive behaviour

| Width | Dashboard | Reader |
| --- | --- | --- |
| `<640 px` | one-column cards; header labels/tagline selectively hidden | rails hidden; menu/TOC actions appear; contents drawer overlays; 16 px article padding |
| `≥640 px` | two-card grid; wider page padding | main reading padding increases to 32 px |
| `≥1024 px` (`lg`) | unchanged grid | persistent left rail (288 px); main article gets 40 px sides |
| `≥1280 px` (`xl`) | unchanged | right TOC rail appears (240 px); left rail becomes 320 px |
| `≥1536 px` (`2xl`) | unchanged | right TOC reaches 256 px |

Reader panes scroll independently (`overscroll-contain`) within a full viewport-height shell. Side-rail filters and right TOC use sticky positioning. The dashboard is independently scrollable. Smooth scrolling respects `prefers-reduced-motion`.

## 9. UX and usability findings

Priority is an audit recommendation, not an implementation request.

1. **P0 — verified mobile horizontal overflow.** The live 390 px dashboard screenshot has a horizontal scrollbar. This should be fixed before a visual redesign because it affects core browsing and may hide card edges/content.
2. **P1 — navigation density becomes cognitively heavy for large handbooks.** SQL presents a long multi-chapter rail plus a very long on-page TOC. Both are technically usable but lack progressive wayfinding such as current chapter context, compact section counts, or an explicit reading position.
3. **P1 — discovery is mostly title-based.** Global search ranks titles, and sidebar filter searches page/section metadata. It does not search note body text, snippets, tags, difficulty, status or topic relationships.
4. **P1 — the dashboard communicates quantity better than a learning plan.** “Subjects / total items / ticked off” is clear but does not tell a learner what to do next, estimate effort, expose recently added material, or differentiate a handbook from a problem track strongly.
5. **P1 — mobile reader action discoverability is low.** Essential navigation is behind small icon-only buttons (menu and TOC); keyboard shortcuts are desktop-forward. Provide more visible contextual labels/onboarding or a persistent chapter affordance.
6. **P2 — reader header has dense, competing information.** Breadcrumbs, global progress and download all fit desktop but reduce available title space and make hierarchy less immediate; the current page title is hidden below `md`.
7. **P2 — progress semantics may be ambiguous.** A hollow/check circle appears beside navigation rows, while the actual action is “Mark studied.” The app needs clearer language around completion versus review/read status, especially for reference pages.
8. **P2 — visual hierarchy is consistently safe but under-expressive.** The warm editorial system is coherent, but subject cards and reader controls have nearly identical visual weight. Topic identity, learning state and different content types could be distinguished without losing restraint.

## 10. Accessibility and performance concerns

### Existing positive measures — verified

- Semantic `button`, `nav`, `main`, `aside`, `article`, labels, `aria-expanded`, `aria-current`, `aria-label` and keyboard controls are broadly present.
- Custom focus-visible ring is defined; controls mostly meet a 44 px target.
- Light and dark palettes use high-contrast foreground/muted text intent; reduced motion is explicitly respected.
- Reader content is constrained for line length; code supports copying and horizontal overflow.
- Content and search manifests are fetched and cached; notes are loaded on demand rather than bundled into the app JS.

### Concerns — source-verified or screenshot-verified as labelled

- **Source-verified:** the topic switcher uses `role="menu"`, but its links do not implement roving focus, arrow-key navigation, or full menu keyboard semantics. Either implement the menu pattern fully or use a simpler listbox/disclosure pattern.
- **Source-verified:** icon-only controls rely on accessible names, which is good, but mobile users do not get visible labels for menu/TOC/download actions.
- **Source-verified:** content rendering uses `dangerouslySetInnerHTML`; trust boundaries depend on the custom renderer/sanitisation path. Preserve and explicitly test sanitisation whenever Markdown rendering changes.
- **Screenshot-verified:** the mobile dashboard horizontal overflow is also an accessibility/navigation issue.
- **Source-verified:** Google fonts are render-critical external requests. Consider self-hosting or robust font-display/fallback treatment for offline and performance-sensitive environments.
- **Source-verified:** substantial Markdown files are parsed client-side when opened; high-content subjects and Mermaid rendering can create input/render cost on lower-powered devices. Benchmark before adding heavier effects.
- **Audit limitation:** automated accessibility testing, colour contrast measurement on every component state, keyboard-only live test passes, screen-reader testing, and performance profiling were not run in this audit.

## 11. Screenshot evidence

All files were captured from the locally running application after client content loaded.

| Screen/template | 1440 × 900 | 390 × 844 |
| --- | --- | --- |
| Dashboard | [home-desktop.png](audit-screenshots/home-desktop.png) | [home-mobile.png](audit-screenshots/home-mobile.png) |
| Split guide reader (Graphs) | [graphs-desktop.png](audit-screenshots/graphs-desktop.png) | [graphs-mobile.png](audit-screenshots/graphs-mobile.png) |
| Handbook reader (SQL) | [sql-desktop.png](audit-screenshots/sql-desktop.png) | [sql-mobile.png](audit-screenshots/sql-mobile.png) |

These cover every existing route/template. The subject-specific content varies, but the application uses the same dashboard and shared reader composition for all configured subjects.

## 12. Redesign directions (proposal only)

### Direction 1 — Editorial technical library (recommended)

Keep the current warm, focused “paper and ink” foundation, but give it sharper hierarchy: a clearer active-learning panel, stronger typography scale, chapter markers, cleaner reader chrome, quiet subject colour accents, and a library-style discovery surface. It best preserves the existing tone and supports long-form study without visual fatigue.

### Direction 2 — Progress-led learning workspace

Make the dashboard a learner’s operating system: continue queue, weekly goal, quick filters, subject progress maps, recently studied/review due, and a compact activity timeline. The reader retains a calmer prose view but adds a contextual progress strip. This direction is strongest if the app’s main job is routine and completion rather than reference.

### Direction 3 — Developer notebook / knowledge graph

Use a darker, more tool-like language with stronger code emphasis, tags, relationships, “related concepts,” pattern maps and problem metadata. It suits DSA and backend-interview material, but needs disciplined information design so Java/SQL/English content does not feel like an IDE.

## 13. Recommended improvements, ordered

1. Fix the verified 390 px dashboard horizontal overflow and establish viewport regression checks.
2. Adopt semantic spacing/type/interaction tokens on top of the existing palette; preserve high-contrast light/dark themes and the 80ch reading measure.
3. Simplify reader chrome: show the current chapter/page decisively, move secondary utilities into a predictable overflow or contextual toolbar, and retain deep links.
4. Upgrade mobile navigation with a labelled, focus-managed contents sheet and a clearer in-page outline entry point.
5. Evolve the dashboard into “continue, next, browse”: resume first, then topic progress and curated discovery; use topic type/pattern metadata rather than only counts.
6. Improve large-handbook wayfinding: chapter progress, current-position indicator, collapsible TOC depth, and reading-time/page-count context.
7. Improve code learning: persistent language labels, wrap/scroll preference, copy confirmation, optional line numbers, and consistent code-callout patterns—without changing source Markdown.
8. Expand discovery carefully: full-text indexing/snippets, filters by topic/type/chapter/status, and related content. Preserve existing title search and URL search-jump behaviour.
9. Clarify study state from simple “studied” into a consistently named, reversible status while retaining existing localStorage migration/data.
10. Add visual regression, keyboard, screen-reader and performance checks before and during implementation.

## Approval gate

No redesign has been implemented. The recommended next step is to select one design direction (Direction 1 is the best fit for the current product), agree the scope of the P0/P1 improvements, and then implement presentation changes while preserving the functionality listed above.

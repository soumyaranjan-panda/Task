import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Moon, c as ChevronRight, d as BookOpen, i as Search, l as ChevronLeft, o as List, r as Sun, s as Download, t as X, u as Check } from "../_libs/lucide-react.mjs";
import { t as k } from "../_libs/marked.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BKUeTdhu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function slugify(input) {
	return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}
function partForNumber(n) {
	if (n <= 0) return "Foundation";
	if (n <= 6) return "A · Traversal";
	if (n <= 20) return "B · BFS / DFS";
	if (n <= 27) return "C · Topo";
	if (n <= 40) return "D · Shortest Path";
	if (n <= 50) return "E · MST / DSU";
	if (n <= 53) return "F · Tarjan / SCC";
	return "Summary";
}
function isSectionHeading(line) {
	return (/^# /.test(line) || /^## /.test(line)) && !/^###/.test(line);
}
function parseGuide(raw) {
	const lines = raw.replace(/\r\n/g, "\n").split("\n");
	const title = (lines[0] ?? "").replace(/^#\s+/, "").trim() || "Graphs — 53 Problems Study Guide (Java)";
	const headingAt = [];
	for (let i = 1; i < lines.length; i++) if (isSectionHeading(lines[i] ?? "")) headingAt.push(i);
	const intro = {
		id: "intro",
		level: 1,
		number: null,
		title: "How to read this",
		part: "Start",
		markdown: `# ${title}\n\n${lines.slice(1, headingAt[0] ?? lines.length).join("\n").trim()}`,
		searchable: `how to read this\n${title}`.toLowerCase()
	};
	let activePart = "Foundation";
	const sections = [];
	for (let h = 0; h < headingAt.length; h++) {
		const start = headingAt[h];
		const end = headingAt[h + 1] ?? lines.length;
		const headingLine = lines[start] ?? "";
		const level = headingLine.startsWith("## ") ? 2 : 1;
		const heading = headingLine.replace(/^##?\s+/, "").trim();
		if (heading.startsWith("Graphs —")) continue;
		const numMatch = heading.match(/^(\d+)\.\s+(.*)$/);
		const number = numMatch ? Number(numMatch[1]) : null;
		if (level === 1) {
			if (heading.startsWith("PART ")) activePart = heading.replace(/^PART\s+/, "").replace(/\s+—.*$/, "");
			else if (heading.startsWith("Final Summary")) activePart = "Summary";
		}
		const part = number !== null ? partForNumber(number) : activePart;
		const id = number !== null ? `p-${number}` : slugify(heading) || `s-${start}`;
		const markdown = lines.slice(start, end).join("\n").trim();
		sections.push({
			id,
			level,
			number,
			title: heading,
			part,
			markdown,
			searchable: heading.toLowerCase()
		});
	}
	return {
		title,
		intro,
		sections
	};
}
function filterSections(sections, query) {
	const q = query.trim().toLowerCase();
	if (!q) return new Set(sections.map((s) => s.id));
	const hit = /* @__PURE__ */ new Set();
	for (const s of sections) if (s.searchable.includes(q)) hit.add(s.id);
	return hit;
}
function escapeHtml(s) {
	return s.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split("\"").join("&quot;");
}
var JAVA_KEYWORDS = /* @__PURE__ */ new Set([
	"abstract",
	"assert",
	"boolean",
	"break",
	"byte",
	"case",
	"catch",
	"class",
	"const",
	"continue",
	"default",
	"do",
	"double",
	"else",
	"enum",
	"extends",
	"final",
	"finally",
	"float",
	"for",
	"if",
	"implements",
	"import",
	"instanceof",
	"int",
	"interface",
	"long",
	"new",
	"package",
	"private",
	"protected",
	"public",
	"return",
	"short",
	"static",
	"super",
	"switch",
	"this",
	"throw",
	"throws",
	"try",
	"void",
	"while",
	"true",
	"false",
	"null",
	"var",
	"record"
]);
var JAVA_TYPES = /* @__PURE__ */ new Set([
	"String",
	"Integer",
	"List",
	"ArrayList",
	"ArrayDeque",
	"PriorityQueue",
	"TreeSet",
	"HashSet",
	"HashMap",
	"Map",
	"Set",
	"Arrays",
	"Math",
	"Comparator",
	"Objects",
	"StringBuilder",
	"Optional",
	"DisjointSet"
]);
function highlightFence(code, lang) {
	if (lang !== "java") return escapeHtml(code);
	return highlightJava(code);
}
function highlightJava(src) {
	const out = [];
	let i = 0;
	const n = src.length;
	const flushIdent = (start, end) => {
		const ident = src.slice(start, end);
		const esc = escapeHtml(ident);
		if (JAVA_KEYWORDS.has(ident)) out.push(`<span class="kw">${esc}</span>`);
		else if (JAVA_TYPES.has(ident)) out.push(`<span class="typ">${esc}</span>`);
		else out.push(esc);
	};
	while (i < n) {
		const ch = src[i];
		const next = src[i + 1];
		if (ch === "/" && next === "/") {
			const end = src.indexOf("\n", i);
			const stop = end === -1 ? n : end;
			out.push(`<span class="cmt">${escapeHtml(src.slice(i, stop))}</span>`);
			i = stop;
			continue;
		}
		if (ch === "/" && next === "*") {
			const end = src.indexOf("*/", i + 2);
			const stop = end === -1 ? n : end + 2;
			out.push(`<span class="cmt">${escapeHtml(src.slice(i, stop))}</span>`);
			i = stop;
			continue;
		}
		if (ch === "\"" || ch === "'") {
			const quote = ch;
			let j = i + 1;
			while (j < n) {
				if (src[j] === "\\") {
					j += 2;
					continue;
				}
				if (src[j] === quote) {
					j += 1;
					break;
				}
				j += 1;
			}
			out.push(`<span class="str">${escapeHtml(src.slice(i, j))}</span>`);
			i = j;
			continue;
		}
		if (/[A-Za-z_]/.test(ch)) {
			let j = i + 1;
			while (j < n && /[A-Za-z0-9_]/.test(src[j])) j += 1;
			flushIdent(i, j);
			i = j;
			continue;
		}
		out.push(escapeHtml(ch));
		i += 1;
	}
	return out.join("");
}
var KEY = "graphs53-studied";
var THEME_KEY = "graphs53-theme";
function loadStudied() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return /* @__PURE__ */ new Set();
		const arr = JSON.parse(raw);
		if (!Array.isArray(arr)) return /* @__PURE__ */ new Set();
		return new Set(arr.filter((x) => typeof x === "string"));
	} catch {
		return /* @__PURE__ */ new Set();
	}
}
function saveStudied(ids) {
	localStorage.setItem(KEY, JSON.stringify([...ids]));
}
function loadTheme() {
	try {
		const v = localStorage.getItem(THEME_KEY);
		if (v === "dark" || v === "light") return v;
	} catch {}
	if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
	return "light";
}
function saveTheme(theme) {
	localStorage.setItem(THEME_KEY, theme);
}
k.use({
	renderer: { code({ text, lang }) {
		const langSafe = (lang ?? "text").replace(/[^a-z0-9+-]/gi, "");
		return `<pre class="code-block" data-lang="${langSafe}"><code>${highlightFence(text, langSafe)}</code></pre>`;
	} },
	gfm: true,
	breaks: false
});
function renderMarkdown(md) {
	return k.parse(md, { async: false });
}
function applyTheme(theme) {
	document.documentElement.classList.toggle("dark", theme === "dark");
}
function GuideReader() {
	const [guide, setGuide] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [activeId, setActiveId] = (0, import_react.useState)("intro");
	const [query, setQuery] = (0, import_react.useState)("");
	const [studied, setStudied] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [theme, setTheme] = (0, import_react.useState)("light");
	const [navOpen, setNavOpen] = (0, import_react.useState)(false);
	const searchRef = (0, import_react.useRef)(null);
	const articleRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const t = loadTheme();
		setTheme(t);
		applyTheme(t);
		setStudied(loadStudied());
		fetch("/guide.md").then((r) => {
			if (!r.ok) throw new Error(`Could not load the guide (${r.status}).`);
			return r.text();
		}).then((text) => {
			const parsed = parseGuide(text);
			setGuide(parsed);
		}).catch((e) => setError(e instanceof Error ? e.message : "Failed to load guide."));
	}, []);
	const allSections = (0, import_react.useMemo)(() => {
		if (!guide) return [];
		return [guide.intro, ...guide.sections];
	}, [guide]);
	const readable = (0, import_react.useMemo)(() => allSections.filter((s) => s.level === 2 || s.id === "intro" || s.title.startsWith("Final Summary") || s.title.startsWith("PART ")), [allSections]);
	const hits = (0, import_react.useMemo)(() => filterSections(allSections, query), [allSections, query]);
	const active = allSections.find((s) => s.id === activeId) ?? allSections[0];
	const studiedCount = (0, import_react.useMemo)(() => allSections.filter((s) => s.number !== null && s.number >= 1), [allSections]).filter((s) => studied.has(s.id)).length;
	const readableIds = (0, import_react.useMemo)(() => readable.map((s) => s.id), [readable]);
	const go = (0, import_react.useCallback)((id) => {
		setActiveId(id);
		setNavOpen(false);
		articleRef.current?.scrollTo({ top: 0 });
	}, []);
	const step = (0, import_react.useCallback)((dir) => {
		const idx = readableIds.indexOf(activeId);
		const next = readableIds[idx + dir];
		if (next) go(next);
	}, [
		activeId,
		go,
		readableIds
	]);
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			const tag = e.target?.tagName;
			const typing = tag === "INPUT" || tag === "TEXTAREA";
			if (e.key === "/" && !typing) {
				e.preventDefault();
				searchRef.current?.focus();
				return;
			}
			if (e.key === "Escape") {
				setNavOpen(false);
				e.target?.blur?.();
				return;
			}
			if (typing) return;
			if (e.key === "j" || e.key === "ArrowRight") step(1);
			if (e.key === "k" || e.key === "ArrowLeft") step(-1);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [step]);
	const toggleStudied = (id) => {
		setStudied((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			saveStudied(next);
			return next;
		});
	};
	const toggleTheme = () => {
		const next = theme === "dark" ? "light" : "dark";
		setTheme(next);
		saveTheme(next);
		applyTheme(next);
	};
	const html = (0, import_react.useMemo)(() => active ? renderMarkdown(active.markdown) : "", [active]);
	if (error) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-dvh grid place-items-center p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted max-w-md text-center",
			children: error
		})
	});
	if (!guide || !active) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-dvh grid place-items-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted text-sm tracking-wide",
			children: "Loading the 53-problem guide…"
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg flex flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-sm",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3 px-3 sm:px-5 h-14",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "lg:hidden size-11 grid place-items-center rounded-md hover:bg-surface-2",
						"aria-label": navOpen ? "Close contents" : "Open contents",
						onClick: () => setNavOpen((v) => !v),
						children: navOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 20 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, { size: 20 })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, {
							size: 18,
							className: "shrink-0 text-primary"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium truncate leading-tight",
								children: "Graphs 53"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] text-muted truncate leading-tight hidden sm:block",
								children: "Striver A2Z · Java study guide"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex items-center gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "hidden sm:inline text-xs text-muted tabular-nums pr-2",
								children: [studiedCount, "/53 studied"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "/Graphs_53_Problems_StudyGuide.md",
								download: "Graphs_53_Problems_StudyGuide.md",
								className: "size-11 grid place-items-center rounded-md hover:bg-surface-2 text-muted",
								"aria-label": "Download Markdown",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { size: 18 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "size-11 grid place-items-center rounded-md hover:bg-surface-2 text-muted",
								onClick: toggleTheme,
								"aria-label": theme === "dark" ? "Switch to light" : "Switch to dark",
								children: theme === "dark" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { size: 18 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { size: 18 })
							})
						]
					})
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-1 min-h-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
					className: [
						"bg-surface border-r border-border",
						"fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] pt-14 flex-col",
						"lg:static lg:flex lg:w-72 xl:w-80 lg:pt-0 lg:max-w-none shrink-0",
						navOpen ? "flex" : "hidden lg:flex"
					].join(" "),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
						className: "h-[calc(100dvh-3.5rem)] lg:h-[calc(100dvh-3.5rem)] overflow-y-auto px-3 pb-8",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "sticky top-0 bg-surface pt-3 pb-2 block z-10",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "sr-only",
								children: "Search"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "relative flex items-center",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
									size: 14,
									className: "absolute left-3 text-faint"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: searchRef,
									value: query,
									onChange: (e) => setQuery(e.target.value),
									placeholder: "Search problems  /",
									className: "w-full h-11 pl-9 pr-3 rounded-md bg-bg border border-border text-sm placeholder:text-faint"
								})]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarList, {
							sections: allSections,
							hits,
							activeId,
							studied,
							querying: query.trim().length > 0,
							onSelect: go
						})]
					})
				}),
				navOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "fixed inset-0 z-30 bg-fg/30 lg:hidden",
					"aria-label": "Close contents",
					onClick: () => setNavOpen(false)
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "flex-1 min-w-0 flex flex-col",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						ref: articleRef,
						className: "flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-8",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-3 max-w-[72ch] mb-6",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-[11px] uppercase tracking-[0.14em] text-muted font-medium",
									children: [active.part, active.number !== null ? ` · Problem ${active.number}` : ""]
								}) }), active.number !== null && active.number >= 1 && active.number <= 53 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => toggleStudied(active.id),
									className: ["h-11 px-3 rounded-md border text-sm inline-flex items-center gap-2", studied.has(active.id) ? "bg-primary text-primary-fg border-primary" : "bg-surface border-border text-muted hover:text-fg"].join(" "),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { size: 16 }), studied.has(active.id) ? "Studied" : "Mark studied"]
								}) : null]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "prose",
								dangerouslySetInnerHTML: { __html: html }
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "max-w-[72ch] mt-12 mb-8 flex items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => step(-1),
									className: "h-11 px-3 rounded-md border border-border bg-surface text-sm inline-flex items-center gap-1 hover:bg-surface-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { size: 16 }), "Previous"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => step(1),
									className: "h-11 px-3 rounded-md border border-border bg-surface text-sm inline-flex items-center gap-1 hover:bg-surface-2",
									children: ["Next", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { size: 16 })]
								})]
							})
						]
					})
				})
			]
		})]
	});
}
function SidebarList({ sections, hits, activeId, studied, querying, onSelect }) {
	let lastPart = "";
	const rows = [];
	for (const s of sections) {
		if (querying && !hits.has(s.id) && s.level === 2) continue;
		if (s.level === 1 && s.id !== "intro") {
			if (querying && !hits.has(s.id) && !sections.some((x) => x.part === s.part && hits.has(x.id))) continue;
			lastPart = s.part;
			rows.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => onSelect(s.id),
				className: ["mt-4 mb-1 w-full text-left px-2 py-2 rounded-sm text-[11px] uppercase tracking-[0.14em] font-medium", activeId === s.id ? "text-fg" : "text-muted hover:text-fg"].join(" "),
				children: s.title.replace(/^PART\s+/, "Part ")
			}, s.id));
			continue;
		}
		const n = s.number;
		const label = n !== null ? `${n}. ${s.title.replace(/^\d+\.\s+/, "")}` : s.id === "intro" ? "How to read this" : s.title;
		rows.push(/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => onSelect(s.id),
			className: ["w-full text-left rounded-md px-2.5 py-2 text-[13px] leading-snug flex items-start gap-2 min-h-11", activeId === s.id ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/70 hover:text-fg"].join(" "),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: ["mt-0.5 size-4 shrink-0 rounded-full border grid place-items-center", studied.has(s.id) ? "bg-primary border-primary text-primary-fg" : "border-border"].join(" "),
				"aria-hidden": true,
				children: studied.has(s.id) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
					size: 10,
					strokeWidth: 3
				}) : null
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block truncate",
					children: label
				}), n !== null && lastPart ? null : null]
			})]
		}, s.id));
	}
	if (querying && rows.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted px-2 py-6",
		children: "No matching sections."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-col gap-0.5",
		children: rows
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GuideReader, {});
}
//#endregion
export { Home as component };

#!/usr/bin/env node
/**
 * Convert a self-contained HTML notes page into markdown.
 *
 * Aimed at the hand-made notes that use the `hero` / `pattern-card` / `card`
 * layout (e.g. DSA/sliding-window-notes.html): patterns, problem cards with one
 * tab per language, idea, steps, complexity and links. The result is an ordinary
 * markdown file that `content.config.json` can register like any other topic, so
 * the app renders it with its own navigation, search and progress.
 *
 * Headless Chrome does the extraction, so entities, nesting and code indentation
 * survive intact.
 *
 * Usage: node scripts/import-html.mjs <input.html> <output.md>
 */

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node scripts/import-html.mjs <input.html> <output.md>");
  process.exit(1);
}

const PORT = 9411;

/** Runs inside the page; returns markdown for the notes layout. */
function convert() {
  const clean = (value) => (value || "").replace(/\u00a0/g, " ").trim();
  const squish = (value) =>
    clean(value)
      .replace(/\s*\n\s*/g, " ")
      .replace(/\s{2,}/g, " ");

  /** Inline element tree -> markdown, keeping code/bold/links intact. */
  function inline(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent.replace(/\s+/g, " ");
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const kids = () => [...node.childNodes].map(inline).join("");
    const tag = node.tagName;
    if (tag === "SVG" || tag === "SCRIPT" || tag === "STYLE") return "";
    if (tag === "B" || tag === "STRONG") return `**${squish(kids())}**`;
    if (tag === "I" || tag === "EM") return `*${squish(kids())}*`;
    if (tag === "CODE") return `\`${clean(node.textContent)}\``;
    if (tag === "BR") return "\n";
    if (tag === "A") return `[${squish(kids())}](${node.getAttribute("href")})`;
    return kids();
  }

  const inlineOf = (selector, scope) => {
    const el = (scope || document).querySelector(selector);
    return el ? squish(inline(el)) : "";
  };

  /** Fenced blocks from tabbed panels, keyed by `code[data-lang]`. */
  function codeBlocks(scope) {
    const blocks = [];
    for (const code of scope.querySelectorAll("pre code[data-lang]")) {
      const body = code.textContent.replace(/\s+$/, "");
      if (body) blocks.push({ lang: code.getAttribute("data-lang").trim(), body });
    }
    return blocks;
  }

  const emitBlocks = (blocks) =>
    blocks.map((b) => "```" + b.lang + "\n" + b.body + "\n```").join("\n\n");

  const out = [];

  /* ------------------------------------------------------------------ intro */
  const eyebrow = document.querySelector(".eyebrow");
  const sub = document.querySelector(".sub");
  const stats = [...document.querySelectorAll(".hero-stats .stat")].map((stat) => ({
    k: clean(stat.querySelector(".k")?.textContent),
    l: clean(stat.querySelector(".l")?.textContent),
  }));

  out.push(`# ${inlineOf("h1")}`, "");
  if (eyebrow) out.push(`**${squish(inline(eyebrow))}**`, "");
  if (sub) out.push(inlineOf(".sub"), "");
  if (stats.length > 0) {
    out.push(
      `| ${stats.map((s) => s.l).join(" | ")} |`,
      `| ${stats.map(() => "---").join(" | ")} |`,
      `| ${stats.map((s) => s.k).join(" | ")} |`,
      "",
    );
  }

  /* ---------------------------------------------------------------- patterns */
  const patterns = [...document.querySelectorAll(".pattern-card")];
  if (patterns.length > 0) {
    out.push("# PART 1 — Patterns", "");
    for (const card of patterns) {
      const letter = clean(card.querySelector(".p-num")?.textContent);
      out.push(`## ${letter ? `Pattern ${letter} — ` : ""}${inlineOf("h3", card)}`, "");
      const body = inlineOf("p", card);
      if (body) out.push(body, "");
      const blocks = codeBlocks(card);
      if (blocks.length > 0) out.push(emitBlocks(blocks), "");
      const applies = inlineOf(".for", card);
      if (applies) out.push(`*Applies to: ${applies}*`, "");
    }
  }

  /* ------------------------------------------------------------------- hints */
  const hints = document.querySelector(".hints");
  if (hints) out.push(`> ${squish(inline(hints))}`, "");

  /* ---------------------------------------------------------------- problems */
  const cards = [...document.querySelectorAll("article.card")];
  if (cards.length > 0) {
    out.push("# PART 2 — Problems", "");
    for (const card of cards) {
      const num = clean(card.querySelector(".num")?.textContent);
      out.push(`## ${num ? `${num}. ` : ""}${inlineOf(".card-title", card)}`, "");

      const diff = clean(card.querySelector(".badge:not(.tuf)")?.textContent);
      const chips = [...card.querySelectorAll(".chip")].map((c) => clean(c.textContent));
      // Label from the anchor's own children, otherwise the link nests in itself.
      const links = [...card.querySelectorAll(".links a")]
        .map((a) => {
          const label =
            squish([...a.childNodes].map(inline).join("")) || clean(a.getAttribute("href"));
          return `[${label}](${a.getAttribute("href")})`;
        })
        .join(" · ");
      const meta = [diff, chips.join(", "), links].filter(Boolean).join(" · ");
      if (meta) out.push(`**${meta}**`, "");

      const idea = inlineOf(".idea", card).replace(/^\*\*The idea:?\*\*\s*/i, "");
      if (idea) out.push(`**The idea.** ${idea}`, "");

      const steps = [...card.querySelectorAll(".steps li")].map((li) => squish(inline(li)));
      if (steps.length > 0) out.push("**Steps**", "", ...steps.map((s) => `- ${s}`), "");

      const complexity = [...card.querySelectorAll(".complexity .cx")].map((cx) =>
        squish(cx.textContent),
      );
      if (complexity.length > 0) out.push(`**Complexity.** ${complexity.join(" · ")}`, "");

      const blocks = codeBlocks(card);
      if (blocks.length > 0) out.push(emitBlocks(blocks), "");
    }
  }

  return (
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

/* --------------------------------------------------------------- CDP plumbing */

const profile = await mkdtemp(path.join(tmpdir(), "import-html-"));
const chrome = spawn("google-chrome", [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  "about:blank",
]);

function connect(url) {
  const socket = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve);
    socket.addEventListener("error", reject);
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });
  return { socket, ready, send };
}

try {
  let targets = [];
  for (let i = 0; i < 40 && targets.length === 0; i += 1) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  if (targets.length === 0) throw new Error("could not reach headless Chrome");

  const page = targets.find((t) => t.type === "page");
  const client = connect(page.webSocketDebuggerUrl);
  await client.ready;
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Page.navigate", { url: pathToFileURL(path.resolve(input)).href });
  await new Promise((r) => setTimeout(r, 2500));

  const result = await client.send("Runtime.evaluate", {
    expression: `(${convert.toString()})()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.result?.exceptionDetails) {
    throw new Error(result.result.exceptionDetails.exception?.description ?? "conversion failed");
  }
  const markdown = result.result?.result?.value;
  if (!markdown) throw new Error("converter returned nothing");

  await writeFile(output, markdown);
  const sections = (markdown.match(/^#{1,2} /gm) ?? []).length;
  const blocks = (markdown.match(/^```/gm) ?? []).length / 2;
  console.log(
    `  ${output} — ${markdown.split("\n").length} lines, ${sections} sections, ${blocks} code blocks`,
  );
  client.socket.close();
} finally {
  chrome.kill();
  // Chrome flushes its profile as it exits; cleanup is best-effort.
  await new Promise((r) => setTimeout(r, 400));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(
    () => {},
  );
}

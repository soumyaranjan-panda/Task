import { marked, type Tokens } from "marked";
import { highlightFence } from "./guide";

const renderer = {
  code({ text, lang }: Tokens.Code) {
    const langSafe = (lang ?? "text").replace(/[^a-z0-9+-]/gi, "");
    const body = highlightFence(text, langSafe);
    return `<pre class="code-block" data-lang="${langSafe}"><code>${body}</code></pre>`;
  },
};

marked.use({ renderer, gfm: true, breaks: false });

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

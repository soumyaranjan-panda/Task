/**
 * Tiny, dependency-free syntax highlighter for fenced code blocks.
 *
 * Tokenising rules are data (per language), so adding a language is a matter of
 * extending `LANGS`. Unknown languages fall back to plain escaped text.
 */

type LangSpec = {
  lineComments: string[];
  blockComments: [string, string][];
  quotes: string[];
  keywords: Set<string>;
  types: Set<string>;
  numbers: boolean;
  caseInsensitive: boolean;
};

const words = (list: string) => new Set(list.split(/\s+/).filter(Boolean));

const JAVA = {
  lineComments: ["//"],
  blockComments: [["/*", "*/"]],
  quotes: ['"', "'"],
  keywords:
    words(`abstract assert boolean break byte case catch class const continue default do double else
    enum extends final finally float for if implements import instanceof int interface long native new package
    private protected public return short static strictfp super switch synchronized this throw throws transient try
    void volatile while true false null var record yield sealed permits`),
  types:
    words(`String Integer Long Double Boolean List ArrayList LinkedList ArrayDeque Deque PriorityQueue TreeSet
    TreeMap HashSet HashMap Map Set Arrays Collections Math Comparator Comparable Objects StringBuilder StringBuffer
    Optional Stream IntStream Queue Stack DisjointSet Node Pair`),
  numbers: true,
  caseInsensitive: false,
} satisfies LangSpec;

const SQL = {
  lineComments: ["--", "#"],
  blockComments: [["/*", "*/"]],
  quotes: ["'", '"'],
  keywords:
    words(`select from where group by order having limit offset join inner left right full outer cross
    natural on using as and or not in exists between like ilike is null case when then else end distinct union
    all intersect except minus with recursive over partition window rows range preceding following unbounded current
    row groups first last nth_value lag lead dense_rank rank row_number insert into values update set delete
    create table view index materialized trigger function procedure returns return begin commit rollback savepoint
    transaction isolation level serializable repeatable read write uncommitted read committed exclusive share
    explain analyze plan desc asc top collate cast convert constraint primary key foreign references unique check
    default generated identity auto_increment serial grant revoke commit truncate cascade if exists rename add
    column modify after before values table_schema information_schema count sum avg min max coalesce nullif
    greatest least current_date current_timestamp date_trunc extract interval cast`),
  types:
    words(`int integer bigint smallint tinyint decimal numeric float real double precision money bit
    boolean bool char varchar nvarchar text tinytext mediumtext longtext bytea blob clob date time timestamp timestamptz
    datetime year interval json jsonb uuid serial bigserial array enum geometry`),
  numbers: true,
  caseInsensitive: true,
} satisfies LangSpec;

const LANGS: Record<string, LangSpec> = { java: JAVA, sql: SQL };

const AMP = "&";

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", `${AMP}amp;`)
    .replaceAll("<", `${AMP}lt;`)
    .replaceAll(">", `${AMP}gt;`)
    .replaceAll('"', `${AMP}quot;`);
}

function highlightWith(src: string, spec: LangSpec): string {
  const out: string[] = [];
  const { lineComments, blockComments, quotes, keywords, types } = spec;
  let i = 0;

  while (i < src.length) {
    const rest = src.slice(i);

    const lineComment = lineComments.find((token) => rest.startsWith(token));
    if (lineComment) {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? src.length : end;
      out.push(`<span class="cmt">${escapeHtml(src.slice(i, stop))}</span>`);
      i = stop;
      continue;
    }

    const blockComment = blockComments.find(([open]) => rest.startsWith(open));
    if (blockComment) {
      const [open, close] = blockComment;
      const end = src.indexOf(close, i + open.length);
      const stop = end === -1 ? src.length : end + close.length;
      out.push(`<span class="cmt">${escapeHtml(src.slice(i, stop))}</span>`);
      i = stop;
      continue;
    }

    const quote = quotes.find((token) => rest.startsWith(token));
    if (quote) {
      let j = i + quote.length;
      while (j < src.length) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src.startsWith(quote, j)) {
          j += quote.length;
          break;
        }
        j += 1;
      }
      out.push(`<span class="str">${escapeHtml(src.slice(i, j))}</span>`);
      i = j;
      continue;
    }

    if (spec.numbers && /[0-9]/.test(rest[0]!)) {
      let j = i;
      while (j < src.length && /[0-9._]/.test(src[j]!)) j += 1;
      out.push(`<span class="num">${escapeHtml(src.slice(i, j))}</span>`);
      i = j;
      continue;
    }

    if (/[A-Za-z_$]/.test(rest[0]!)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j]!)) j += 1;
      const word = src.slice(i, j);
      const probe = spec.caseInsensitive ? word.toLowerCase() : word;
      const cls = keywords.has(probe) ? "kw" : types.has(probe) ? "typ" : null;
      out.push(cls ? `<span class="${cls}">${escapeHtml(word)}</span>` : escapeHtml(word));
      i = j;
      continue;
    }

    out.push(escapeHtml(rest[0]!));
    i += 1;
  }

  return out.join("");
}

export function highlightFence(code: string, lang: string | undefined): string {
  const spec = LANGS[(lang ?? "").toLowerCase()];
  if (!spec) return escapeHtml(code);
  return highlightWith(code, spec);
}

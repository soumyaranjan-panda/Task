import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CloudOff, Loader2, Save, Trash2 } from "lucide-react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  deleteSolution,
  saveSolution,
  useSolutions,
  type Language,
  type Solution,
} from "@/lib/solutions";

const INDENT = "  ";

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Per-problem scratchpad for your own solution, persisted in Postgres.
 *
 * One row per (problem, language), so a Java and a Python attempt live side by
 * side. Saves are explicit — button or Cmd/Ctrl+S — because silently losing work
 * to a timed autosave is worse than pressing a key.
 */
export function SolutionEditor({
  topic,
  unitId,
  unitTitle,
}: {
  topic: string;
  unitId: string;
  unitTitle: string;
}) {
  const { byKey, status, error, put, remove } = useSolutions(topic);
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE[topic] ?? "java");
  const [body, setBody] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const key = `${unitId}::${language}`;
  const existing: Solution | undefined = byKey.get(key);

  // Reset the draft when the problem or language changes, picking up what is
  // already stored. Keyed on the stored value too, so a load that arrives after
  // the first paint still fills the box.
  useEffect(() => {
    setBody(existing?.body ?? "");
    setDirty(false);
    setSavedAt(existing?.updatedAt ?? null);
    setMessage(null);
    // `existing?.body` is deliberately not a dependency: re-running on every
    // change of the stored value would fight the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, existing?.updatedAt]);

  // Warn before closing the tab with unsaved text.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveSolution({ topic, unitId, language, title: unitTitle, body });
      put(saved);
      setDirty(false);
      setSavedAt(saved.updatedAt);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }, [body, language, put, saving, topic, unitId, unitTitle]);

  // Cmd/Ctrl+S saves instead of opening the browser's save-page dialog.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    const node = textareaRef.current;
    node?.addEventListener("keydown", onKeyDown);
    return () => node?.removeEventListener("keydown", onKeyDown);
  }, [save]);

  const onDelete = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteSolution({ topic, unitId, language });
      remove(unitId, language);
      setBody("");
      setDirty(false);
      setSavedAt(null);
      setMessage(null);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not delete.");
    } finally {
      setSaving(false);
    }
  }, [language, remove, saving, topic, unitId]);

  // Tab should indent, not move focus out of the editor.
  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab" || event.shiftKey) return;
    event.preventDefault();
    const el = event.currentTarget;
    const { selectionStart, selectionEnd } = el;
    const next = `${body.slice(0, selectionStart)}${INDENT}${body.slice(selectionEnd)}`;
    setBody(next);
    setDirty(true);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = selectionStart + INDENT.length;
    });
  };

  if (status === "unavailable") {
    return (
      <section className="mt-10 rounded-lg border border-border bg-surface p-4">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <CloudOff size={16} className="text-muted" />
          My solution
        </h2>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <p className="mt-1 text-xs text-faint">
          Reading and progress still work without it — only saving is unavailable.
        </p>
      </section>
    );
  }

  const hasStored = Boolean(existing?.body.trim());
  const canSave = Boolean(dirty && body.trim());

  return (
    <section className="mt-10 rounded-lg border border-border bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">My solution</h2>
        <span className="hidden truncate text-[11px] text-faint sm:inline">{unitTitle}</span>

        <div className="ml-auto flex items-center gap-2">
          <label className="sr-only" htmlFor={`lang-${unitId}`}>
            Language
          </label>
          <select
            id={`lang-${unitId}`}
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            className="h-8 rounded-md border border-border bg-bg px-2 text-xs"
          >
            {LANGUAGES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !canSave}
            className={[
              "h-8 px-3 rounded-md text-xs inline-flex items-center gap-1.5",
              canSave
                ? "bg-primary text-primary-fg hover:opacity-90"
                : "border border-border text-muted",
            ].join(" ")}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save
          </button>

          {hasStored ? (
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={saving}
              title="Delete this saved solution"
              className="h-8 w-8 grid place-items-center rounded-md border border-border text-muted hover:text-fg"
            >
              <Trash2 size={13} />
            </button>
          ) : null}
        </div>
      </header>

      <textarea
        ref={textareaRef}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          setDirty(true);
        }}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder={`Paste or write your ${language} solution here…`}
        className="w-full min-h-72 resize-y bg-transparent p-4 font-mono text-[13px] leading-relaxed outline-none placeholder:text-faint"
      />

      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-4 py-2 text-[11px] text-faint">
        {status === "loading" ? (
          <span>Connecting to the solutions database…</span>
        ) : message ? (
          <span className="text-red-500">{message}</span>
        ) : dirty ? (
          <span>Unsaved changes — ⌘S / Ctrl+S</span>
        ) : savedAt ? (
          <span className="inline-flex items-center gap-1">
            <Check size={12} /> Saved {formatTime(savedAt)}
          </span>
        ) : (
          <span>Not saved yet</span>
        )}
        <span className="tabular-nums">{body.length} chars</span>
        {dirty ? (
          <button
            type="button"
            onClick={() => {
              setBody(existing?.body ?? "");
              setDirty(false);
            }}
            className="ml-auto hover:text-fg"
          >
            Revert
          </button>
        ) : null}
      </footer>
    </section>
  );
}
"use client";

import { useRef, useState } from "react";
import { Bold, Code, Italic, Link2, List, ListChecks, Quote } from "lucide-react";
import { Avatar, Markdown } from "@/components/ui/bits";

export type Mentionable = { name: string; handle: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  autoFocus?: boolean;
  /** Called on Ctrl/Cmd+Enter. */
  onSubmit?: () => void;
  /** People offered when typing "@". */
  mentions?: Mentionable[];
};

type Format = {
  label: string;
  icon: typeof Bold;
  shortcut?: string;
  apply: (sel: string) => { text: string; cursor?: [number, number] };
};

const wrap = (mark: string, fallback: string) => (sel: string) => {
  const inner = sel || fallback;
  return { text: `${mark}${inner}${mark}`, cursor: [mark.length, mark.length + inner.length] as [number, number] };
};

const prefixLines = (prefix: string) => (sel: string) => ({
  text: sel.split("\n").map((l) => `${prefix}${l}`).join("\n"),
});

const FORMATS: Format[] = [
  { label: "Bold", icon: Bold, shortcut: "b", apply: wrap("**", "bold text") },
  { label: "Italic", icon: Italic, shortcut: "i", apply: wrap("_", "italic text") },
  { label: "Code", icon: Code, shortcut: "e", apply: (sel) => (sel.includes("\n") ? { text: "```\n" + sel + "\n```" } : wrap("`", "code")(sel)) },
  {
    label: "Link",
    icon: Link2,
    shortcut: "k",
    apply: (sel) => {
      const text = sel || "link text";
      return { text: `[${text}](url)`, cursor: [text.length + 3, text.length + 6] };
    },
  },
  { label: "Bulleted list", icon: List, apply: prefixLines("- ") },
  { label: "Checklist", icon: ListChecks, apply: prefixLines("- [ ] ") },
  { label: "Quote", icon: Quote, apply: prefixLines("> ") },
];

/** The "@partial" being typed just before the caret, if any. */
function mentionQuery(text: string, caret: number) {
  const m = /(^|\s)@([\w.+-]{0,30})$/.exec(text.slice(0, caret));
  return m ? { query: m[2].toLowerCase(), start: caret - m[2].length - 1 } : null;
}

/** Textarea with a formatting toolbar, @mention suggestions and a Write / Preview toggle. */
export default function MarkdownEditor({ value, onChange, placeholder, rows = 8, id, autoFocus, onSubmit, mentions = [] }: Props) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [active, setActive] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);

  const suggestions = mention
    ? mentions.filter((m) => m.handle.includes(mention.query) || m.name.toLowerCase().includes(mention.query)).slice(0, 6)
    : [];

  const replaceSelection = (fn: Format["apply"]) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const { text, cursor } = fn(value.slice(s, e));
    onChange(value.slice(0, s) + text + value.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      if (cursor) el.setSelectionRange(s + cursor[0], s + cursor[1]);
      else el.setSelectionRange(s + text.length, s + text.length);
    });
  };

  const insertMention = (m: Mentionable) => {
    const el = area.current;
    if (!el || !mention) return;
    const caret = el.selectionStart;
    onChange(`${value.slice(0, mention.start)}@${m.handle} ${value.slice(caret)}`);
    setMention(null);
    const pos = mention.start + m.handle.length + 2;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a + (e.key === "ArrowDown" ? 1 : suggestions.length - 1)) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(suggestions[Math.min(active, suggestions.length - 1)]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setMention(null);
        return;
      }
    }
    if (onSubmit && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      const fmt = FORMATS.find((f) => f.shortcut === e.key.toLowerCase());
      if (fmt) {
        e.preventDefault();
        replaceSelection(fmt.apply);
      }
    }
  };

  return (
    <div className="relative rounded-md border border-line bg-surface shadow-[var(--shadow-sm)] focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
      <div className="flex items-center gap-0.5 border-b border-line px-1.5 py-1">
        {(["write", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-6 rounded px-2 text-xs font-medium capitalize ${tab === t ? "bg-surface-2 text-fg" : "text-faint hover:text-muted"}`}
          >
            {t}
          </button>
        ))}
        {tab === "write" && (
          <div className="ml-auto flex items-center" role="toolbar" aria-label="Formatting">
            {FORMATS.map(({ label, icon: Icon, shortcut, apply }) => (
              <button
                key={label}
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-surface-2 hover:text-fg"
                title={shortcut ? `${label} (Ctrl+${shortcut.toUpperCase()})` : label}
                aria-label={label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => replaceSelection(apply)}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        )}
      </div>
      {tab === "write" ? (
        <textarea
          ref={area}
          id={id}
          value={value}
          rows={rows}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setMention(mentions.length ? mentionQuery(e.target.value, e.target.selectionStart) : null);
            setActive(0);
          }}
          onBlur={() => setTimeout(() => setMention(null), 120)}
          onKeyDown={onKeyDown}
          aria-autocomplete={mentions.length ? "list" : undefined}
          className="block w-full resize-y bg-transparent px-3 py-2 font-mono text-[13px] leading-relaxed text-fg outline-none placeholder:font-sans placeholder:text-faint"
        />
      ) : (
        <div className="min-h-24 px-3 py-2">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-sm text-faint">Nothing to preview.</p>}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="menu animate-pop absolute bottom-full left-3 mb-1 w-64" role="listbox" aria-label="Mention someone">
          {suggestions.map((m, i) => (
            <div
              key={m.handle}
              role="option"
              aria-selected={i === active}
              data-active={i === active}
              className="menu-item cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(m);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <Avatar name={m.name} size={18} />
              <span className="min-w-0 flex-1 truncate">{m.name}</span>
              <span className="font-mono text-[11px] text-faint">@{m.handle}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

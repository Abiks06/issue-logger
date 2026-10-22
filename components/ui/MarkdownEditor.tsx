"use client";

import { useState } from "react";
import { Markdown } from "@/components/ui/bits";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  autoFocus?: boolean;
  /** Called on Ctrl/Cmd+Enter. */
  onSubmit?: () => void;
};

/** Textarea with a Write / Preview toggle. Markdown is rendered with GFM. */
export default function MarkdownEditor({ value, onChange, placeholder, rows = 8, id, autoFocus, onSubmit }: Props) {
  const [tab, setTab] = useState<"write" | "preview">("write");

  return (
    <div className="rounded-md border border-line bg-surface shadow-[var(--shadow-sm)] focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
      <div className="flex items-center gap-1 border-b border-line px-1.5 py-1">
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
        <span className="ml-auto pr-1 text-[11px] text-faint">Markdown supported</span>
      </div>
      {tab === "write" ? (
        <textarea
          id={id}
          value={value}
          rows={rows}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (onSubmit && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSubmit();
            }
          }}
          className="block w-full resize-y bg-transparent px-3 py-2 font-mono text-[13px] leading-relaxed text-fg outline-none placeholder:font-sans placeholder:text-faint"
        />
      ) : (
        <div className="min-h-24 px-3 py-2">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-sm text-faint">Nothing to preview.</p>}
        </div>
      )}
    </div>
  );
}

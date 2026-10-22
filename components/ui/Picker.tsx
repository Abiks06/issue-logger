"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check } from "lucide-react";

// Popover list used for every property picker (status, priority, assignee,
// labels…). Supports single or multi select, filtering, and full keyboard use.

export type PickerOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  hint?: string;
};

type Props = {
  options: PickerOption[];
  value: string | string[] | null;
  onChange: (value: string) => void;
  /** Accessible name for the trigger button. */
  label: string;
  children: React.ReactNode;
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  align?: "left" | "right";
  /** Open above the trigger (for controls near the bottom of the screen). */
  side?: "top" | "bottom";
  triggerClassName?: string;
};

export default function Picker({
  options,
  value,
  onChange,
  label,
  children,
  multiple = false,
  searchable = options.length > 7,
  disabled = false,
  align = "left",
  side = "bottom",
  triggerClassName = "btn-ghost h-7 px-2",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    (searchable ? search.current : list.current)?.focus();
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, searchable]);

  const toggle = () => {
    if (disabled) return;
    setQuery("");
    const idx = options.findIndex((o) => selected.has(o.value));
    setActive(Math.max(0, idx));
    setOpen((o) => !o);
  };

  const choose = (opt: PickerOption) => {
    onChange(opt.value);
    if (!multiple) setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) choose(opt);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div ref={root} className="relative" onKeyDown={open ? onKeyDown : undefined}>
      <button
        type="button"
        className={triggerClassName}
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        {children}
      </button>

      {open && (
        <div className={`menu animate-pop absolute w-56 ${side === "top" ? "bottom-full mb-1" : "top-full mt-1"} ${align === "right" ? "right-0" : "left-0"}`}>
          {searchable && (
            <input
              ref={search}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder={`${label}…`}
              className="mb-1 h-8 w-full rounded-md border-0 bg-surface-2 px-2 text-[13px] text-fg outline-none placeholder:text-faint"
              aria-controls={listId}
            />
          )}
          <div
            ref={list}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-multiselectable={multiple}
            className="max-h-64 overflow-y-auto outline-none"
          >
            {filtered.length === 0 && <p className="px-2 py-1.5 text-[13px] text-faint">No matches</p>}
            {filtered.map((opt, i) => (
              <div
                key={opt.value}
                role="option"
                aria-selected={selected.has(opt.value)}
                data-active={i === active}
                className="menu-item"
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(opt)}
              >
                {opt.icon}
                <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                {opt.hint && <span className="text-[11px] text-faint">{opt.hint}</span>}
                {selected.has(opt.value) && <Check className="h-3.5 w-3.5 text-accent" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

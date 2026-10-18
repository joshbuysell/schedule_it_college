"use client";

import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown, X } from "lucide-react";
import { normalizeQuery } from "@/lib/schedule";

export type Option = { value: string; hint?: string; tone?: "ok" | "danger" | "brand"; group?: string };

export default function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  allowEmpty = true,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  allowEmpty?: boolean;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = normalizeQuery(query ?? "");
    const list = q ? options.filter((o) => normalizeQuery(o.value).includes(q)) : options;
    return list.slice(0, 60);
  }, [options, query]);

  const current = options.find((o) => o.value === value);
  const commit = (v: string) => {
    onChange(v);
    setQuery(null);
    setOpen(false);
  };

  return (
    <div className="relative">
      <span className="mb-1 block text-sm font-medium text-ink-2">{label}</span>
      <div
        className={clsx(
          "flex h-11 items-center rounded-xl border bg-surface px-3 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15",
          current?.tone === "danger" && query === null ? "border-danger" : "border-line",
        )}
      >
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={query ?? value}
          placeholder={placeholder}
          onFocus={(e) => {
            setOpen(true);
            e.currentTarget.select();
          }}
          onBlur={() =>
            setTimeout(() => {
              if (query !== null && query.trim() !== value) onChange(query.trim());
              setQuery(null);
              setOpen(false);
            }, 120)
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter") {
              e.preventDefault();
              commit(open && filtered[active] ? filtered[active].value : (query ?? value).trim());
            }
            if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); }
          }}
          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-ink-3"
        />
        {current?.hint && query === null && (
          <span className={clsx("ml-2 max-w-[45%] truncate text-xs font-semibold", toneCls(current.tone))}>{current.hint}</span>
        )}
        {allowEmpty && value && (
          <button type="button" tabIndex={-1} onClick={() => commit("")} className="ml-1 text-ink-3 hover:text-ink" aria-label="Очистити">
            <X className="size-4" />
          </button>
        )}
        <ChevronDown className="ml-1 size-4 shrink-0 text-ink-3" />
      </div>

      {open && (
        <ul className="fade-up absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-card">
          {filtered.map((o, i) => (
            <li key={o.value}>
              {(i === 0 || filtered[i - 1].group !== o.group) && o.group && (
                <p className="px-2.5 pb-1 pt-2 text-xs font-medium text-ink-3">{o.group}</p>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(o.value)}
                className={clsx(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm",
                  i === active ? "bg-brand-soft" : "",
                  o.value === value && "font-bold",
                )}
              >
                <span className="truncate">{o.value}</span>
                {o.hint && <span className={clsx("shrink-0 text-xs font-semibold", toneCls(o.tone))}>{o.hint}</span>}
              </button>
            </li>
          ))}
          {query && !options.some((o) => o.value.toLowerCase() === query.trim().toLowerCase()) && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(query.trim())}
                className="w-full rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-brand hover:bg-brand-soft"
              >
                + Додати «{query.trim()}»
              </button>
            </li>
          )}
          {filtered.length === 0 && !query && <li className="px-3 py-2 text-sm text-ink-3">Порожньо</li>}
        </ul>
      )}
    </div>
  );
}

function toneCls(tone?: Option["tone"]) {
  return tone === "danger" ? "text-danger" : tone === "ok" ? "text-ok" : tone === "brand" ? "text-brand" : "text-ink-3";
}

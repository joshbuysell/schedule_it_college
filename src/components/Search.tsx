"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DoorOpen, GraduationCap, Search as SearchIcon, UserRound } from "lucide-react";
import clsx from "clsx";
import { layoutSwap, normalizeQuery, translit } from "@/lib/schedule";
import type { SearchIndex } from "@/lib/queries";

type Hit = { kind: "group" | "teacher" | "room"; title: string; hint: string; href: string; score: number };

function buildHits(index: SearchIndex, q: string): Hit[] {
  const variants = [...new Set([q, layoutSwap(q), translit(q)].map(normalizeQuery).filter(Boolean))];
  if (!variants.length) return [];
  const score = (hay: string) => {
    const h = normalizeQuery(hay);
    let best = 0;
    for (const v of variants) {
      if (h.startsWith(v)) best = Math.max(best, 3);
      else if (h.includes(v)) best = Math.max(best, 1);
    }
    return best;
  };

  const hits: Hit[] = [];
  for (const g of index.groups) {
    const s = score(g.name);
    if (s) hits.push({ kind: "group", title: g.name, hint: `${g.course} курс · ${g.specialty}`, href: `/group/${encodeURIComponent(g.name)}`, score: s + 1 });
  }
  for (const t of index.teachers) {
    const s = Math.max(score(t.shortName), score(t.fullName ?? ""));
    if (s) hits.push({ kind: "teacher", title: t.fullName ?? t.shortName, hint: t.commission ? `ЦК ${t.commission.toLowerCase()}` : "Викладач", href: `/teacher/${t.id}`, score: s });
  }
  for (const r of index.rooms) {
    const s = Math.max(score(r.name), score(`ауд${r.name}`));
    if (s) hits.push({ kind: "room", title: r.name === "кфв" ? "Спорткомплекс (кфв)" : `Аудиторія ${r.name}`, hint: "Зайнятість аудиторії", href: `/room/${encodeURIComponent(r.name)}`, score: s - 0.5 });
  }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "uk")).slice(0, 8);
}

const ICON = { group: GraduationCap, teacher: UserRound, room: DoorOpen };

export default function Search({ index, size = "hero", autoFocus = false }: { index: SearchIndex; size?: "hero" | "compact"; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => buildHits(index, q), [index, q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && document.activeElement === document.body)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (hit?: Hit) => {
    if (!hit) return;
    setOpen(false);
    setQ("");
    router.push(hit.href);
  };

  const hero = size === "hero";
  return (
    <div className="relative w-full">
      <label
        className={clsx(
          "flex items-center gap-3 rounded-2xl border border-line bg-surface shadow-card transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15",
          hero ? "h-16 px-5" : "h-11 px-3.5",
        )}
      >
        <SearchIcon className={clsx("shrink-0 text-ink-3", hero ? "size-6" : "size-4.5")} />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter") go(hits[active]);
            if (e.key === "Escape") inputRef.current?.blur();
          }}
          placeholder={hero ? "Група, викладач або аудиторія — напр. КІ-21, Шеремета, 413" : "Пошук групи чи викладача"}
          className={clsx("w-full bg-transparent outline-none placeholder:text-ink-3", hero ? "text-lg font-medium" : "text-sm")}
          aria-label="Пошук розкладу"
          role="combobox"
          aria-controls="search-results"
          aria-expanded={open && hits.length > 0}
        />
        <kbd className="hidden shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[11px] font-semibold text-ink-3 sm:block">⌘K</kbd>
      </label>

      {open && q && (
        <div className="fade-up absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {hits.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-3">Нічого не знайдено. Спробуйте «КН-21», «Кубик» або «413».</p>
          ) : (
            <ul id="search-results" role="listbox" className="p-1.5">
              {hits.map((h, i) => {
                const Icon = ICON[h.kind];
                return (
                  <li key={h.href}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(h)}
                      className={clsx(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                        i === active ? "bg-brand-soft" : "hover:bg-surface-2",
                      )}
                    >
                      <span className={clsx("grid size-9 shrink-0 place-items-center rounded-lg", h.kind === "group" ? "bg-brand text-brand-ink" : "bg-surface-2 text-ink-2")}>
                        <Icon className="size-4.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{h.title}</span>
                        <span className="block truncate text-xs text-ink-3">{h.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

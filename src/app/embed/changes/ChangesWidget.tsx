"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowRight, BellRing } from "lucide-react";
import { describeLesson, roomOnly, type ChangeDTO } from "@/lib/changes";
import { formatDate } from "@/lib/schedule";

type Props = { changes: ChangeDTO[]; today: string; dates: string[]; parity: "num" | "den"; link: string | null; limit: number };

function what(c: ChangeDTO) {
  if (c.cancelled) return { label: "скасовано", tone: "text-danger", text: c.replaces.map((r) => r.subject).join(", ") || "пара" };
  if (roomOnly(c)) return { label: "аудиторія", tone: "text-brand", text: `${c.subject} — ауд. ${c.room ?? "—"}` };
  return { label: c.replaces.length ? "заміна" : "додатково", tone: "text-accent", text: describeLesson(c) };
}

export default function ChangesWidget({ changes, today, dates, parity, link, limit }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.parent === window) return;
    const send = () => window.parent.postMessage({ source: "itc-schedule", type: "height", height: Math.ceil(el.getBoundingClientRect().height) }, "*");
    const ro = new ResizeObserver(send);
    ro.observe(el);
    send();
    return () => ro.disconnect();
  }, []);

  const groupHref = (g: string) => (link ? `${link}#schedule=${encodeURIComponent(`g:${g}`)}` : `/group/${encodeURIComponent(g)}`);
  const target = link ? "_top" : "_blank";
  const all = dates.flatMap((d) => changes.filter((c) => c.date === d).sort((a, b) => a.group.localeCompare(b.group, "uk") || a.pair - b.pair));
  const shown = expanded ? all : all.slice(0, limit);

  return (
    <div ref={ref} className="@container rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="whitespace-nowrap text-lg font-bold text-brand">Зміни в розкладі</h2>
        <span className="text-xs text-ink-3">тиждень: {parity === "num" ? "чисельник" : "знаменник"}</span>
      </div>

      {all.length === 0 ? (
        <p className="mt-2 text-sm text-ink-2">
          {dates[0] === today ? "Сьогодні й завтра" : `${formatDate(dates[0], { weekday: "long" })} і ${formatDate(dates[1], { weekday: "long" })}`} замін
          немає — заняття за розкладом.
        </p>
      ) : (
        dates.map((d) => {
          const list = shown.filter((c) => c.date === d);
          if (!list.length) return null;
          return (
            <div key={d} className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
                {d === today ? "Сьогодні" : "Наступний день"}, {formatDate(d, { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <ul className="mt-1">
                {list.map((c) => {
                  const w = what(c);
                  return (
                    <li key={c.id} className="flex flex-wrap gap-x-3 border-b border-line py-1.5 text-sm last:border-0 @sm:flex-nowrap">
                      <a href={groupHref(c.group)} target={target} className="shrink-0 font-bold text-brand hover:underline @sm:w-16">
                        {c.group}
                      </a>
                      <span className="w-12 shrink-0 tabular-nums text-ink-3">{c.pair} пара</span>
                      <span className="min-w-0 basis-full @sm:flex-1 @sm:basis-auto">
                        <span className={clsx("font-semibold", w.tone)}>{w.label}:</span> {w.text}
                        {c.subgroup > 0 && <span className="text-ink-3"> · {c.subgroup} пгр</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        {all.length > shown.length ? (
          <button onClick={() => setExpanded(true)} className="font-semibold text-brand hover:underline">
            Показати всі ({all.length})
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
            <BellRing className="size-3.5" /> Сповіщення — на сторінці своєї групи
          </span>
        )}
        <a href={link ?? "/"} target={target} className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
          Увесь розклад <ArrowRight className="size-4" />
        </a>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import clsx from "clsx";
import { currentPair, kyivNow, matchesWeek, subjectHue, type BellDTO, type LessonDTO, type Week } from "@/lib/schedule";

export const MY_GROUP_KEY = "schedule:my-group";

/** Кнопка «Моя група» на сторінці групи */
export function PinGroupButton({ group }: { group: string }) {
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    try {
      setPinned(localStorage.getItem(MY_GROUP_KEY) === group);
    } catch {}
  }, [group]);
  const toggle = () => {
    try {
      if (pinned) localStorage.removeItem(MY_GROUP_KEY);
      else localStorage.setItem(MY_GROUP_KEY, group);
      setPinned(!pinned);
    } catch {}
  };
  return (
    <button
      onClick={toggle}
      className={clsx(
        "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
        pinned ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface hover:border-ink-3",
      )}
    >
      <Star className={clsx("size-4", pinned && "fill-current")} />
      {pinned ? "Моя група" : "Зробити моєю групою"}
    </button>
  );
}

/** Картка на головній: сьогоднішні пари обраної групи */
export function MyGroupCard({ bells, parity }: { bells: BellDTO[]; parity: Exclude<Week, "all"> }) {
  const [group, setGroup] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LessonDTO[] | null>(null);
  const [now, setNow] = useState<ReturnType<typeof kyivNow> | null>(null);

  useEffect(() => {
    setNow(kyivNow());
    try {
      setGroup(localStorage.getItem(MY_GROUP_KEY));
    } catch {}
  }, []);

  useEffect(() => {
    if (!group) return;
    fetch(`/api/v1/groups/${encodeURIComponent(group)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLessons(d?.lessons ?? []))
      .catch(() => setLessons([]));
  }, [group]);

  if (!group || !now) return null;

  const weekend = now.weekday > 5;
  const day = weekend ? 1 : now.weekday;
  const today = (lessons ?? [])
    .filter((l) => l.day === day && matchesWeek(l.week, parity))
    .sort((a, b) => a.pair - b.pair);
  const cur = !weekend ? currentPair(bells, now.minutes) : null;

  return (
    <section className="fade-up rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Моя група · {weekend ? "понеділок" : "сьогодні"}</p>
          <h2 className="font-display text-2xl font-bold">{group}</h2>
        </div>
        <Link
          href={`/group/${encodeURIComponent(group)}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-sm font-semibold text-bg hover:opacity-90"
        >
          Весь тиждень <ArrowRight className="size-4" />
        </Link>
      </div>
      {lessons === null ? (
        <div className="h-20 animate-pulse rounded-2xl bg-surface-2" />
      ) : today.length === 0 ? (
        <p className="rounded-2xl bg-surface-2 px-4 py-5 text-sm text-ink-2">Пар немає — відпочивайте!</p>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {today.map((l) => {
            const b = bells.find((x) => x.pair === l.pair);
            const live = cur?.live && cur.pair === l.pair;
            const done = !weekend && b && now.minutes >= +b.end.slice(0, 2) * 60 + +b.end.slice(3);
            return (
              <li
                key={l.id}
                className={clsx("lesson rounded-xl px-3 py-2.5", done && "opacity-50", live && "ring-2 ring-accent")}
                style={{ "--h": subjectHue(l.subject) } as React.CSSProperties}
              >
                <p className="text-[11px] font-bold tabular-nums opacity-75">
                  {l.pair} пара · {b?.start}–{b?.end} {live && <span className="ml-1 rounded bg-accent px-1 text-white">зараз</span>}
                </p>
                <p className="mt-0.5 font-bold leading-snug">{l.subject}</p>
                <p className="text-xs opacity-80">
                  {l.teacher} {l.room && `· ауд. ${l.room}`} {l.subgroup ? `· ${l.subgroup} підгр.` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import clsx from "clsx";
import { applyChanges, type ChangeDTO, type DisplayLesson } from "@/lib/changes";
import { addDays, currentPair, kyivNow, matchesWeek, subjectHue, toMinutes, type BellDTO, type LessonDTO, type Week } from "@/lib/schedule";

export const MY_GROUP_KEY = "schedule:my-group";

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
        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition",
        pinned ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink-2 hover:border-brand hover:text-brand",
      )}
    >
      <Star className={clsx("size-4", pinned && "fill-current")} />
      {pinned ? "Моя група" : "Зробити моєю групою"}
    </button>
  );
}

export function MyGroupCard({ bells, parity }: { bells: BellDTO[]; parity: Exclude<Week, "all"> }) {
  const [group, setGroup] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LessonDTO[] | null>(null);
  const [extra, setExtra] = useState<{ changes: ChangeDTO[]; weekStart: string; groupId: number } | null>(null);
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
      .then((r) => {
        if (r.status === 404) {
          localStorage.removeItem(MY_GROUP_KEY);
          setGroup(null);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => {
        if (!d) return;
        setLessons(d.lessons ?? []);
        setExtra({ changes: d.changes ?? [], weekStart: d.weekStart, groupId: d.group?.id });
      })
      .catch(() => setLessons([]));
  }, [group]);

  if (!group || !now) return null;

  const weekend = now.weekday > 5;
  const day = weekend ? 1 : now.weekday;
  const date = extra ? addDays(extra.weekStart, day - 1) : null;
  const withChanges: DisplayLesson[] =
    extra && date ? applyChanges(lessons ?? [], extra.changes.filter((c) => c.date === date), (l) => l.groupId === extra.groupId) : (lessons ?? []);
  const today = withChanges.filter((l) => l.day === day && matchesWeek(l.week, parity)).sort((a, b) => a.pair - b.pair);
  const cur = !weekend ? currentPair(bells, now.minutes) : null;

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold">
          Моя група {group} <span className="font-normal text-ink-3">· {weekend ? "понеділок" : "сьогодні"}</span>
        </h2>
        <Link href={`/group/${encodeURIComponent(group)}`} className="text-sm text-brand hover:underline">
          Розклад на тиждень →
        </Link>
      </div>
      {lessons === null ? (
        <div className="h-24 animate-pulse rounded-md bg-surface-2" />
      ) : today.length === 0 ? (
        <p className="border-y border-line py-4 text-ink-2">Пар немає.</p>
      ) : (
        <table className="w-full text-[15px]">
          <thead className="sr-only">
            <tr>
              <th>Пара</th>
              <th>Заняття</th>
              <th>Аудиторія</th>
            </tr>
          </thead>
          <tbody>
            {today.map((l) => {
              const b = bells.find((x) => x.pair === l.pair);
              const live = cur?.live && cur.pair === l.pair;
              const done = !weekend && b && now.minutes >= toMinutes(b.end);
              return (
                <tr key={l.id} className={clsx("border-b border-line", done && "text-ink-3", live && "bg-accent-soft")}>
                  <td className="w-28 py-2.5 pl-2 pr-3 align-top tabular-nums">
                    <span className="font-medium">{l.pair} пара</span>
                    <span className="block text-sm text-ink-3">
                      {b?.start}–{b?.end}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 align-top">
                    <span className="inline-flex items-center gap-2">
                      <span className="lesson-dot size-2 rounded-full" style={{ "--h": subjectHue(l.subject) } as React.CSSProperties} />
                      <span className={clsx("font-medium", (l.change?.kind === "cancelled" || l.change?.kind === "taken") && "line-through")}>{l.subject}</span>
                      {l.change && (
                        <span className="rounded border border-accent/50 px-1.5 text-xs text-accent">
                          {l.change.kind === "cancelled" ? "скасовано" : "заміна"}
                        </span>
                      )}
                      {live && <span className="rounded bg-accent px-1.5 text-xs font-medium text-white">зараз</span>}
                    </span>
                    <span className="block text-sm text-ink-3">
                      {l.teacher}
                      {l.subgroup ? ` · ${l.subgroup} підгрупа` : ""}
                      {l.week !== "all" ? ` · ${l.week === "num" ? "чисельник" : "знаменник"}` : ""}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2 text-right align-top font-medium tabular-nums">{l.room && `ауд. ${l.room}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

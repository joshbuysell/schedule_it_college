"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Coffee } from "lucide-react";
import {
  DAYS,
  DAYS_SHORT,
  currentPair,
  kyivNow,
  matchesWeek,
  subjectHue,
  type BellDTO,
  type LessonDTO,
  type Week,
} from "@/lib/schedule";

type Mode = "group" | "teacher" | "room";

export type OpenTarget = { kind: Mode; key: string };

/** У віджеті для сайту коледжу посилання не ведуть на інші сторінки, а перемикають вигляд. */
export const TimetableNav = createContext<((t: OpenTarget) => void) | null>(null);

function NavLink({ to, className, title, children }: { to: OpenTarget; className?: string; title?: string; children: React.ReactNode }) {
  const open = useContext(TimetableNav);
  if (open) {
    return (
      <button type="button" onClick={() => open(to)} className={clsx(className, "cursor-pointer text-left")} title={title}>
        {children}
      </button>
    );
  }
  const href = to.kind === "teacher" ? `/teacher/${to.key}` : `/${to.kind}/${encodeURIComponent(to.key)}`;
  return (
    <Link href={href} className={className} title={title}>
      {children}
    </Link>
  );
}

type Props = {
  lessons: LessonDTO[];
  bells: BellDTO[];
  parity: Exclude<Week, "all">;
  mode: Mode;
  /** ключ для запам'ятовування вибраної підгрупи */
  storageKey?: string;
  compact?: boolean;
};

function useNow() {
  const [now, setNow] = useState<ReturnType<typeof kyivNow> | null>(null);
  useEffect(() => {
    const tick = () => setNow(kyivNow());
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function Timetable({ lessons, bells, parity, mode, storageKey, compact }: Props) {
  const now = useNow();
  const [week, setWeek] = useState<Week>(parity);
  const [subgroup, setSubgroup] = useState(0);
  const [day, setDay] = useState(1);

  useEffect(() => {
    if (now) setDay(now.weekday <= 5 ? now.weekday : 1);
    // лише при першому визначенні часу
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now === null]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const v = Number(localStorage.getItem(`sg:${storageKey}`));
      if (v === 1 || v === 2) setSubgroup(v);
    } catch {}
  }, [storageKey]);

  const pickSubgroup = (v: number) => {
    setSubgroup(v);
    try {
      if (storageKey) localStorage.setItem(`sg:${storageKey}`, String(v));
    } catch {}
  };

  const hasSubgroups = mode === "group" && lessons.some((l) => l.subgroup > 0);
  const hasAlternating = lessons.some((l) => l.week !== "all");

  const visible = useMemo(
    () =>
      lessons.filter(
        (l) => matchesWeek(l.week, week) && (subgroup === 0 || l.subgroup === 0 || l.subgroup === subgroup),
      ),
    [lessons, week, subgroup],
  );

  const maxPair = Math.max(4, ...lessons.map((l) => l.pair));
  const pairs = bells.filter((b) => b.pair <= maxPair);
  const slot = (d: number, p: number) => visible.filter((l) => l.day === d && l.pair === p);

  const live = now && now.weekday <= 5 && week !== (parity === "num" ? "den" : "num") ? currentPair(bells, now.minutes) : null;
  const isNow = (d: number, p: number) => !!live && live.live && now!.weekday === d && live.pair === p;
  const isNext = (d: number, p: number) => !!live && !live.live && now!.weekday === d && live.pair === p;

  return (
    <div className="@container">
      {/* Панель фільтрів */}
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        {hasAlternating && (
          <Segmented
            value={week}
            onChange={(v) => setWeek(v as Week)}
            options={[
              { value: "num", label: "Чисельник", badge: parity === "num" ? "зараз" : undefined },
              { value: "den", label: "Знаменник", badge: parity === "den" ? "зараз" : undefined },
              { value: "all", label: "Обидва" },
            ]}
          />
        )}
        {hasSubgroups && (
          <Segmented
            value={String(subgroup)}
            onChange={(v) => pickSubgroup(+v)}
            options={[
              { value: "0", label: "Уся група" },
              { value: "1", label: "1 підгрупа" },
              { value: "2", label: "2 підгрупа" },
            ]}
          />
        )}
      </div>

      {/* Мобільний: день за днем */}
      <div className={clsx(!compact && "@3xl:hidden")}>
        <div className="no-print mb-3 grid grid-cols-5 gap-1.5">
          {DAYS_SHORT.map((d, i) => {
            const count = visible.filter((l) => l.day === i + 1).length;
            const today = now?.weekday === i + 1;
            return (
              <button
                key={d}
                onClick={() => setDay(i + 1)}
                className={clsx(
                  "relative rounded-xl border px-1 py-2 text-center transition",
                  day === i + 1 ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface hover:border-ink-3",
                )}
              >
                <span className="block text-sm font-bold">{d}</span>
                <span className={clsx("block text-[11px]", day === i + 1 ? "opacity-80" : "text-ink-3")}>
                  {count ? `${count} ${count === 1 ? "пара" : count < 5 ? "пари" : "пар"}` : "вихідний"}
                </span>
                {today && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>
        <DayList day={day} pairs={pairs} slot={slot} mode={mode} isNow={isNow} isNext={isNext} />
      </div>

      {/* Десктоп: тижнева сітка */}
      {!compact && (
        <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface shadow-card @3xl:block">
          <div className="grid" style={{ gridTemplateColumns: "88px repeat(5, minmax(0, 1fr))" }}>
            <div className="border-b border-line bg-surface-2" />
            {DAYS.map((d, i) => {
              const today = now?.weekday === i + 1;
              return (
                <div
                  key={d}
                  className={clsx(
                    "border-b border-l border-line px-3 py-3 text-sm font-bold",
                    today ? "bg-brand-soft text-brand" : "bg-surface-2",
                  )}
                >
                  {d}
                  {today && <span className="ml-2 hidden rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-ink @5xl:inline">сьогодні</span>}
                </div>
              );
            })}
            {pairs.map((b) => (
              <Row key={b.pair}>
                <div className="flex flex-col justify-center border-b border-line bg-surface-2 px-3 py-2">
                  <span className="font-display text-lg font-bold leading-none">{b.pair}</span>
                  <span className="mt-1 text-[11px] font-semibold tabular-nums text-ink-3">
                    {b.start}
                    <br />
                    {b.end}
                  </span>
                </div>
                {DAYS.map((_, i) => {
                  const items = slot(i + 1, b.pair);
                  const nowCell = isNow(i + 1, b.pair);
                  return (
                    <div
                      key={i}
                      className={clsx(
                        "relative min-h-[92px] border-b border-l border-line p-1.5",
                        now?.weekday === i + 1 && "bg-brand-soft/30",
                        nowCell && "ring-2 ring-inset ring-accent",
                      )}
                    >
                      {nowCell && <NowTag />}
                      {isNext(i + 1, b.pair) && <NowTag next />}
                      <div className="flex h-full flex-col gap-1.5">
                        {items.map((l) => (
                          <LessonCard key={l.id} lesson={l} mode={mode} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </Row>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function NowTag({ next }: { next?: boolean }) {
  return (
    <span
      className={clsx(
        "absolute -top-2 right-2 z-10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        next ? "bg-surface text-ink-2 ring-1 ring-line" : "bg-accent text-white",
      )}
    >
      {!next && <span className="live-dot size-1.5 rounded-full bg-white" />}
      {next ? "далі" : "зараз"}
    </span>
  );
}

function DayList({
  day,
  pairs,
  slot,
  mode,
  isNow,
  isNext,
}: {
  day: number;
  pairs: BellDTO[];
  slot: (d: number, p: number) => LessonDTO[];
  mode: Mode;
  isNow: (d: number, p: number) => boolean;
  isNext: (d: number, p: number) => boolean;
}) {
  const filled = pairs.filter((b) => slot(day, b.pair).length);
  if (!filled.length) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
        <Coffee className="mb-3 size-8 text-ink-3" />
        <p className="font-semibold">Занять немає</p>
        <p className="text-sm text-ink-3">Вільний день — гарна нагода для курсової 😉</p>
      </div>
    );
  }
  const first = filled[0].pair;
  const last = filled[filled.length - 1].pair;
  return (
    <ol className="space-y-2">
      {pairs
        .filter((b) => b.pair >= first && b.pair <= last)
        .map((b) => {
          const items = slot(day, b.pair);
          const nowCell = isNow(day, b.pair);
          return (
            <li
              key={b.pair}
              className={clsx(
                "relative flex gap-3 rounded-2xl border bg-surface p-2.5",
                nowCell ? "border-accent ring-2 ring-accent/30" : "border-line",
              )}
            >
              {nowCell && <NowTag />}
              {isNext(day, b.pair) && <NowTag next />}
              <div className="w-14 shrink-0 pt-1 text-center">
                <div className="font-display text-xl font-bold leading-none">{b.pair}</div>
                <div className="mt-1 text-[11px] font-semibold tabular-nums text-ink-3">
                  {b.start}
                  <br />
                  {b.end}
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {items.length ? (
                  items.map((l) => <LessonCard key={l.id} lesson={l} mode={mode} large />)
                ) : (
                  <div className="flex h-full items-center rounded-xl bg-surface-2 px-3 py-3 text-sm text-ink-3">Вікно</div>
                )}
              </div>
            </li>
          );
        })}
    </ol>
  );
}

export function LessonCard({ lesson: l, mode, large }: { lesson: LessonDTO; mode: Mode; large?: boolean }) {
  const linkCls = "underline-offset-2 hover:underline";
  return (
    <div
      className={clsx("lesson flex-1 rounded-lg px-2.5 py-2", large && "px-3 py-2.5")}
      style={{ "--h": subjectHue(l.subject) } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={clsx("font-bold leading-snug", large ? "text-[15px]" : "text-[13px]")}>{l.subject}</p>
        {l.room && mode !== "room" && large && (
          <NavLink
            to={{ kind: "room", key: l.room }}
            className="shrink-0 rounded-md bg-white/60 px-1.5 py-0.5 text-[11px] font-bold tabular-nums ring-1 ring-black/5 hover:bg-white dark:bg-black/25 dark:ring-white/10"
            title="Аудиторія"
          >
            {l.room}
          </NavLink>
        )}
      </div>
      <div className={clsx("mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 opacity-85", large ? "text-[13px]" : "text-[12px]")}>
        {l.room && mode !== "room" && !large && (
          <NavLink to={{ kind: "room", key: l.room }} className="rounded bg-white/60 px-1 font-bold tabular-nums ring-1 ring-black/5 hover:bg-white dark:bg-black/25 dark:ring-white/10" title="Аудиторія">
            {l.room === "кфв" ? "кфв" : `ауд. ${l.room}`}
          </NavLink>
        )}
        {mode !== "teacher" && l.teacher && l.teacherId && (
          <NavLink to={{ kind: "teacher", key: String(l.teacherId) }} className={linkCls}>
            {l.teacher}
          </NavLink>
        )}
        {mode !== "group" && (
          <NavLink to={{ kind: "group", key: l.group }} className={clsx(linkCls, "font-semibold")}>
            {l.group}
          </NavLink>
        )}
        {(l.week !== "all" || l.subgroup > 0) && (
          <span className="flex gap-1">
            {l.week !== "all" && <Tag>{l.week === "num" ? "чис." : "знам."}</Tag>}
            {l.subgroup > 0 && <Tag>{l.subgroup} підгр.</Tag>}
          </span>
        )}
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-black/[0.06] px-1.5 py-px text-[10px] font-bold uppercase tracking-wide dark:bg-white/10">
      {children}
    </span>
  );
}

export function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; badge?: string }[];
}) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-line bg-surface p-1 shadow-card">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap transition sm:px-3",
            value === o.value ? "bg-ink text-bg" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
          {o.badge && (
            <span className={clsx("rounded-full px-1.5 text-[10px] font-bold", value === o.value ? "bg-accent text-white" : "bg-accent-soft text-accent")}>
              {o.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

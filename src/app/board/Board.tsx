"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";
import { Maximize } from "lucide-react";
import { describeLesson, roomOnly, type ChangeDTO } from "@/lib/changes";
import { currentPair, formatDate, kyivNow, toMinutes, type BellDTO } from "@/lib/schedule";

type Props = {
  today: string;
  next: string;
  parity: "num" | "den";
  semester: string;
  bells: BellDTO[];
  changes: ChangeDTO[];
  free: Record<number, string[]>;
  roomsTotal: number;
  url: string;
  qr: string;
};

const ROTATE_MS = 12_000;

const clock = (d: Date) => d.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Kyiv" });
const plural = (n: number, one: string, few: string, many: string) =>
  n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;
const mins = (n: number) => (n >= 60 ? `${Math.floor(n / 60)} год ${n % 60} хв` : `${n} ${plural(n, "хвилина", "хвилини", "хвилин")}`);

type Row = { kind: "head"; label: string } | { kind: "change"; change: ChangeDTO };

export default function Board(props: Props) {
  const { today, next, bells, changes, free, roomsTotal } = props;
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [page, setPage] = useState(0);
  const [idle, setIdle] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [perPage, setPerPage] = useState(7);
  const listRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const fit = () => {
      const em = parseFloat(getComputedStyle(el).fontSize);
      setPerPage(Math.max(4, Math.floor((el.clientHeight - 3 * em) / (3.6 * em))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setNow(new Date());
    const tick = setInterval(() => setNow(new Date()), 1000);
    const refresh = setInterval(() => router.refresh(), 60_000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [router]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 3000);
    };
    wake();
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    window.addEventListener("mousemove", wake);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", wake);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, []);

  useEffect(() => {
    let lock: { release(): Promise<void> } | null = null;
    const request = () =>
      (navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock
        ?.request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, []);

  const k = now ? kyivNow(now) : null;
  const weekend = !!k && k.weekday > 5;
  const cur = k && !weekend ? currentPair(bells, k.minutes) : null;
  const finished = !!k && !weekend && !cur;
  const bell = cur && bells.find((b) => b.pair === cur.pair);

  const rows = useMemo(() => {
    const section = (date: string, label: string): Row[] => {
      const list = changes.filter((c) => c.date === date).sort((a, b) => a.group.localeCompare(b.group, "uk") || a.pair - b.pair);
      return list.length ? [{ kind: "head", label: `${label}, ${formatDate(date, { weekday: "long", day: "numeric", month: "long" })}` }, ...list.map((c) => ({ kind: "change" as const, change: c }))] : [];
    };
    const t = weekend ? [] : section(today, "Сьогодні");
    const n = section(next, weekend ? "Найближчий робочий день" : "Завтра");
    return finished || weekend ? [...n, ...t] : [...t, ...n];
  }, [changes, today, next, weekend, finished]);

  const pages = useMemo(() => {
    const out: Row[][] = [];
    let cur: Row[] = [];
    for (const r of rows) {
      if (cur.length >= perPage || (r.kind === "head" && cur.length >= perPage - 1)) {
        out.push(cur);
        const head = [...cur].reverse().find((x) => x.kind === "head");
        cur = r.kind === "change" && head ? [{ kind: "head", label: `${(head as { label: string }).label} (продовження)` }] : [];
      }
      cur.push(r);
    }
    if (cur.length) out.push(cur);
    return out;
  }, [rows, perPage]);

  useEffect(() => {
    if (pages.length < 2) return setPage(0);
    const t = setInterval(() => setPage((p) => (p + 1) % pages.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [pages.length]);

  const visible = pages[page % Math.max(pages.length, 1)] ?? [];
  const freePair = cur?.pair ?? null;
  const freeRooms = freePair ? (free[freePair] ?? []) : [];

  let status: React.ReactNode = null;
  let progress: number | null = null;
  if (k && bell && cur?.live) {
    const left = toMinutes(bell.end) - k.minutes;
    progress = (k.minutes - toMinutes(bell.start)) / (toMinutes(bell.end) - toMinutes(bell.start));
    status = (
      <>
        <b>{cur.pair} пара</b> · {bell.start}–{bell.end} <span className="opacity-70">· до дзвінка {mins(left)}</span>
      </>
    );
  } else if (k && bell) {
    const until = toMinutes(bell.start) - k.minutes;
    status = (
      <>
        {cur!.pair === bells[0]?.pair ? "Початок занять" : "Перерва"} · <b>{cur!.pair} пара</b> о {bell.start} <span className="opacity-70">· через {mins(until)}</span>
      </>
    );
  } else if (finished) status = "Пари на сьогодні завершено";
  else if (weekend) status = "Вихідний день";

  return (
    <div
      className={clsx("flex h-dvh flex-col overflow-hidden bg-[#1d2260] text-white", idle && "cursor-none")}
      style={{ fontSize: "clamp(13px, 1.04vw, 34px)" }}
    >
      <header className="flex items-center gap-[1.2em] border-b border-white/15 px-[2em] py-[1em]">
        <Image src="/logo-lit.jpg" alt="" width={96} height={96} className="size-[3.6em] rounded-full bg-white" priority />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[1.9em] font-semibold tracking-tight">Розклад занять</p>
          <p className="text-[0.95em] opacity-70">Фаховий коледж інформаційних технологій НУ «Львівська політехніка» · {props.semester}</p>
        </div>
        <div className="text-right leading-tight">
          <p className="text-[3.6em] font-semibold tabular-nums">{now ? clock(now) : "--:--"}</p>
          <p className="text-[1.05em] opacity-80">
            {formatDate(today, { weekday: "long", day: "numeric", month: "long" })} ·{" "}
            <b className="text-[#ffb27a]">{props.parity === "num" ? "чисельник" : "знаменник"}</b>
          </p>
        </div>
      </header>

      <div className="relative bg-[#252b6b] px-[2em] py-[0.8em] text-[1.6em]">
        {status ?? " "}
        {progress !== null && <div className="absolute bottom-0 left-0 h-[0.18em] bg-[#f26b1d] transition-[width] duration-1000" style={{ width: `${progress * 100}%` }} />}
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-[2em] px-[2em] py-[1.5em]">
        <section ref={listRef} className="flex min-h-0 flex-col">
          <div className="mb-[0.6em] flex items-baseline justify-between">
            <h2 className="text-[1.7em] font-semibold">Зміни в розкладі</h2>
            {pages.length > 1 && (
              <div className="flex gap-[0.4em]" aria-hidden>
                {pages.map((_, i) => (
                  <span key={i} className={clsx("size-[0.6em] rounded-full", i === page % pages.length ? "bg-white" : "bg-white/25")} />
                ))}
              </div>
            )}
          </div>
          {rows.length === 0 ? (
            <p className="mt-[1em] text-[1.5em] opacity-70">Замін немає. Заняття — за основним розкладом.</p>
          ) : (
            <div key={page} className="board-page min-h-0 flex-1">
              {visible.map((r, i) =>
                r.kind === "head" ? (
                  <p key={`h${i}`} className="mt-[0.8em] mb-[0.3em] text-[1.05em] font-medium uppercase tracking-wide text-[#ffb27a] first:mt-0">
                    {r.label}
                  </p>
                ) : (
                  <ChangeRow key={r.change.id} c={r.change} />
                ),
              )}
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col gap-[1.6em]">
          {freePair && (
            <section>
              <h2 className="text-[1.3em] font-semibold">
                Вільні аудиторії на {freePair} пару <span className="font-normal opacity-60">· {freeRooms.length} з {roomsTotal}</span>
              </h2>
              <div className="mt-[0.6em] flex flex-wrap gap-[0.4em]">
                {freeRooms.slice(0, 36).map((r) => (
                  <span key={r} className="rounded-[0.3em] bg-white/10 px-[0.5em] py-[0.15em] text-[1.05em] font-medium tabular-nums">
                    {r}
                  </span>
                ))}
                {freeRooms.length > 36 && <span className="px-[0.3em] py-[0.15em] opacity-60">+{freeRooms.length - 36}</span>}
              </div>
            </section>
          )}
          <section>
            <h2 className="text-[1.3em] font-semibold">Дзвінки</h2>
            <table className="mt-[0.4em] w-full text-[1.1em] tabular-nums">
              <tbody>
                {bells.map((b) => {
                  const active = cur?.pair === b.pair;
                  const done = k && !weekend && k.minutes >= toMinutes(b.end);
                  return (
                    <tr key={b.pair} className={clsx("border-b border-white/10", active && (cur?.live ? "bg-[#bf4f0c] text-white" : "bg-white/10"), done && "opacity-60")}>
                      <td className="py-[0.25em] pl-[0.5em] font-semibold">{b.pair} пара</td>
                      <td className="py-[0.25em] pr-[0.5em] text-right">
                        {b.start}–{b.end}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <section className="mt-auto flex items-center gap-[1em] rounded-[0.5em] bg-white p-[0.8em] text-[#1d2260]">
            <div className="size-[6.5em] shrink-0 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: props.qr }} />
            <div className="leading-snug">
              <p className="text-[1.15em] font-semibold">Розклад у телефоні</p>
              <p className="font-medium">{props.url}</p>
              <p className="mt-[0.3em] text-[0.9em] opacity-75">Знайдіть свою групу й увімкніть сповіщення про заміни</p>
            </div>
          </section>
        </aside>
      </main>

      {!fullscreen && !idle && (
        <button
          onClick={() => document.documentElement.requestFullscreen().catch(() => {})}
          className="fixed right-[1em] bottom-[1em] inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-sm hover:bg-white/25"
        >
          <Maximize className="size-4" /> На весь екран
        </button>
      )}
    </div>
  );
}

function ChangeRow({ c }: { c: ChangeDTO }) {
  const room = roomOnly(c);
  const label = c.cancelled ? "Скасовано" : room ? "Інша аудиторія" : c.replaces.length ? "Заміна" : "Додатково";
  return (
    <div className="flex items-baseline gap-[0.8em] border-b border-white/10 py-[0.45em]">
      <span className="w-[5.2em] shrink-0 text-[1.45em] font-semibold">{c.group}</span>
      <span className="w-[4.2em] shrink-0 text-[1.2em] tabular-nums opacity-80">{c.pair} пара</span>
      <div className="min-w-0 flex-1 text-[1.2em]">
        <p className="line-clamp-2">
          <span className={clsx("mr-[0.4em] rounded-[0.25em] px-[0.35em] text-[0.8em] font-semibold uppercase", c.cancelled ? "bg-[#c23b3b]" : room ? "bg-[#2f6fb5]" : "bg-[#bf4f0c]")}>{label}</span>
          {c.cancelled ? (
            c.replaces.map((r) => r.subject).join(", ") || "пара"
          ) : room ? (
            <>
              {c.subject} — <b>ауд. {c.room ?? "—"}</b> <span className="opacity-60">замість {c.replaces.map((r) => r.room ?? "—").join(", ")}</span>
            </>
          ) : (
            describeLesson(c)
          )}
          {c.subgroup > 0 && <span className="opacity-60"> · {c.subgroup} підгрупа</span>}
        </p>
        {!c.cancelled && !room && c.replaces.length > 0 && <p className="line-clamp-1 text-[0.8em] opacity-60">замість: {c.replaces.map(describeLesson).join("; ")}</p>}
        {c.note && <p className="line-clamp-1 text-[0.8em] opacity-60">{c.note}</p>}
      </div>
    </div>
  );
}

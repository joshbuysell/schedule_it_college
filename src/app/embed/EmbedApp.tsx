"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { CalendarPlus, ChevronLeft, DoorOpen, ExternalLink, GraduationCap, Search, UserRound } from "lucide-react";
import Timetable, { TimetableNav, type OpenTarget } from "@/components/Timetable";
import TodayBadge from "@/components/TodayBadge";
import { layoutSwap, normalizeQuery, translit, type BellDTO, type LessonDTO, type Week } from "@/lib/schedule";
import { encodeSelection } from "@/lib/selection";
import type { SearchIndex } from "@/lib/queries";

const STORAGE_KEY = "itc-rozklad:last";

type Props = {
  index: SearchIndex;
  bells: BellDTO[];
  parity: Exclude<Week, "all">;
  semesterLabel: string;
  initial: OpenTarget | null;
  initialLessons: LessonDTO[] | null;
};

/** Повідомлення для сторінки-господаря (embed.js) */
function post(msg: Record<string, unknown>) {
  if (window.parent !== window) window.parent.postMessage({ source: "itc-rozklad", ...msg }, "*");
}

export default function EmbedApp({ index, bells, parity, semesterLabel, initial, initialLessons }: Props) {
  const [selected, setSelected] = useState<OpenTarget | null>(initial);
  const [lessons, setLessons] = useState<LessonDTO[] | null>(initialLessons);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<OpenTarget[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Автовисота: повідомляємо сторінку коледжу про висоту вмісту
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const send = () => post({ type: "height", height: Math.ceil(el.getBoundingClientRect().height) });
    const ro = new ResizeObserver(send);
    ro.observe(el);
    send();
    return () => ro.disconnect();
  }, []);

  const load = useCallback(async (t: OpenTarget) => {
    setLoading(true);
    const url =
      t.kind === "group" ? `/api/v1/groups/${encodeURIComponent(t.key)}` : t.kind === "teacher" ? `/api/v1/teachers/${t.key}` : `/api/v1/rooms/${encodeURIComponent(t.key)}`;
    const res = await fetch(url).catch(() => null);
    const data = res?.ok ? await res.json() : null;
    setLoading(false);
    if (!data) return false;
    setLessons(data.lessons);
    return true;
  }, []);

  const open = useCallback(
    async (t: OpenTarget | null, how: "push" | "back" | "reset" = "reset") => {
      if (how === "push" && selected) setHistory((h) => [...h, selected]);
      if (how === "back") setHistory((h) => h.slice(0, -1));
      if (how === "reset") setHistory([]);
      setSelected(t);
      if (!t) {
        post({ type: "select", value: "" });
        return;
      }
      setLessons(null);
      if (await load(t)) {
        post({ type: "select", value: encodeSelection(t) });
        try {
          localStorage.setItem(STORAGE_KEY, encodeSelection(t));
        } catch {}
      }
      post({ type: "scroll" });
    },
    [load, selected],
  );

  // Повертаємо студента до його групи, якщо в адресі нічого не вказано
  useEffect(() => {
    if (initial) {
      try {
        localStorage.setItem(STORAGE_KEY, encodeSelection(initial));
      } catch {}
      return;
    }
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      const m = last?.match(/^([gtr]):(.+)$/);
      if (m) open({ kind: m[1] === "g" ? "group" : m[1] === "t" ? "teacher" : "room", key: m[2] });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const info = useMemo(() => describe(selected, index), [selected, index]);

  return (
    <div ref={rootRef} className="mx-auto max-w-6xl px-1 pb-4 pt-1 text-[15px]">
      <TimetableNav.Provider value={(t) => open(t, "push")}>
        {/* Шапка віджета */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand px-4 py-3 text-brand-ink sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-75">{semesterLabel}</p>
            <p className="text-lg font-bold leading-tight">Розклад занять</p>
          </div>
          <TodayBadge bells={bells} parity={parity} onBrand />
        </div>

        {!selected ? (
          <Picker index={index} onPick={(t) => open(t)} />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <button
                  onClick={() => open(history.length ? history[history.length - 1] : null, "back")}
                  className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
                >
                  <ChevronLeft className="size-4" />
                  {history.length ? `Назад до ${describe(history[history.length - 1], index).title}` : "Вибрати іншу групу чи викладача"}
                </button>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">{info.eyebrow}</p>
                <h2 className="text-2xl font-bold leading-tight sm:text-3xl">{info.title}</h2>
                {info.subtitle && <p className="text-sm text-ink-2">{info.subtitle}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.kind === "group" && (
                  <a
                    href={`/api/v1/groups/${encodeURIComponent(selected.key)}/ics`}
                    className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
                  >
                    <CalendarPlus className="size-4" /> У календар
                  </a>
                )}
                <a
                  href={info.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
                >
                  <ExternalLink className="size-4" /> На весь екран
                </a>
              </div>
            </div>

            {lessons === null || loading ? (
              <div className="space-y-2">
                <div className="h-10 w-72 animate-pulse rounded-xl bg-surface-2" />
                <div className="h-[420px] animate-pulse rounded-2xl bg-surface-2" />
              </div>
            ) : (
              <Timetable
                lessons={lessons}
                bells={bells}
                parity={parity}
                mode={selected.kind}
                storageKey={selected.kind === "group" ? selected.key : undefined}
              />
            )}
          </>
        )}

        <p className="mt-4 text-center text-xs text-ink-3">
          Знайшли помилку в розкладі? Зверніться до навчальної частини коледжу.
        </p>
      </TimetableNav.Provider>
    </div>
  );
}

function describe(t: OpenTarget | null, index: SearchIndex) {
  if (!t) return { title: "", eyebrow: "", subtitle: "", href: "/" };
  if (t.kind === "group") {
    const g = index.groups.find((x) => x.name === t.key);
    return { title: t.key, eyebrow: g ? `${g.course} курс` : "Група", subtitle: g?.specialty ?? "", href: `/group/${encodeURIComponent(t.key)}` };
  }
  if (t.kind === "teacher") {
    const p = index.teachers.find((x) => String(x.id) === t.key);
    return {
      title: p?.fullName ?? p?.shortName ?? "Викладач",
      eyebrow: "Викладач",
      subtitle: p?.commission ? `Циклова комісія ${p.commission.toLowerCase()}` : "",
      href: `/teacher/${t.key}`,
    };
  }
  return { title: t.key === "кфв" ? "Спорткомплекс" : `Аудиторія ${t.key}`, eyebrow: "Аудиторія", subtitle: "", href: `/room/${encodeURIComponent(t.key)}` };
}

/** Вибір групи / викладача / аудиторії з пошуком */
function Picker({ index, onPick }: { index: SearchIndex; onPick: (t: OpenTarget) => void }) {
  const [tab, setTab] = useState<"groups" | "teachers">("groups");
  const [q, setQ] = useState("");

  const variants = useMemo(() => [...new Set([q, layoutSwap(q), translit(q)].map(normalizeQuery).filter(Boolean))], [q]);
  const hit = useCallback((s: string) => !variants.length || variants.some((v) => normalizeQuery(s).includes(v)), [variants]);

  const groups = index.groups.filter((g) => hit(g.name));
  const teachers = index.teachers.filter((t) => hit(t.shortName) || hit(t.fullName ?? ""));
  const rooms = q ? index.rooms.filter((r) => hit(r.name)) : [];
  const searching = variants.length > 0;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <label className="flex h-13 items-center gap-3 rounded-xl border-2 border-line bg-surface-2 px-4 focus-within:border-brand focus-within:bg-surface">
        <Search className="size-5 text-ink-3" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ваша група або прізвище викладача — напр. КІ-21, Кубик"
          className="h-12 w-full bg-transparent text-base font-medium outline-none placeholder:text-ink-3"
          aria-label="Пошук групи чи викладача"
        />
      </label>

      {searching ? (
        <div className="mt-4 space-y-4">
          {groups.length > 0 && (
            <Section title="Групи" icon={GraduationCap}>
              <Chips items={groups.map((g) => ({ key: g.name, label: g.name }))} onPick={(k) => onPick({ kind: "group", key: k })} />
            </Section>
          )}
          {teachers.length > 0 && (
            <Section title="Викладачі" icon={UserRound}>
              <TeacherList teachers={teachers} onPick={onPick} />
            </Section>
          )}
          {rooms.length > 0 && (
            <Section title="Аудиторії" icon={DoorOpen}>
              <Chips items={rooms.map((r) => ({ key: r.name, label: r.name === "кфв" ? "Спорткомплекс" : r.name }))} onPick={(k) => onPick({ kind: "room", key: k })} />
            </Section>
          )}
          {!groups.length && !teachers.length && !rooms.length && (
            <p className="py-6 text-center text-ink-3">Нічого не знайдено. Перевірте назву групи, напр. «КН-21».</p>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 inline-flex rounded-xl bg-surface-2 p-1">
            {(
              [
                ["groups", "Групи"],
                ["teachers", "Викладачі"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={clsx("rounded-lg px-4 py-1.5 text-sm font-semibold", tab === k ? "bg-brand text-brand-ink shadow-sm" : "text-ink-2 hover:text-ink")}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "groups" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((course) => {
                const items = index.groups.filter((g) => g.course === course);
                if (!items.length) return null;
                return (
                  <div key={course} className="rounded-xl border border-line p-3">
                    <p className="mb-2 text-sm font-bold">
                      {course} курс <span className="font-normal text-ink-3">· {items.length}</span>
                    </p>
                    <Chips items={items.map((g) => ({ key: g.name, label: g.name }))} onPick={(k) => onPick({ kind: "group", key: k })} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4">
              <TeacherList teachers={index.teachers} onPick={onPick} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Search; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-3">
        <Icon className="size-3.5" /> {title}
      </p>
      {children}
    </section>
  );
}

function Chips({ items, onPick }: { items: { key: string; label: string }[]; onPick: (key: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <button
          key={i.key}
          onClick={() => onPick(i.key)}
          className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-sm font-semibold tabular-nums transition hover:border-brand hover:bg-brand hover:text-brand-ink"
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

function TeacherList({ teachers, onPick }: { teachers: SearchIndex["teachers"]; onPick: (t: OpenTarget) => void }) {
  const sorted = [...teachers].sort((a, b) => a.shortName.localeCompare(b.shortName, "uk"));
  return (
    <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((t) => (
        <button
          key={t.id}
          onClick={() => onPick({ kind: "teacher", key: String(t.id) })}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-brand-soft"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
            {t.shortName.split(" ")[0][0]}
            {t.shortName.split(" ")[1]?.[0]}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{t.fullName ?? t.shortName}</span>
            {t.fullName && <span className="block truncate text-xs text-ink-3">{t.shortName}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

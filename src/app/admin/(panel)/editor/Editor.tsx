"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, ExternalLink, GripVertical, Plus, Search, X } from "lucide-react";
import type { Dictionaries } from "@/lib/admin";
import { conflictKind, findConflicts } from "@/lib/conflicts";
import { DAYS, normalizeQuery, subjectHue, type BellDTO, type LessonDTO } from "@/lib/schedule";
import SlotDrawer from "./SlotDrawer";

export type Toast = { id: number; text: string; tone?: "ok" | "danger"; action?: { label: string; run: () => void } };

type Props = {
  initialDict: Dictionaries;
  initialLessons: LessonDTO[];
  bells: BellDTO[];
  initialGroup?: string;
  initialSlot?: string;
};

const PAIRS = [1, 2, 3, 4, 5, 6];

export default function Editor({ initialDict, initialLessons, bells, initialGroup, initialSlot }: Props) {
  const [dict, setDict] = useState(initialDict);
  const [lessons, setLessons] = useState(initialLessons);
  const [groupId, setGroupId] = useState(
    () => initialDict.groups.find((g) => g.name === initialGroup)?.id ?? initialDict.groups[0]?.id,
  );
  const [slot, setSlot] = useState<{ day: number; pair: number } | null>(() => {
    const m = initialSlot?.match(/^(\d)\.(\d)$/);
    return m ? { day: +m[1], pair: +m[2] } : null;
  });
  const [focusLesson, setFocusLesson] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const group = dict.groups.find((g) => g.id === groupId);
  const sharedRooms = useMemo(() => new Set(dict.rooms.filter((r) => r.shared).map((r) => r.id)), [dict.rooms]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), t.action ? 7000 : 3500);
  }, []);

  // Синхронізуємо URL, щоб посиланням можна було поділитися
  useEffect(() => {
    if (!group) return;
    const url = new URL(window.location.href);
    url.searchParams.set("group", group.name);
    if (slot) url.searchParams.set("slot", `${slot.day}.${slot.pair}`);
    else url.searchParams.delete("slot");
    window.history.replaceState(null, "", url);
  }, [group, slot]);

  const conflicts = useMemo(() => findConflicts(lessons, sharedRooms), [lessons, sharedRooms]);
  const conflictGroups = useMemo(() => {
    const s = new Map<number, number>();
    for (const c of conflicts) for (const l of c.lessons) s.set(l.groupId, (s.get(l.groupId) ?? 0) + 1);
    return s;
  }, [conflicts]);

  const groupLessons = useMemo(() => lessons.filter((l) => l.groupId === groupId), [lessons, groupId]);
  const bySlot = useMemo(() => {
    const m = new Map<string, LessonDTO[]>();
    for (const l of lessons) m.set(`${l.day}.${l.pair}`, [...(m.get(`${l.day}.${l.pair}`) ?? []), l]);
    return m;
  }, [lessons]);

  /** Опис накладок для конкретного заняття: з ким і через що конфліктує. */
  const issuesFor = useCallback(
    (l: Pick<LessonDTO, "id" | "day" | "pair" | "week" | "subgroup" | "groupId" | "teacherId" | "roomId"> & Partial<LessonDTO>) => {
      const out: { kind: string; other: LessonDTO }[] = [];
      for (const o of bySlot.get(`${l.day}.${l.pair}`) ?? []) {
        const kind = conflictKind(l as LessonDTO, o, sharedRooms);
        if (kind) out.push({ kind, other: o });
      }
      return out;
    },
    [bySlot, sharedRooms],
  );

  const refreshDict = useCallback(async () => {
    const res = await fetch("/api/admin/dict");
    if (res.ok) setDict(await res.json());
  }, []);

  const upsertLocal = (l: LessonDTO) => setLessons((ls) => (ls.some((x) => x.id === l.id) ? ls.map((x) => (x.id === l.id ? l : x)) : [...ls, l]));
  const removeLocal = (id: number) => setLessons((ls) => ls.filter((x) => x.id !== id));

  async function moveLesson(id: number, day: number, pair: number) {
    const l = lessons.find((x) => x.id === id);
    if (!l || (l.day === day && l.pair === pair)) return;
    upsertLocal({ ...l, day, pair }); // оптимістично
    const res = await fetch(`/api/admin/lessons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day, pair }),
    });
    if (!res.ok) {
      upsertLocal(l);
      toast({ text: "Не вдалося перемістити заняття", tone: "danger" });
      return;
    }
    const { lesson } = await res.json();
    upsertLocal(lesson);
    const issues = issuesFor(lesson);
    toast(
      issues.length
        ? { text: `Переміщено, але є накладка: ${issues[0].other.group}`, tone: "danger" }
        : { text: `${lesson.subject} → ${DAYS[day - 1]}, ${pair} пара`, tone: "ok" },
    );
  }

  const visibleGroups = useMemo(() => {
    const q = normalizeQuery(filter);
    return dict.groups.filter((g) => !q || normalizeQuery(g.name).includes(q));
  }, [dict.groups, filter]);
  const lessonCount = useMemo(() => {
    const m = new Map<number, number>();
    for (const l of lessons) m.set(l.groupId, (m.get(l.groupId) ?? 0) + 1);
    return m;
  }, [lessons]);

  if (!group) return <p className="p-8">Немає жодної групи. Додайте групу в довідниках.</p>;

  const slotLessons = slot ? groupLessons.filter((l) => l.day === slot.day && l.pair === slot.pair) : [];
  const weekly = groupLessons.reduce((s, l) => s + (l.week === "all" ? 1 : 0.5) / (l.subgroup ? 2 : 1), 0);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      {/* Список груп */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="border-b border-line p-3">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 focus-within:border-brand">
            <Search className="size-4 text-ink-3" />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Знайти групу" className="w-full bg-transparent text-sm outline-none" />
          </label>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {[1, 2, 3, 4].map((course) => {
            const items = visibleGroups.filter((g) => g.course === course);
            if (!items.length) return null;
            return (
              <div key={course} className="mb-2">
                <p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-3">{course} курс</p>
                {items.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setGroupId(g.id);
                      setSlot(null);
                    }}
                    className={clsx(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm",
                      g.id === groupId ? "bg-brand text-brand-ink" : "hover:bg-surface-2",
                    )}
                  >
                    <span className="font-bold">{g.name}</span>
                    <span className="flex items-center gap-1.5">
                      {conflictGroups.has(g.id) && (
                        <span className={clsx("size-2 rounded-full", g.id === groupId ? "bg-white" : "bg-danger")} title="Є накладки" />
                      )}
                      <span className={clsx("text-xs tabular-nums", g.id === groupId ? "opacity-80" : "text-ink-3")}>{lessonCount.get(g.id) ?? 0}</span>
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Сітка */}
      <section className="min-w-0 flex-1 overflow-auto bg-bg">
        <div className="mx-auto max-w-[1400px] p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <select
                value={groupId}
                onChange={(e) => {
                  setGroupId(+e.target.value);
                  setSlot(null);
                }}
                className="mb-2 rounded-lg border border-line bg-surface px-2 py-1 text-sm font-semibold lg:hidden"
                aria-label="Група"
              >
                {dict.groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <p className="text-xs font-bold uppercase tracking-wider text-brand">
                {group.course} курс · {group.specialty}
              </p>
              <h1 className="font-display text-3xl font-bold">{group.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-xl border border-line bg-surface px-3 py-2">
                <b>{weekly}</b> <span className="text-ink-3">пар/тиждень</span>
              </span>
              {conflictGroups.get(group.id) ? (
                <span className="flex items-center gap-1.5 rounded-xl bg-danger-soft px-3 py-2 font-semibold text-danger">
                  <AlertTriangle className="size-4" /> {conflictGroups.get(group.id)} накладок
                </span>
              ) : (
                <span className="rounded-xl bg-surface px-3 py-2 font-semibold text-ok ring-1 ring-line">Без накладок</span>
              )}
              <Link
                href={`/group/${encodeURIComponent(group.name)}`}
                target="_blank"
                className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 font-semibold hover:border-ink-3"
              >
                Як бачать студенти <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>

          <p className="mb-3 text-sm text-ink-3">
            Натисніть на клітинку, щоб додати чи змінити пару. Перетягніть картку, щоб перенести заняття.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
            <div className="grid min-w-[860px]" style={{ gridTemplateColumns: "76px repeat(5, minmax(0, 1fr))" }}>
              <div className="border-b border-line bg-surface-2" />
              {DAYS.map((d) => (
                <div key={d} className="border-b border-l border-line bg-surface-2 px-3 py-2.5 text-sm font-bold">{d}</div>
              ))}
              {PAIRS.map((p) => {
                const bell = bells.find((b) => b.pair === p);
                return (
                  <Row key={p}>
                    <div className="border-b border-line bg-surface-2 px-3 py-2">
                      <div className="font-display text-lg font-bold leading-none">{p}</div>
                      <div className="mt-1 text-[11px] font-semibold tabular-nums text-ink-3">{bell?.start}<br />{bell?.end}</div>
                    </div>
                    {DAYS.map((_, i) => {
                      const day = i + 1;
                      const key = `${day}.${p}`;
                      const items = groupLessons.filter((l) => l.day === day && l.pair === p);
                      const selected = slot?.day === day && slot.pair === p;
                      return (
                        <div
                          key={key}
                          onClick={() => {
                            setSlot({ day, pair: p });
                            setFocusLesson(null);
                          }}
                          onDragOver={(e) => {
                            if (dragId === null) return;
                            e.preventDefault();
                            setDropTarget(key);
                          }}
                          onDragLeave={() => setDropTarget((t) => (t === key ? null : t))}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (dragId !== null) moveLesson(dragId, day, p);
                            setDragId(null);
                            setDropTarget(null);
                          }}
                          className={clsx(
                            "group/cell relative min-h-[96px] cursor-pointer border-b border-l border-line p-1.5 transition",
                            selected ? "bg-brand-soft ring-2 ring-inset ring-brand" : "hover:bg-surface-2",
                            dropTarget === key && "bg-brand-soft ring-2 ring-inset ring-brand",
                          )}
                        >
                          <div className="flex h-full flex-col gap-1.5">
                            {items.map((l) => {
                              const issues = issuesFor(l);
                              return (
                                <div
                                  key={l.id}
                                  draggable
                                  onDragStart={(e) => {
                                    setDragId(l.id);
                                    e.dataTransfer.effectAllowed = "move";
                                  }}
                                  onDragEnd={() => {
                                    setDragId(null);
                                    setDropTarget(null);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSlot({ day, pair: p });
                                    setFocusLesson(l.id);
                                  }}
                                  className={clsx(
                                    "lesson group/card relative cursor-grab rounded-lg px-2 py-1.5 active:cursor-grabbing",
                                    dragId === l.id && "opacity-40",
                                    issues.length && "outline-2 outline-danger",
                                  )}
                                  style={{ "--h": subjectHue(l.subject) } as React.CSSProperties}
                                  title={issues.map((x) => `Накладка: ${x.other.group} · ${x.other.subject}`).join("\n") || undefined}
                                >
                                  <GripVertical className="absolute right-1 top-1.5 size-3.5 opacity-0 transition group-hover/card:opacity-50" />
                                  <p className="pr-3 text-[12.5px] font-bold leading-snug">{l.subject}</p>
                                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] opacity-85">
                                    <span>{l.teacher ?? "—"}</span>
                                    {l.room && <span className="font-bold">· {l.room}</span>}
                                    {l.week !== "all" && <Badge>{l.week === "num" ? "чис" : "знам"}</Badge>}
                                    {l.subgroup > 0 && <Badge>{l.subgroup} пгр</Badge>}
                                  </p>
                                  {issues.length > 0 && (
                                    <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-danger text-white">
                                      <AlertTriangle className="size-3" />
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            {items.length === 0 && (
                              <span className="m-auto flex items-center gap-1 text-xs font-semibold text-ink-3 opacity-0 transition group-hover/cell:opacity-100">
                                <Plus className="size-3.5" /> Додати
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </Row>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {slot && (
        <SlotDrawer
          key={`${groupId}-${slot.day}-${slot.pair}`}
          group={group}
          slot={slot}
          bell={bells.find((b) => b.pair === slot.pair)}
          lessons={slotLessons}
          allLessons={lessons}
          dict={dict}
          focusLesson={focusLesson}
          issuesFor={issuesFor}
          onClose={() => setSlot(null)}
          onSaved={(l, created) => {
            upsertLocal(l);
            const issues = issuesFor(l);
            toast(issues.length ? { text: `Збережено, але є накладка з ${issues[0].other.group}`, tone: "danger" } : { text: created ? "Пару додано" : "Зміни збережено", tone: "ok" });
            refreshDict();
          }}
          onDeleted={(l) => {
            removeLocal(l.id);
            toast({
              text: `Видалено «${l.subject}»`,
              action: {
                label: "Повернути",
                run: async () => {
                  const res = await fetch("/api/admin/lessons", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ groupId: l.groupId, day: l.day, pair: l.pair, week: l.week, subgroup: l.subgroup, subject: l.subject, teacher: l.teacher, room: l.room }),
                  });
                  if (res.ok) upsertLocal((await res.json()).lesson);
                },
              },
            });
          }}
        />
      )}

      {/* Сповіщення */}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "fade-up pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-card",
              t.tone === "danger" ? "bg-danger text-white" : "bg-ink text-bg",
            )}
          >
            {t.text}
            {t.action && (
              <button
                onClick={() => {
                  t.action!.run();
                  setToasts((ts) => ts.filter((x) => x.id !== t.id));
                }}
                className="rounded-md bg-white/20 px-2 py-0.5 hover:bg-white/30"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))} aria-label="Закрити" className="opacity-70 hover:opacity-100">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-black/[0.07] px-1 text-[9.5px] font-bold uppercase dark:bg-white/10">{children}</span>;
}

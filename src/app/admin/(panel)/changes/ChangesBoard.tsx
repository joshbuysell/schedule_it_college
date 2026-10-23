"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, LoaderCircle, Trash2, X } from "lucide-react";
import type { Dictionaries } from "@/lib/admin";
import { changeSummary, describeLesson, type ChangeDTO } from "@/lib/changes";
import { addDays, formatDate, matchesWeek, weekParity, weekdayOf, type BellDTO, type LessonDTO } from "@/lib/schedule";
import Combobox, { type Option } from "../editor/Combobox";

type Props = {
  dict: Dictionaries;
  lessons: LessonDTO[];
  bells: BellDTO[];
  anchor: string;
  initialDate: string;
  today: string;
  initialChanges: ChangeDTO[];
  initialPending: ChangeDTO[];
  focusChange: number | null;
};

type Draft = {
  id?: number;
  groupId: number;
  pair: number;
  subgroup: number;
  subject: string;
  teacher: string;
  room: string;
  note: string;
};

export default function ChangesBoard(props: Props) {
  const { dict, lessons, bells, anchor, today } = props;
  const router = useRouter();
  const [date, setDate] = useState(props.initialDate);
  const [changes, setChanges] = useState(props.initialChanges);
  const [pending, setPending] = useState(props.initialPending);
  const [tab, setTab] = useState<"group" | "teacher">("group");
  const [groupId, setGroupId] = useState<number | null>(null);
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const day = weekdayOf(date);
  const parity = weekParity(anchor, date, day);
  const weekend = day > 5;

  useEffect(() => {
    router.replace(`/admin/changes?date=${date}`, { scroll: false });
    fetch(`/api/admin/changes?date=${date}`)
      .then((r) => r.json())
      .then((d) => setChanges(d.changes ?? []));
  }, [date, router]);

  useEffect(() => {
    const c = props.initialPending.find((p) => p.id === props.focusChange);
    if (c) startFromChange(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dayLessons = useMemo(
    () => (weekend ? [] : lessons.filter((l) => l.day === day && matchesWeek(l.week, parity))),
    [lessons, day, parity, weekend],
  );
  const approved = changes.filter((c) => c.status === "approved");

  const occupied = (pair: number, field: "teacher" | "room", exceptGroup?: number) => {
    const replaced = new Set(approved.filter((c) => c.pair === pair).flatMap((c) => c.replaces.map((r) => r.id)));
    const map = new Map<string, string>();
    for (const l of dayLessons) {
      if (l.pair === pair && l.groupId !== exceptGroup && !replaced.has(l.id) && l[field]) map.set(l[field]!, l.group);
    }
    for (const c of approved) if (c.pair === pair && c.groupId !== exceptGroup && !c.cancelled && c[field]) map.set(c[field]!, c.group);
    return map;
  };

  const teacherOptions = (pair: number, subject: string, exceptGroup?: number): Option[] => {
    const taken = occupied(pair, "teacher", exceptGroup);
    const teaches = new Set(lessons.filter((l) => l.subject === subject).map((l) => l.teacher));
    return dict.teachers
      .map((t) => {
        const b = taken.get(t.shortName);
        return {
          value: t.shortName,
          group: teaches.has(t.shortName) ? `Викладають «${subject}»` : "Усі викладачі",
          hint: b ? `зайнятий · ${b}` : "вільний",
          tone: b ? ("danger" as const) : ("ok" as const),
          rank: (teaches.has(t.shortName) ? 0 : 2) + (b ? 1 : 0),
        };
      })
      .sort((a, b) => a.rank - b.rank || a.value.localeCompare(b.value, "uk"));
  };

  const roomOptions = (pair: number, exceptGroup?: number): Option[] => {
    const taken = occupied(pair, "room", exceptGroup);
    const shared = new Set(dict.rooms.filter((r) => r.shared).map((r) => r.name));
    return dict.rooms
      .map((r) => {
        const b = !shared.has(r.name) && taken.get(r.name);
        return { value: r.name, hint: b ? `зайнята · ${b}` : "вільна", tone: b ? ("danger" as const) : ("ok" as const), rank: b ? 1 : 0 };
      })
      .sort((a, b) => a.rank - b.rank || a.value.localeCompare(b.value, "uk", { numeric: true }));
  };

  function startFromLesson(l: LessonDTO, overrides: Partial<Draft> = {}) {
    setError("");
    setDraft({ groupId: l.groupId, pair: l.pair, subgroup: l.subgroup, subject: l.subject, teacher: l.teacher ?? "", room: l.room ?? "", note: "", ...overrides });
  }

  function startFromChange(c: ChangeDTO) {
    setError("");
    if (c.date !== date) setDate(c.date);
    setTab("group");
    setGroupId(c.groupId);
    const base = c.replaces[0];
    setDraft({
      id: c.id,
      groupId: c.groupId,
      pair: c.pair,
      subgroup: c.subgroup,
      subject: c.subject ?? base?.subject ?? "",
      teacher: c.status === "pending" && c.cancelled ? "" : (c.teacher ?? ""),
      room: c.room ?? base?.room ?? "",
      note: c.status === "pending" ? "" : (c.note ?? ""),
    });
  }

  async function send(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Не вдалося зберегти");
      return null;
    }
    return data;
  }

  async function refresh() {
    const [d, p] = await Promise.all([
      fetch(`/api/admin/changes?date=${date}`).then((r) => r.json()),
      fetch(`/api/admin/changes?status=pending`).then((r) => r.json()),
    ]);
    setChanges(d.changes ?? []);
    setPending(p.changes ?? []);
    router.refresh();
  }

  async function saveDraft(cancelled: boolean) {
    if (!draft) return;
    const body = {
      date,
      groupId: draft.groupId,
      pair: draft.pair,
      subgroup: draft.subgroup,
      cancelled,
      subject: cancelled ? null : draft.subject,
      teacher: cancelled ? null : draft.teacher || null,
      room: cancelled ? null : draft.room || null,
      note: draft.note || null,
    };
    const ok = draft.id ? await send(`/api/admin/changes/${draft.id}`, "PATCH", body) : await send("/api/admin/changes", "POST", body);
    if (ok) {
      setDraft(null);
      refresh();
    }
  }

  async function quickCancel(l: LessonDTO) {
    if (await send("/api/admin/changes", "POST", { date, groupId: l.groupId, pair: l.pair, subgroup: l.subgroup, cancelled: true })) refresh();
  }

  async function remove(id: number) {
    if (await send(`/api/admin/changes/${id}`, "DELETE")) refresh();
  }

  async function review(id: number, status: "approved" | "rejected") {
    if (await send(`/api/admin/changes/${id}`, "PATCH", { status })) refresh();
  }

  const groupLessons = groupId ? dayLessons.filter((l) => l.groupId === groupId) : [];
  const teacherLessons = teacherId ? dayLessons.filter((l) => l.teacherId === teacherId) : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Заміни</h1>
          <p className="mt-1 text-ink-2">Зміни на конкретну дату. Основний розклад при цьому не змінюється.</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setDate(addDays(date, -1))} className="rounded-md border border-line bg-surface p-2 hover:border-brand" aria-label="Попередній день">
            <ChevronLeft className="size-4" />
          </button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-9 rounded-md border border-line bg-surface px-2" />
          <button onClick={() => setDate(addDays(date, 1))} className="rounded-md border border-line bg-surface p-2 hover:border-brand" aria-label="Наступний день">
            <ChevronRight className="size-4" />
          </button>
          <button onClick={() => setDate(today)} className="ml-1 rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:border-brand">
            Сьогодні
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <section className="mb-8 rounded-md border border-accent/40 bg-accent-soft/50 p-4">
          <h2 className="mb-3 font-semibold">Заявки від викладачів: {pending.length}</h2>
          <ul className="divide-y divide-accent/20">
            {pending.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {formatDate(c.date, { day: "numeric", month: "long", weekday: "short" })} · {c.group}, {c.pair} пара
                    {c.subgroup ? ` (${c.subgroup} підгрупа)` : ""}
                  </p>
                  <p className="text-sm text-ink-2">
                    {changeSummary(c)}
                    {c.note && <> · «{c.note}»</>} {c.author && <span className="text-ink-3">— {c.author}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button disabled={busy} onClick={() => startFromChange(c)} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-deep">
                    Призначити заміну
                  </button>
                  <button disabled={busy} onClick={() => review(c.id, "approved")} className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:border-ok hover:text-ok">
                    Підтвердити як є
                  </button>
                  <button disabled={busy} onClick={() => review(c.id, "rejected")} className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:border-danger hover:text-danger">
                    Відхилити
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="text-xl font-semibold">
        {formatDate(date, { weekday: "long", day: "numeric", month: "long" })}
        {!weekend && <span className="ml-2 text-base font-normal text-ink-3">{parity === "num" ? "чисельник" : "знаменник"}</span>}
      </h2>

      {weekend ? (
        <p className="mt-4 text-ink-2">Вихідний день.</p>
      ) : (
        <>
          <div className="mt-4 mb-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-md border border-line bg-surface">
              {(
                [
                  ["group", "За групою"],
                  ["teacher", "Відсутній викладач"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => {
                    setTab(k);
                    setDraft(null);
                  }}
                  className={clsx("px-3 py-1.5 text-sm first:rounded-l-md last:rounded-r-md", tab === k ? "bg-brand text-white" : "text-ink-2 hover:bg-surface-2")}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === "group" ? (
              <select value={groupId ?? ""} onChange={(e) => { setGroupId(e.target.value ? +e.target.value : null); setDraft(null); }} className="h-9 rounded-md border border-line bg-surface px-2">
                <option value="">Виберіть групу</option>
                {dict.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            ) : (
              <select value={teacherId ?? ""} onChange={(e) => { setTeacherId(e.target.value ? +e.target.value : null); setDraft(null); }} className="h-9 rounded-md border border-line bg-surface px-2">
                <option value="">Виберіть викладача</option>
                {dict.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.shortName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && <p className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

          {tab === "group" && groupId && (
            <div className="overflow-x-auto rounded-md border border-line bg-surface">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-surface-2 text-left text-ink-3">
                  <tr>
                    <th className="w-24 px-3 py-2 font-medium">Пара</th>
                    <th className="px-3 py-2 font-medium">За розкладом</th>
                    <th className="px-3 py-2 font-medium">Зміна</th>
                    <th className="w-64" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {bells.map((b) => {
                    const base = groupLessons.filter((l) => l.pair === b.pair);
                    const ch = changes.filter((c) => c.groupId === groupId && c.pair === b.pair);
                    const editing = draft && draft.groupId === groupId && draft.pair === b.pair;
                    return (
                      <FragmentRow key={b.pair}>
                        <tr className="align-top">
                          <td className="px-3 py-2.5 tabular-nums">
                            <b>{b.pair}</b>
                            <span className="block text-xs text-ink-3">
                              {b.start}–{b.end}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {base.length ? (
                              base.map((l) => (
                                <p key={l.id}>
                                  {describeLesson(l)}
                                  {l.subgroup > 0 && <span className="text-ink-3"> · {l.subgroup} підгр.</span>}
                                </p>
                              ))
                            ) : (
                              <span className="text-ink-3">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {ch.map((c) => (
                              <p key={c.id} className={c.cancelled ? "text-danger" : "text-accent"}>
                                {c.cancelled ? "Скасовано" : describeLesson(c)}
                                {c.subgroup > 0 && ` · ${c.subgroup} підгр.`}
                                {c.status === "pending" && <span className="ml-1 rounded bg-accent-soft px-1 text-xs">заявка</span>}
                                {c.note && <span className="block text-xs text-ink-3">{c.note}</span>}
                              </p>
                            ))}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {ch.map((c) => (
                                <span key={c.id} className="flex gap-1.5">
                                  <button onClick={() => startFromChange(c)} className="rounded border border-line px-2 py-1 hover:border-brand hover:text-brand">
                                    Змінити
                                  </button>
                                  <button onClick={() => remove(c.id)} className="rounded border border-line p-1 text-ink-3 hover:border-danger hover:text-danger" aria-label="Видалити зміну">
                                    <Trash2 className="size-4" />
                                  </button>
                                </span>
                              ))}
                              {!ch.length &&
                                base.map((l) => (
                                  <span key={l.id} className="flex gap-1.5">
                                    <button onClick={() => startFromLesson(l)} className="rounded border border-line px-2 py-1 hover:border-brand hover:text-brand">
                                      Замінити{base.length > 1 ? ` (${l.subgroup || "уся"})` : ""}
                                    </button>
                                    <button onClick={() => quickCancel(l)} className="rounded border border-line px-2 py-1 hover:border-danger hover:text-danger">
                                      Скасувати
                                    </button>
                                  </span>
                                ))}
                              {!ch.length && !base.length && (
                                <button
                                  onClick={() => setDraft({ groupId, pair: b.pair, subgroup: 0, subject: "", teacher: "", room: "", note: "" })}
                                  className="rounded border border-line px-2 py-1 hover:border-brand hover:text-brand"
                                >
                                  Додати пару
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {editing && (
                          <tr>
                            <td colSpan={4} className="bg-brand-soft/40 px-3 py-3">
                              <DraftForm
                                draft={draft}
                                setDraft={setDraft}
                                subjects={dict.subjects.map((s) => ({ value: s.name }))}
                                teachers={teacherOptions(draft.pair, draft.subject, draft.groupId)}
                                rooms={roomOptions(draft.pair, draft.groupId)}
                                busy={busy}
                                onSave={() => saveDraft(false)}
                                onCancelPair={() => saveDraft(true)}
                                onClose={() => setDraft(null)}
                              />
                            </td>
                          </tr>
                        )}
                      </FragmentRow>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === "teacher" && teacherId && (
            <TeacherDay
              lessons={teacherLessons}
              changes={approved}
              busy={busy}
              teacherOptions={teacherOptions}
              onAssign={async (l, substitute) => {
                if (await send("/api/admin/changes", "POST", { date, groupId: l.groupId, pair: l.pair, subgroup: l.subgroup, cancelled: false, subject: l.subject, teacher: substitute, room: l.room })) refresh();
              }}
              onCancel={quickCancel}
              onCancelAll={async () => {
                for (const l of teacherLessons) await quickCancel(l);
              }}
            />
          )}

          <section className="mt-10">
            <h2 className="mb-2 text-lg font-semibold">Усі зміни на цей день: {changes.length}</h2>
            {changes.length === 0 ? (
              <p className="text-ink-3">Змін немає.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {changes.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-28 shrink-0 font-medium">
                      {c.group}, {c.pair} пара
                    </span>
                    <span className="min-w-0 flex-1">
                      {changeSummary(c)}
                      {c.status === "pending" && <span className="ml-1 rounded bg-accent-soft px-1 text-xs text-accent">заявка</span>}
                    </span>
                    <button onClick={() => remove(c.id)} className="rounded p-1 text-ink-3 hover:bg-danger-soft hover:text-danger" aria-label="Видалити зміну">
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DraftForm({
  draft,
  setDraft,
  subjects,
  teachers,
  rooms,
  busy,
  onSave,
  onCancelPair,
  onClose,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  subjects: Option[];
  teachers: Option[];
  rooms: Option[];
  busy: boolean;
  onSave: () => void;
  onCancelPair: () => void;
  onClose: () => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_0.7fr]">
      <Combobox label="Дисципліна" value={draft.subject} onChange={(v) => setDraft({ ...draft, subject: v })} options={subjects} allowEmpty={false} />
      <Combobox label="Викладач" value={draft.teacher} onChange={(v) => setDraft({ ...draft, teacher: v })} options={teachers} autoFocus />
      <Combobox label="Аудиторія" value={draft.room} onChange={(v) => setDraft({ ...draft, room: v })} options={rooms} />
      <label className="text-sm font-medium text-ink-2 md:col-span-2">
        Примітка для студентів
        <input
          value={draft.note}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          placeholder="Напр. пара переноситься з 4-ї"
          className="mt-1 h-10 w-full rounded-md border border-line bg-surface px-3 outline-none focus:border-brand"
        />
      </label>
      <label className="text-sm font-medium text-ink-2">
        Підгрупа
        <select value={draft.subgroup} onChange={(e) => setDraft({ ...draft, subgroup: +e.target.value })} className="mt-1 h-10 w-full rounded-md border border-line bg-surface px-2">
          <option value={0}>Уся група</option>
          <option value={1}>1 підгрупа</option>
          <option value={2}>2 підгрупа</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2 md:col-span-3">
        <button disabled={busy || !draft.subject} onClick={onSave} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-deep disabled:opacity-50">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} Зберегти заміну
        </button>
        <button disabled={busy} onClick={onCancelPair} className="rounded-md border border-line bg-surface px-4 py-2 hover:border-danger hover:text-danger">
          Скасувати пару
        </button>
        <button onClick={onClose} className="ml-auto inline-flex items-center gap-1 rounded-md px-3 py-2 text-ink-3 hover:text-ink">
          <X className="size-4" /> Закрити
        </button>
      </div>
    </div>
  );
}

function TeacherDay({
  lessons,
  changes,
  busy,
  teacherOptions,
  onAssign,
  onCancel,
  onCancelAll,
}: {
  lessons: LessonDTO[];
  changes: ChangeDTO[];
  busy: boolean;
  teacherOptions: (pair: number, subject: string, exceptGroup?: number) => Option[];
  onAssign: (l: LessonDTO, substitute: string) => void;
  onCancel: (l: LessonDTO) => void;
  onCancelAll: () => void;
}) {
  const [subs, setSubs] = useState<Record<number, string>>({});
  if (!lessons.length) return <p className="text-ink-3">Цього дня в розкладі викладача немає пар.</p>;
  const handled = (l: LessonDTO) => changes.find((c) => c.replaces.some((r) => r.id === l.id));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button disabled={busy} onClick={onCancelAll} className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:border-danger hover:text-danger">
          Скасувати всі пари цього дня
        </button>
      </div>
      {lessons
        .sort((a, b) => a.pair - b.pair)
        .map((l) => {
          const done = handled(l);
          return (
            <div key={l.id} className="grid items-end gap-3 rounded-md border border-line bg-surface p-3 md:grid-cols-[1fr_280px_auto]">
              <div>
                <p className="font-medium">
                  {l.pair} пара · {l.group}
                  {l.subgroup > 0 && ` (${l.subgroup} підгр.)`}
                </p>
                <p className="text-sm text-ink-2">
                  {l.subject}
                  {l.room && `, ауд. ${l.room}`}
                </p>
                {done && <p className="mt-1 text-sm text-accent">Вже оформлено: {changeSummary(done)}</p>}
              </div>
              <Combobox label="Хто замінить" value={subs[l.id] ?? ""} onChange={(v) => setSubs({ ...subs, [l.id]: v })} options={teacherOptions(l.pair, l.subject, l.groupId)} />
              <div className="flex gap-2">
                <button disabled={busy || !subs[l.id]} onClick={() => onAssign(l, subs[l.id])} className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-50">
                  Призначити
                </button>
                <button disabled={busy} onClick={() => onCancel(l)} className="rounded-md border border-line px-3 py-2 text-sm hover:border-danger hover:text-danger">
                  Скасувати
                </button>
              </div>
            </div>
          );
        })}
      <p className="text-sm text-ink-3">Першими у списку — ті, хто веде цю дисципліну і вільний у цей час.</p>
    </div>
  );
}

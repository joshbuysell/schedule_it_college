"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import type { Dictionaries } from "@/lib/admin";
import { DAYS, subjectHue, weeksOverlap, type BellDTO, type LessonDTO, type Week } from "@/lib/schedule";
import Combobox, { type Option } from "./Combobox";

type Issue = { kind: string; other: LessonDTO };
type IssueProbe = Pick<LessonDTO, "id" | "day" | "pair" | "week" | "subgroup" | "groupId" | "teacherId" | "roomId">;

type Props = {
  group: Dictionaries["groups"][number];
  slot: { day: number; pair: number };
  bell?: BellDTO;
  lessons: LessonDTO[];
  allLessons: LessonDTO[];
  dict: Dictionaries;
  focusLesson: number | null;
  issuesFor: (l: IssueProbe) => Issue[];
  onClose: () => void;
  onSaved: (l: LessonDTO, created: boolean, extra?: LessonDTO[]) => void;
  semesterId: number;
  onDeleted: (l: LessonDTO) => void;
};

export default function SlotDrawer(props: Props) {
  const { group, slot, bell, lessons, onClose, focusLesson } = props;
  const [adding, setAdding] = useState(lessons.length === 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const suggestion = useMemo(() => {
    const weeks = new Set(lessons.map((l) => l.week));
    const sgs = new Set(lessons.map((l) => l.subgroup));
    const week: Week = weeks.has("num") && !weeks.has("den") ? "den" : weeks.has("den") && !weeks.has("num") ? "num" : "all";
    const subgroup = sgs.has(1) && !sgs.has(2) ? 2 : sgs.has(2) && !sgs.has(1) ? 1 : 0;
    return { week, subgroup };
  }, [lessons]);

  return (
    <aside className="drawer-in fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl sm:top-14">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="text-sm text-brand">{group.name}</p>
          <h2 className="text-xl font-bold">
            {DAYS[slot.day - 1]}, {slot.pair} пара
          </h2>
          {bell && <p className="text-sm font-semibold tabular-nums text-ink-3">{bell.start} – {bell.end}</p>}
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Закрити (Esc)">
          <X className="size-5" />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {lessons.map((l) => (
          <LessonForm key={l.id} {...props} lesson={l} autoFocus={focusLesson === l.id} />
        ))}

        {adding ? (
          <LessonForm
            {...props}
            lesson={null}
            initialWeek={suggestion.week}
            initialSubgroup={suggestion.subgroup}
            autoFocus
            onCancel={lessons.length ? () => setAdding(false) : undefined}
            onSaved={(l, created, extra) => {
              props.onSaved(l, created, extra);
              setAdding(false);
            }}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-4 text-sm font-semibold text-ink-2 hover:border-brand hover:text-brand"
          >
            <Plus className="size-4" />
            {lessons.length ? "Додати ще (інший тиждень чи підгрупу)" : "Додати пару"}
          </button>
        )}
      </div>
    </aside>
  );
}

function LessonForm({
  lesson,
  group,
  slot,
  allLessons,
  dict,
  issuesFor,
  onSaved,
  onDeleted,
  onCancel,
  autoFocus,
  initialWeek = "all",
  initialSubgroup = 0,
  semesterId,
}: Props & {
  lesson: LessonDTO | null;
  autoFocus?: boolean;
  onCancel?: () => void;
  initialWeek?: Week;
  initialSubgroup?: number;
}) {
  const [subject, setSubject] = useState(lesson?.subject ?? "");
  const [teacher, setTeacher] = useState(lesson?.teacher ?? "");
  const [room, setRoom] = useState(lesson?.room ?? "");
  const [week, setWeek] = useState<Week>(lesson?.week ?? initialWeek);
  const [subgroup, setSubgroup] = useState(lesson?.subgroup ?? initialSubgroup);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [also, setAlso] = useState<number[]>([]);
  const [showAlso, setShowAlso] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const streamCandidates = dict.groups.filter((g) => g.id !== group.id && g.course === group.course);

  useEffect(() => {
    if (autoFocus && lesson) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [autoFocus, lesson]);

  const dirty =
    !lesson ||
    subject !== lesson.subject ||
    teacher !== (lesson.teacher ?? "") ||
    room !== (lesson.room ?? "") ||
    week !== lesson.week ||
    subgroup !== lesson.subgroup;

  const teacherId = dict.teachers.find((t) => t.shortName === teacher)?.id ?? null;
  const roomId = dict.rooms.find((r) => r.name === room)?.id ?? null;
  const probe = { id: lesson?.id ?? -1, day: slot.day, pair: slot.pair, week, subgroup, groupId: group.id };
  const issues = issuesFor({ ...probe, teacherId, roomId });

  const slotOthers = useMemo(
    () => allLessons.filter((o) => o.day === slot.day && o.pair === slot.pair && o.id !== lesson?.id && weeksOverlap(o.week, week) && o.groupId !== group.id),
    [allLessons, slot, lesson?.id, week, group.id],
  );

  const subjectOptions = useMemo<Option[]>(() => {
    const mine = new Set(allLessons.filter((l) => l.groupId === group.id).map((l) => l.subject));
    return [
      ...[...mine].sort((a, b) => a.localeCompare(b, "uk")).map((v) => ({ value: v, group: "Дисципліни групи" })),
      ...dict.subjects.filter((s) => !mine.has(s.name)).map((s) => ({ value: s.name, group: "Усі дисципліни" })),
    ];
  }, [allLessons, dict.subjects, group.id]);

  const teacherOptions = useMemo<Option[]>(() => {
    const teaches = new Set(allLessons.filter((l) => l.subject === subject && l.teacher).map((l) => l.teacher!));
    const busy = new Map(slotOthers.filter((o) => o.teacher).map((o) => [o.teacher!, o]));
    const opt = (name: string, grp: string): Option => {
      const b = busy.get(name);
      return b ? { value: name, group: grp, hint: `зайнятий · ${b.group}`, tone: "danger" } : { value: name, group: grp, hint: "вільний", tone: "ok" };
    };
    const all = dict.teachers.map((t) => t.shortName);
    const first = all.filter((n) => teaches.has(n)).sort((a, b) => +busy.has(a) - +busy.has(b));
    const rest = all.filter((n) => !teaches.has(n)).sort((a, b) => +busy.has(a) - +busy.has(b) || a.localeCompare(b, "uk"));
    return [...first.map((n) => opt(n, subject ? `Викладають «${subject}»` : "Викладачі")), ...rest.map((n) => opt(n, "Усі викладачі"))];
  }, [allLessons, dict.teachers, slotOthers, subject]);

  const roomOptions = useMemo<Option[]>(() => {
    const used = new Set(allLessons.filter((l) => l.subject === subject && l.room).map((l) => l.room!));
    const shared = new Set(dict.rooms.filter((r) => r.shared).map((r) => r.name));
    const busy = new Map(slotOthers.filter((o) => o.room && !shared.has(o.room)).map((o) => [o.room!, o]));
    const opt = (name: string, grp: string): Option => {
      if (shared.has(name)) return { value: name, group: grp, hint: "спільна", tone: "brand" };
      const b = busy.get(name);
      return b ? { value: name, group: grp, hint: `зайнята · ${b.group}`, tone: "danger" } : { value: name, group: grp, hint: "вільна", tone: "ok" };
    };
    const all = dict.rooms.map((r) => r.name);
    const first = all.filter((n) => used.has(n)).sort((a, b) => +busy.has(a) - +busy.has(b));
    const rest = all.filter((n) => !used.has(n)).sort((a, b) => +busy.has(a) - +busy.has(b) || a.localeCompare(b, "uk", { numeric: true }));
    return [...first.map((n) => opt(n, subject ? `Де проходить «${subject}»` : "Аудиторії")), ...rest.map((n) => opt(n, "Усі аудиторії"))];
  }, [allLessons, dict.rooms, slotOthers, subject]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return setError("Вкажіть дисципліну");
    setSaving(true);
    setError("");
    const body = { groupId: group.id, day: slot.day, pair: slot.pair, week, subgroup, subject, teacher: teacher || null, room: room || null, ...(!lesson && { alsoGroupIds: also, semesterId }) };
    const res = await fetch(lesson ? `/api/admin/lessons/${lesson.id}` : "/api/admin/lessons", {
      method: lesson ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? "Не вдалося зберегти");
    onSaved(data.lesson, !lesson, data.extra);
  }

  async function remove() {
    if (!lesson) return;
    setSaving(true);
    const res = await fetch(`/api/admin/lessons/${lesson.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) onDeleted(lesson);
    else setError("Не вдалося видалити");
  }

  const hue = subject ? subjectHue(subject) : 230;
  return (
    <form
      ref={ref}
      onSubmit={save}
      className={clsx("rounded-2xl border bg-surface-2 p-4", autoFocus && lesson ? "border-brand ring-4 ring-brand/10" : "border-line")}
      style={{ borderTop: `4px solid oklch(0.62 0.14 ${hue})` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-ink-2">{lesson ? "Заняття" : "Нове заняття"}</span>
        {lesson && (
          <button type="button" onClick={remove} disabled={saving} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-danger hover:bg-danger-soft">
            <Trash2 className="size-3.5" /> Видалити
          </button>
        )}
      </div>

      <div className="space-y-3">
        <Combobox label="Дисципліна" value={subject} onChange={setSubject} options={subjectOptions} placeholder="Почніть вводити…" allowEmpty={false} autoFocus={autoFocus && !lesson} />
        <Combobox label="Викладач" value={teacher} onChange={setTeacher} options={teacherOptions} placeholder="Прізвище І.Б." />
        <Combobox label="Аудиторія" value={room} onChange={setRoom} options={roomOptions} placeholder="Напр. 413 або 209л" />

        <div>
          <span className="mb-1 block text-sm font-medium text-ink-2">Тиждень</span>
          <Pills value={week} onChange={(v) => setWeek(v as Week)} options={[["all", "Щотижня"], ["num", "Чисельник"], ["den", "Знаменник"]]} />
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-ink-2">Хто навчається</span>
          <Pills value={String(subgroup)} onChange={(v) => setSubgroup(+v)} options={[["0", "Уся група"], ["1", "1 підгрупа"], ["2", "2 підгрупа"]]} />
        </div>
        {!lesson && (
          <div>
            <button type="button" onClick={() => setShowAlso(!showAlso)} className="text-sm text-brand hover:underline">
              {also.length ? `Потік: ще ${also.length} груп` : "Спільна пара з іншими групами (потік)"}
            </button>
            {showAlso && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {streamCandidates.map((g) => {
                  const on = also.includes(g.id);
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => setAlso(on ? also.filter((x) => x !== g.id) : [...also, g.id])}
                      aria-pressed={on}
                      className={on ? "rounded border border-brand bg-brand px-2 py-0.5 text-sm text-white" : "rounded border border-line px-2 py-0.5 text-sm hover:border-brand"}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {issues.length > 0 && (
        <div className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">
          <p className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="size-4" /> Накладка
          </p>
          <ul className="mt-1 space-y-0.5">
            {issues.map((x) => (
              <li key={x.other.id + x.kind}>
                {x.kind === "teacher" && `${x.other.teacher} уже веде пару в ${x.other.group}`}
                {x.kind === "room" && `Ауд. ${x.other.room} зайнята групою ${x.other.group}`}
                {x.kind === "group" && `У групи вже є «${x.other.subject}» у цей час`}
                {x.other.week !== "all" && ` (${x.other.week === "num" ? "чисельник" : "знаменник"})`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          disabled={saving || !dirty}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-brand-ink transition hover:opacity-90 disabled:opacity-40"
        >
          {saving && <LoaderCircle className="size-4 animate-spin" />}
          {lesson ? "Зберегти зміни" : "Додати пару"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-10 rounded-xl border border-line px-4 font-semibold hover:border-ink-3">
            Скасувати
          </button>
        )}
      </div>
    </form>
  );
}

function Pills({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={clsx("rounded-lg py-1.5 text-sm font-semibold transition", value === v ? "bg-ink text-bg" : "text-ink-2 hover:text-ink")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

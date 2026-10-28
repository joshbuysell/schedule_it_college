import type { LessonDTO } from "./schedule";

export type ChangeStatus = "approved" | "pending" | "rejected";

export type ChangeDTO = {
  id: number;
  date: string;
  day: number;
  pair: number;
  subgroup: number;
  cancelled: boolean;
  subject: string | null;
  subjectId: number | null;
  teacher: string | null;
  teacherId: number | null;
  room: string | null;
  roomId: number | null;
  group: string;
  groupId: number;
  note: string | null;
  status: ChangeStatus;
  author: string | null;
  replaces: LessonDTO[];
};

export type ChangeMark = {
  kind: "replaced" | "added" | "cancelled" | "taken";
  note: string | null;
  was?: string;
  by?: string;
};

export type DisplayLesson = LessonDTO & { change?: ChangeMark };

type Viewable = { groupId: number; teacherId: number | null; roomId: number | null };

export function describeLesson(l: { subject: string | null; teacher: string | null; room: string | null }) {
  return [l.subject, l.teacher, l.room && `ауд. ${l.room}`].filter(Boolean).join(", ");
}

export function applyChanges(base: LessonDTO[], changes: ChangeDTO[], inView: (l: Viewable) => boolean): DisplayLesson[] {
  const result: DisplayLesson[] = base.map((l) => ({ ...l }));
  const hidden = new Set<number>();

  for (const c of changes) {
    const showNew = !c.cancelled && inView(c);
    const replaced = new Set(c.replaces.map((r) => r.id));

    for (const item of result) {
      if (!replaced.has(item.id)) continue;
      if (showNew) hidden.add(item.id);
      else item.change = c.cancelled ? { kind: "cancelled", note: c.note } : { kind: "taken", note: c.note, by: describeLesson(c) };
    }

    if (showNew) {
      result.push({
        id: -c.id,
        day: c.day,
        pair: c.pair,
        week: "all",
        subgroup: c.subgroup,
        subject: c.subject ?? "",
        subjectId: c.subjectId ?? 0,
        teacher: c.teacher,
        teacherId: c.teacherId,
        room: c.room,
        roomId: c.roomId,
        group: c.group,
        groupId: c.groupId,
        change: {
          kind: c.replaces.length ? "replaced" : "added",
          note: c.note,
          was: c.replaces.length ? c.replaces.map(describeLesson).join("; ") : undefined,
        },
      });
    }
  }

  return result.filter((l) => !hidden.has(l.id)).sort((a, b) => a.day - b.day || a.pair - b.pair || a.subgroup - b.subgroup);
}

export function roomOnly(c: ChangeDTO) {
  return !c.cancelled && c.replaces.length > 0 && c.replaces.every((r) => r.subject === c.subject && r.teacher === c.teacher && r.room !== c.room);
}

export function changeSummary(c: ChangeDTO) {
  if (c.cancelled) return `${c.replaces.map((r) => r.subject).join(", ") || "Пара"} — скасовано`;
  if (roomOnly(c)) return `${c.subject} — ${c.room ? `ауд. ${c.room}` : "без аудиторії"} (замість ${c.replaces.map((r) => r.room ?? "—").join(", ")})`;
  const now = describeLesson(c);
  return c.replaces.length ? `${now} (замість: ${c.replaces.map(describeLesson).join("; ")})` : `${now} (додаткова пара)`;
}

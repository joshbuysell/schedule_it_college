import { weeksOverlap, type LessonDTO } from "./schedule";

export type Conflict = {
  kind: "teacher" | "room" | "group";
  day: number;
  pair: number;
  label: string;
  lessons: LessonDTO[];
};

function subgroupsOverlap(a: number, b: number) {
  return a === 0 || b === 0 || a === b;
}

/** Чи конфліктують два заняття: той самий час + спільний викладач / аудиторія / група. */
export function conflictKind(a: LessonDTO, b: LessonDTO, sharedRooms: Set<number>): Conflict["kind"] | null {
  if (a.id === b.id || a.day !== b.day || a.pair !== b.pair || !weeksOverlap(a.week, b.week)) return null;
  if (a.groupId === b.groupId) return subgroupsOverlap(a.subgroup, b.subgroup) ? "group" : null;
  if (a.teacherId && a.teacherId === b.teacherId) return "teacher";
  if (a.roomId && a.roomId === b.roomId && !sharedRooms.has(a.roomId)) return "room";
  return null;
}

export function findConflicts(lessons: LessonDTO[], sharedRooms: Set<number>): Conflict[] {
  const bySlot = new Map<string, LessonDTO[]>();
  for (const l of lessons) {
    const key = `${l.day}.${l.pair}`;
    bySlot.set(key, [...(bySlot.get(key) ?? []), l]);
  }

  // один запис на кожну пару (тип конфлікту, викладач/аудиторія/група) у слоті
  const out = new Map<string, Conflict>();
  for (const slot of bySlot.values()) {
    for (let i = 0; i < slot.length; i++) {
      for (let j = i + 1; j < slot.length; j++) {
        const [a, b] = [slot[i], slot[j]];
        const kind = conflictKind(a, b, sharedRooms);
        if (!kind) continue;
        const label = kind === "teacher" ? a.teacher! : kind === "room" ? `ауд. ${a.room}` : a.group;
        const key = `${a.day}.${a.pair}:${kind}:${label}`;
        const c = out.get(key) ?? { kind, day: a.day, pair: a.pair, label, lessons: [] };
        for (const l of [a, b]) if (!c.lessons.includes(l)) c.lessons.push(l);
        out.set(key, c);
      }
    }
  }
  return [...out.values()].sort((a, b) => a.day - b.day || a.pair - b.pair);
}

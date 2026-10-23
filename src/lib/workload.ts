import type { LessonDTO } from "./schedule";

export type WorkloadRow = {
  teacherId: number;
  teacher: string;
  pairs: number;
  hours: number;
  groups: string[];
  subjects: { subject: string; pairs: number }[];
};

export function lessonWeight(l: LessonDTO) {
  return l.week === "all" ? 1 : 0.5;
}

export function computeWorkload(lessons: LessonDTO[]): WorkloadRow[] {
  const map = new Map<number, WorkloadRow & { subjMap: Map<string, number>; seen: Set<string> }>();
  for (const l of lessons) {
    if (!l.teacherId || !l.teacher) continue;
    const row = map.get(l.teacherId) ?? { teacherId: l.teacherId, teacher: l.teacher, pairs: 0, hours: 0, groups: [] as string[], subjects: [] as WorkloadRow["subjects"], subjMap: new Map<string, number>(), seen: new Set<string>() };
    const slot = `${l.day}.${l.pair}.${l.week}.${l.subjectId}.${l.roomId}`;
    if (!row.seen.has(slot)) {
      row.seen.add(slot);
      row.pairs += lessonWeight(l);
      row.subjMap.set(l.subject, (row.subjMap.get(l.subject) ?? 0) + lessonWeight(l));
    }
    if (!row.groups.includes(l.group)) row.groups.push(l.group);
    map.set(l.teacherId, row);
  }
  return [...map.values()]
    .map((r) => ({
      teacherId: r.teacherId,
      teacher: r.teacher,
      pairs: r.pairs,
      hours: r.pairs * 2,
      groups: r.groups.sort((a, b) => a.localeCompare(b, "uk", { numeric: true })),
      subjects: [...r.subjMap.entries()].map(([subject, pairs]) => ({ subject, pairs })).sort((a, b) => b.pairs - a.pairs),
    }))
    .sort((a, b) => b.pairs - a.pairs || a.teacher.localeCompare(b.teacher, "uk"));
}

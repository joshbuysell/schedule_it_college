import "server-only";
import { cache } from "react";
import { prisma } from "./db";
import { addDays, byName, kyivNow, matchesWeek, relevantParity, relevantWeekStart, weekParity, weekdayOf, type BellDTO, type LessonDTO, type Week } from "./schedule";
import type { ChangeDTO, ChangeStatus } from "./changes";
import type { Prisma } from "@prisma/client";

const lessonInclude = {
  subject: true,
  teacher: true,
  room: true,
  group: true,
} satisfies Prisma.LessonInclude;

type LessonRow = Prisma.LessonGetPayload<{ include: typeof lessonInclude }>;

export function toDTO(l: LessonRow): LessonDTO {
  return {
    id: l.id,
    day: l.day,
    pair: l.pair,
    week: l.week as Week,
    subgroup: l.subgroup,
    subject: l.subject.name,
    subjectId: l.subjectId,
    teacher: l.teacher?.shortName ?? null,
    teacherId: l.teacherId,
    room: l.room?.name ?? null,
    roomId: l.roomId,
    group: l.group.name,
    groupId: l.groupId,
  };
}

const order = [{ day: "asc" }, { pair: "asc" }, { week: "asc" }, { subgroup: "asc" }] as const;

export const getActiveSemester = cache(async () => {
  return (
    (await prisma.semester.findFirst({ where: { active: true } })) ??
    (await prisma.semester.findFirst({ orderBy: { id: "desc" } }))
  );
});

export async function activeSemesterId() {
  return (await getActiveSemester())?.id ?? -1;
}

export async function lessonsWhere(where: Prisma.LessonWhereInput): Promise<LessonDTO[]> {
  const scoped = where.semesterId === undefined ? { ...where, semesterId: await activeSemesterId() } : where;
  const rows = await prisma.lesson.findMany({ where: scoped, include: lessonInclude, orderBy: [...order] });
  return rows.map(toDTO);
}

export async function getBells(): Promise<BellDTO[]> {
  return prisma.bell.findMany({ orderBy: { pair: "asc" } });
}

export async function getSettings() {
  const [rows, semester] = await Promise.all([prisma.setting.findMany(), getActiveSemester()]);
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    semesterId: semester?.id ?? null,
    semesterLabel: semester?.title ?? s.semesterLabel ?? "",
    numeratorAnchor: semester?.numeratorAnchor ?? s.numeratorAnchor ?? "2026-09-07",
    semesterEnd: semester?.endDate ?? s.semesterEnd ?? "2026-12-25",
    source: s.source ?? "",
    approverTitle: s.approverTitle ?? "Директор ВСП «ФК ІТ» НУ «Львівська політехніка»",
    approverName: s.approverName ?? "Василь РОМАНЧУК",
  };
}

export async function getToday() {
  const [settings, bells] = await Promise.all([getSettings(), getBells()]);
  const now = kyivNow();
  return {
    ...now,
    parity: relevantParity(settings.numeratorAnchor, now.ymd, now.weekday),
    weekStart: relevantWeekStart(now.ymd, now.weekday),
    settings,
    bells,
  };
}

export async function getSearchIndex() {
  const [groups, teachers, rooms] = await Promise.all([
    prisma.group.findMany({ select: { name: true, specialty: true, course: true }, orderBy: { name: "asc" } }),
    prisma.teacher.findMany({
      select: { id: true, shortName: true, fullName: true, commission: true },
      orderBy: { shortName: "asc" },
    }),
    prisma.room.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  groups.sort((a, b) => byName(a.name, b.name));
  teachers.sort((a, b) => byName(a.shortName, b.shortName));
  rooms.sort((a, b) => byName(a.name, b.name));
  return { groups, teachers, rooms };
}

export type SearchIndex = Awaited<ReturnType<typeof getSearchIndex>>;

const changeInclude = { group: true, subject: true, teacher: true, room: true, author: true } satisfies Prisma.ChangeInclude;

export async function getChanges(where: Prisma.ChangeWhereInput): Promise<ChangeDTO[]> {
  const [rows, settings] = await Promise.all([
    prisma.change.findMany({ where, include: changeInclude, orderBy: [{ date: "asc" }, { pair: "asc" }] }),
    getSettings(),
  ]);
  if (!rows.length) return [];
  const base = await lessonsWhere({ groupId: { in: [...new Set(rows.map((r) => r.groupId))] } });

  return rows.map((c) => {
    const day = weekdayOf(c.date);
    const parity = weekParity(settings.numeratorAnchor, c.date, day);
    const replaces = base.filter(
      (l) =>
        l.groupId === c.groupId &&
        l.day === day &&
        l.pair === c.pair &&
        matchesWeek(l.week, parity) &&
        (c.subgroup === 0 || l.subgroup === 0 || l.subgroup === c.subgroup),
    );
    return {
      id: c.id,
      date: c.date,
      day,
      pair: c.pair,
      subgroup: c.subgroup,
      cancelled: c.cancelled,
      subject: c.subject?.name ?? null,
      subjectId: c.subjectId,
      teacher: c.teacher?.shortName ?? null,
      teacherId: c.teacherId,
      room: c.room?.name ?? null,
      roomId: c.roomId,
      group: c.group.name,
      groupId: c.groupId,
      note: c.note,
      status: c.status as ChangeStatus,
      author: c.author?.name ?? null,
      replaces,
    };
  });
}

export async function getWeekChanges(weekStart: string, extra: Prisma.ChangeWhereInput = {}) {
  return getChanges({ ...extra, status: "approved", date: { gte: weekStart, lte: addDays(weekStart, 6) } });
}

export async function getRoomOccupancy(date: string) {
  const settings = await getSettings();
  const day = weekdayOf(date);
  const parity = weekParity(settings.numeratorAnchor, date, day);
  const [rooms, base, changes] = await Promise.all([
    prisma.room.findMany(),
    day <= 5 ? lessonsWhere({ day }) : Promise.resolve([]),
    getChanges({ status: "approved", date }),
  ]);
  const replaced = new Set(changes.flatMap((c) => c.replaces.map((r) => r.id)));
  const busy = new Map<string, string[]>();
  const mark = (roomId: number | null, pair: number, label: string) => {
    if (!roomId) return;
    const key = `${roomId}:${pair}`;
    busy.set(key, [...(busy.get(key) ?? []), label]);
  };
  for (const l of base) if (matchesWeek(l.week, parity) && !replaced.has(l.id)) mark(l.roomId, l.pair, `${l.group} · ${l.teacher ?? ""}`);
  for (const c of changes) if (!c.cancelled) mark(c.roomId, c.pair, `${c.group} · ${c.teacher ?? ""} (заміна)`);
  rooms.sort((a, b) => byName(a.name, b.name));
  return { rooms, busy, parity, day };
}

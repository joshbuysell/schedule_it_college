import "server-only";
import { prisma } from "./db";
import { byName, kyivNow, relevantParity, type BellDTO, type LessonDTO, type Week } from "./schedule";
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

export async function lessonsWhere(where: Prisma.LessonWhereInput): Promise<LessonDTO[]> {
  const rows = await prisma.lesson.findMany({ where, include: lessonInclude, orderBy: [...order] });
  return rows.map(toDTO);
}

export async function getBells(): Promise<BellDTO[]> {
  return prisma.bell.findMany({ orderBy: { pair: "asc" } });
}

export async function getSettings() {
  const rows = await prisma.setting.findMany();
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    semesterLabel: s.semesterLabel ?? "",
    numeratorAnchor: s.numeratorAnchor ?? "2026-09-07",
    semesterEnd: s.semesterEnd ?? "2026-12-25",
    source: s.source ?? "",
  };
}

export async function getToday() {
  const [settings, bells] = await Promise.all([getSettings(), getBells()]);
  const now = kyivNow();
  return {
    ...now,
    parity: relevantParity(settings.numeratorAnchor, now.ymd, now.weekday),
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

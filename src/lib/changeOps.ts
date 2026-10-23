import "server-only";
import { prisma } from "./db";
import { ensureRoom, ensureSubject, ensureTeacher } from "./admin";
import { getChanges, getSettings, lessonsWhere } from "./queries";
import { matchesWeek, weekParity, weekdayOf } from "./schedule";
import type { ChangeInput } from "./changeInput";
import { notifyChanges } from "./notify";
import { audit } from "./audit";
import { changeSummary } from "./changes";

export async function saveChange(input: ChangeInput, opts: { authorId: number; status: "approved" | "pending"; id?: number }) {
  const [subject, teacher, room] = input.cancelled
    ? [null, null, null]
    : await Promise.all([ensureSubject(input.subject!), ensureTeacher(input.teacher), ensureRoom(input.room)]);

  const data = {
    date: input.date,
    groupId: input.groupId,
    pair: input.pair,
    subgroup: input.subgroup,
    cancelled: input.cancelled,
    subjectId: subject?.id ?? null,
    teacherId: teacher?.id ?? null,
    roomId: room?.id ?? null,
    note: input.note || null,
    status: opts.status,
    authorId: opts.authorId,
  };

  if (opts.status === "approved") {
    await prisma.change.deleteMany({
      where: { date: input.date, groupId: input.groupId, pair: input.pair, subgroup: input.subgroup, status: "approved", ...(opts.id && { id: { not: opts.id } }) },
    });
  }
  const saved = opts.id ? await prisma.change.update({ where: { id: opts.id }, data }) : await prisma.change.create({ data });
  const [dto] = await getChanges({ id: saved.id });
  await audit(
    opts.status === "approved" ? "change.save" : "change.request",
    `${opts.status === "approved" ? "Зміна" : "Заявка"} на ${dto.date}: ${dto.group}, ${dto.pair} пара — ${changeSummary(dto)}`,
  );
  if (opts.status === "approved") await notifyChanges([dto]);
  return dto;
}

export async function approveChange(id: number) {
  const c = await prisma.change.findUnique({ where: { id } });
  if (!c) return null;
  await prisma.change.deleteMany({
    where: { date: c.date, groupId: c.groupId, pair: c.pair, subgroup: c.subgroup, status: "approved", id: { not: id } },
  });
  await prisma.change.update({ where: { id }, data: { status: "approved" } });
  const [dto] = await getChanges({ id });
  await audit("change.approve", `Підтверджено заявку на ${dto.date}: ${dto.group}, ${dto.pair} пара — ${changeSummary(dto)}`);
  await notifyChanges([dto]);
  return dto;
}

export async function teacherLessonsOn(teacherId: number, date: string) {
  const settings = await getSettings();
  const day = weekdayOf(date);
  const parity = weekParity(settings.numeratorAnchor, date, day);
  const base = (await lessonsWhere({ teacherId, day })).filter((l) => matchesWeek(l.week, parity));
  return base;
}

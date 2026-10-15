import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toDTO } from "@/lib/queries";
import { bad, ensureRoom, ensureSubject, ensureTeacher } from "@/lib/admin";
import { lessonInput } from "@/lib/lessonInput";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const existing = await prisma.lesson.findUnique({ where: { id } });
  if (!existing) return bad("Заняття не знайдено", 404);

  const parsed = lessonInput.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  const d = parsed.data;

  const data: Record<string, unknown> = {};
  for (const k of ["day", "pair", "week", "subgroup"] as const) if (d[k] !== undefined) data[k] = d[k];
  if (d.subject !== undefined) data.subjectId = (await ensureSubject(d.subject)).id;
  if (d.teacher !== undefined) data.teacherId = (await ensureTeacher(d.teacher))?.id ?? null;
  if (d.room !== undefined) data.roomId = (await ensureRoom(d.room))?.id ?? null;

  const lesson = await prisma.lesson.update({
    where: { id },
    data,
    include: { subject: true, teacher: true, room: true, group: true },
  });
  await prisma.group.update({ where: { id: lesson.groupId }, data: { updatedAt: new Date() } });
  return NextResponse.json({ lesson: toDTO(lesson) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const lesson = await prisma.lesson.delete({ where: { id } }).catch(() => null);
  if (!lesson) return bad("Заняття не знайдено", 404);
  await prisma.group.update({ where: { id: lesson.groupId }, data: { updatedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

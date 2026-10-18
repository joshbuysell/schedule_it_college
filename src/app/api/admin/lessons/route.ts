import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { lessonsWhere, toDTO } from "@/lib/queries";
import { bad, ensureRoom, ensureSubject, ensureTeacher } from "@/lib/admin";
import { lessonInput } from "@/lib/lessonInput";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ lessons: await lessonsWhere({}) });
}

export async function POST(req: Request) {
  const parsed = lessonInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  const d = parsed.data;
  if (!(await prisma.group.findUnique({ where: { id: d.groupId }, select: { id: true } }))) return bad("Групу не знайдено", 404);

  const [subject, teacher, room] = await Promise.all([ensureSubject(d.subject), ensureTeacher(d.teacher), ensureRoom(d.room)]);
  const lesson = await prisma.lesson.create({
    data: {
      groupId: d.groupId, day: d.day, pair: d.pair, week: d.week, subgroup: d.subgroup,
      subjectId: subject.id, teacherId: teacher?.id ?? null, roomId: room?.id ?? null,
    },
    include: { subject: true, teacher: true, room: true, group: true },
  });
  await prisma.group.update({ where: { id: d.groupId }, data: { updatedAt: new Date() } });
  return NextResponse.json({ lesson: toDTO(lesson) }, { status: 201 });
}

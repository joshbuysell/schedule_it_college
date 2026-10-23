import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { activeSemesterId, lessonsWhere, toDTO } from "@/lib/queries";
import { bad, ensureRoom, ensureSubject, ensureTeacher } from "@/lib/admin";
import { audit, lessonLabel } from "@/lib/audit";
import { lessonInput } from "@/lib/lessonInput";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const semesterId = Number(new URL(req.url).searchParams.get("semester")) || (await activeSemesterId());
  return NextResponse.json({ lessons: await lessonsWhere({ semesterId }) });
}

export async function POST(req: Request) {
  const parsed = lessonInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  const d = parsed.data;
  if (!(await prisma.group.findUnique({ where: { id: d.groupId }, select: { id: true } }))) return bad("Групу не знайдено", 404);

  const [subject, teacher, room] = await Promise.all([ensureSubject(d.subject), ensureTeacher(d.teacher), ensureRoom(d.room)]);
  const semesterId = d.semesterId ?? (await activeSemesterId());
  const groupIds = [d.groupId, ...new Set((d.alsoGroupIds ?? []).filter((id) => id !== d.groupId))];
  const created = await prisma.$transaction(
    groupIds.map((groupId) =>
      prisma.lesson.create({
        data: {
          semesterId, groupId, day: d.day, pair: d.pair, week: d.week, subgroup: groupId === d.groupId ? d.subgroup : 0,
          subjectId: subject.id, teacherId: teacher?.id ?? null, roomId: room?.id ?? null,
        },
        include: { subject: true, teacher: true, room: true, group: true },
      }),
    ),
  );
  await prisma.group.updateMany({ where: { id: { in: groupIds } }, data: { updatedAt: new Date() } });
  const [lesson, ...extra] = created.map(toDTO);
  await audit("lesson.create", `Додано ${lessonLabel(lesson)}${extra.length ? ` (потік, ще: ${extra.map((l) => l.group).join(", ")})` : ""}`);
  return NextResponse.json({ lesson, extra }, { status: 201 });
}

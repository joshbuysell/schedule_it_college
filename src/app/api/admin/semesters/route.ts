import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { bad } from "@/lib/admin";
import { audit } from "@/lib/audit";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const input = z.object({
  title: z.string().trim().min(3).max(80),
  numeratorAnchor: ymd,
  endDate: ymd,
  copyFrom: z.number().int().positive().nullish(),
});

export async function POST(req: Request) {
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  const { copyFrom, ...data } = parsed.data;

  const semester = await prisma.$transaction(async (tx) => {
    const s = await tx.semester.create({ data: { ...data, active: false } });
    if (copyFrom) {
      const lessons = await tx.lesson.findMany({ where: { semesterId: copyFrom } });
      await tx.lesson.createMany({
        data: lessons.map((l) => ({
          semesterId: s.id,
          groupId: l.groupId,
          day: l.day,
          pair: l.pair,
          week: l.week,
          subgroup: l.subgroup,
          subjectId: l.subjectId,
          teacherId: l.teacherId,
          roomId: l.roomId,
        })),
      });
    }
    return s;
  });
  await audit("semester.create", `Створено семестр «${semester.title}»${copyFrom ? " (копія)" : ""}`);
  return NextResponse.json({ semester }, { status: 201 });
}

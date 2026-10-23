import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getToday, getWeekChanges, lessonsWhere } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const teacher = Number.isInteger(id) ? await prisma.teacher.findUnique({ where: { id } }) : null;
  if (!teacher) return NextResponse.json({ error: "Викладача не знайдено" }, { status: 404 });
  const today = await getToday();
  const [lessons, changes] = await Promise.all([lessonsWhere({ teacherId: id }), getWeekChanges(today.weekStart)]);
  return NextResponse.json({ teacher, lessons, changes, weekStart: today.weekStart }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

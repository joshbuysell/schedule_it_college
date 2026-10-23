import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { activeSemesterId, getToday, getWeekChanges, lessonsWhere } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name);
  const group = await prisma.group.findUnique({ where: { name }, include: { practices: { where: { semesterId: await activeSemesterId() } } } });
  if (!group) return NextResponse.json({ error: "Групу не знайдено" }, { status: 404 });

  const today = await getToday();
  const [lessons, changes] = await Promise.all([lessonsWhere({ groupId: group.id }), getWeekChanges(today.weekStart, { groupId: group.id })]);
  return NextResponse.json(
    {
      group: { id: group.id, name: group.name, course: group.course, specialty: group.specialty },
      weekStart: today.weekStart,
      changes,
      currentWeek: today.parity,
      bells: today.bells,
      lessons,
      practices: group.practices.map(({ title, dates, teachers }) => ({ title, dates, teachers })),
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}

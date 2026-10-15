import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getToday, lessonsWhere } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name);
  const group = await prisma.group.findUnique({ where: { name }, include: { practices: true } });
  if (!group) return NextResponse.json({ error: "Групу не знайдено" }, { status: 404 });

  const [lessons, today] = await Promise.all([lessonsWhere({ groupId: group.id }), getToday()]);
  return NextResponse.json(
    {
      group: { name: group.name, course: group.course, specialty: group.specialty },
      currentWeek: today.parity,
      bells: today.bells,
      lessons,
      practices: group.practices.map(({ title, dates, teachers }) => ({ title, dates, teachers })),
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getToday, getWeekChanges, lessonsWhere } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name);
  const room = await prisma.room.findUnique({ where: { name } });
  if (!room) return NextResponse.json({ error: "Аудиторію не знайдено" }, { status: 404 });
  const today = await getToday();
  const [lessons, changes] = await Promise.all([lessonsWhere({ roomId: room.id }), getWeekChanges(today.weekStart)]);
  return NextResponse.json({ room, lessons, changes, weekStart: today.weekStart }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

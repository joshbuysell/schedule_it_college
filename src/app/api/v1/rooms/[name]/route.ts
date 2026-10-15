import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { lessonsWhere } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name);
  const room = await prisma.room.findUnique({ where: { name } });
  if (!room) return NextResponse.json({ error: "Аудиторію не знайдено" }, { status: 404 });
  const lessons = await lessonsWhere({ roomId: room.id });
  return NextResponse.json({ room, lessons }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

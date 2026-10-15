import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { lessonsWhere } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const teacher = Number.isInteger(id) ? await prisma.teacher.findUnique({ where: { id } }) : null;
  if (!teacher) return NextResponse.json({ error: "Викладача не знайдено" }, { status: 404 });
  const lessons = await lessonsWhere({ teacherId: id });
  return NextResponse.json({ teacher, lessons }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

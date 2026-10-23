import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad } from "@/lib/admin";
import { practiceInput } from "@/lib/practiceInput";
import { activeSemesterId } from "@/lib/queries";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const parsed = practiceInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  if (!(await prisma.group.findUnique({ where: { id: parsed.data.groupId } }))) return bad("Групу не знайдено", 404);
  const practice = await prisma.practice.create({ data: { ...parsed.data, semesterId: parsed.data.semesterId ?? (await activeSemesterId()) } });
  await audit("practice.create", `Додано практику «${practice.title}» (${practice.dates})`);
  return NextResponse.json({ practice }, { status: 201 });
}

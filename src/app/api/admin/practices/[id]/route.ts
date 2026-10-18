import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad } from "@/lib/admin";
import { practiceInput } from "@/lib/practiceInput";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const parsed = practiceInput.omit({ groupId: true }).partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  const practice = await prisma.practice.update({ where: { id: Number((await params).id) }, data: parsed.data }).catch(() => null);
  return practice ? NextResponse.json({ practice }) : bad("Запис не знайдено", 404);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const ok = await prisma.practice.delete({ where: { id: Number((await params).id) } }).catch(() => null);
  return ok ? NextResponse.json({ ok: true }) : bad("Запис не знайдено", 404);
}

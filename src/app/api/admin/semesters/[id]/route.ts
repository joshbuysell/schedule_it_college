import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { bad } from "@/lib/admin";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const patch = z.object({
  title: z.string().trim().min(3).max(80).optional(),
  numeratorAnchor: ymd.optional(),
  endDate: ymd.optional(),
  activate: z.literal(true).optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  const { activate, ...data } = parsed.data;
  const semester = await prisma.$transaction(async (tx) => {
    if (activate) await tx.semester.updateMany({ where: { active: true }, data: { active: false } });
    return tx.semester.update({ where: { id }, data: { ...data, ...(activate && { active: true }) } });
  }).catch(() => null);
  if (semester) await audit(activate ? "semester.publish" : "semester.update", `${activate ? "Опубліковано" : "Змінено"} семестр «${semester.title}»`);
  return semester ? NextResponse.json({ semester }) : bad("Семестр не знайдено", 404);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const s = await prisma.semester.findUnique({ where: { id } });
  if (!s) return bad("Семестр не знайдено", 404);
  if (s.active) return bad("Не можна видалити семестр, який зараз бачать студенти");
  await prisma.semester.delete({ where: { id } });
  await audit("semester.delete", `Видалено семестр «${s.title}»`);
  return NextResponse.json({ ok: true });
}

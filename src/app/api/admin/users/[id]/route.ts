import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { bad, getSession } from "@/lib/admin";
import { generatePassword } from "@/lib/credentials";

type Ctx = { params: Promise<{ id: string }> };

const patch = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(["admin", "editor", "teacher"]).optional(),
  teacherId: z.number().int().positive().nullable().optional(),
  resetPassword: z.boolean().optional(),
});

async function guard(id: number) {
  const session = await getSession();
  if (session?.role !== "admin") return bad("Лише адміністратор керує користувачами", 403);
  if (session.uid === id) return bad("Свій обліковий запис тут змінювати не можна");
  return null;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const denied = await guard(id);
  if (denied) return denied;
  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  const { resetPassword, ...data } = parsed.data;
  const password = resetPassword ? generatePassword() : null;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { ...data, ...(password && { passwordHash: await bcrypt.hash(password, 10) }) },
      select: { id: true, email: true, name: true, role: true, teacherId: true },
    });
    return NextResponse.json({ user, password });
  } catch {
    return bad("Не вдалося зберегти", 409);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const denied = await guard(id);
  if (denied) return denied;
  const ok = await prisma.user.delete({ where: { id } }).catch(() => null);
  return ok ? NextResponse.json({ ok: true }) : bad("Користувача не знайдено", 404);
}

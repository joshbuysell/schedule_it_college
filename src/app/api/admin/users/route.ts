import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { bad, getSession } from "@/lib/admin";
import { generatePassword } from "@/lib/credentials";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const userInput = z.object({
  email: z.string().trim().toLowerCase().min(3).max(80),
  name: z.string().trim().min(2).max(80),
  role: z.enum(["admin", "editor", "teacher"]),
  teacherId: z.number().int().positive().nullish(),
});

export async function GET() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, teacherId: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  if ((await getSession())?.role !== "admin") return bad("Лише адміністратор керує користувачами", 403);
  const parsed = userInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  const password = generatePassword();
  try {
    const user = await prisma.user.create({
      data: { ...parsed.data, teacherId: parsed.data.teacherId ?? null, passwordHash: await bcrypt.hash(password, 10) },
      select: { id: true, email: true, name: true, role: true, teacherId: true },
    });
    await audit("user.create", `Створено користувача ${user.email} (${user.role})`);
    return NextResponse.json({ user, password }, { status: 201 });
  } catch {
    return bad("Такий логін уже є або викладач уже має обліковий запис", 409);
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { bad, getSession } from "@/lib/admin";
import { generatePassword, loginFor } from "@/lib/credentials";
import { audit } from "@/lib/audit";

export async function POST() {
  if ((await getSession())?.role !== "admin") return bad("Лише адміністратор керує користувачами", 403);
  const teachers = await prisma.teacher.findMany({ where: { user: null }, orderBy: { shortName: "asc" } });
  const taken = new Set((await prisma.user.findMany({ select: { email: true } })).map((u) => u.email));

  const created: { teacher: string; login: string; password: string }[] = [];
  for (const t of teachers) {
    let login = loginFor(t.shortName);
    for (let i = 2; taken.has(login); i++) login = `${loginFor(t.shortName)}${i}`;
    taken.add(login);
    const password = generatePassword();
    await prisma.user.create({
      data: { email: login, name: t.fullName ?? t.shortName, role: "teacher", teacherId: t.id, passwordHash: await bcrypt.hash(password, 10) },
    });
    created.push({ teacher: t.fullName ?? t.shortName, login, password });
  }
  await audit("user.bulk", `Створено доступи для ${created.length} викладачів`);
  return NextResponse.json({ created });
}

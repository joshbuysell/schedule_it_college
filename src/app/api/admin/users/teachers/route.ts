import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { bad, getSession } from "@/lib/admin";
import { generatePassword, loginFor } from "@/lib/credentials";
import { audit } from "@/lib/audit";

export const maxDuration = 60;

export async function POST() {
  if ((await getSession())?.role !== "admin") return bad("Лише адміністратор керує користувачами", 403);
  const teachers = await prisma.teacher.findMany({ where: { user: null }, orderBy: { shortName: "asc" } });
  const taken = new Set((await prisma.user.findMany({ select: { email: true } })).map((u) => u.email));

  const created = teachers.map((t) => {
    let login = loginFor(t.shortName);
    for (let i = 2; taken.has(login); i++) login = `${loginFor(t.shortName)}${i}`;
    taken.add(login);
    return { teacher: t.fullName ?? t.shortName, teacherId: t.id, login, password: generatePassword() };
  });
  const hashes = await Promise.all(created.map((c) => bcrypt.hash(c.password, 10)));
  await prisma.user.createMany({
    data: created.map((c, i) => ({ email: c.login, name: c.teacher, role: "teacher", teacherId: c.teacherId, passwordHash: hashes[i] })),
  });
  await audit("user.bulk", `Створено доступи для ${created.length} викладачів`);
  return NextResponse.json({ created: created.map(({ teacher, login, password }) => ({ teacher, login, password })) });
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const user = email ? await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } }) : null;
  if (!user || !password || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Невірний email або пароль" }, { status: 401 });
  }
  const token = await createSessionToken({ uid: user.id, email: user.email, name: user.name, role: user.role });
  const res = NextResponse.json({ ok: true, name: user.name });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}

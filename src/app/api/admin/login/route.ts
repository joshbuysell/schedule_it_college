import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const limit = rateLimit(`login:${ip}`, 8, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Забагато спроб входу. Спробуйте через ${Math.ceil(limit.retryAfter / 60)} хв.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }
  const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const user = email ? await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } }) : null;
  if (!user || !password || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Невірний email або пароль" }, { status: 401 });
  }
  const token = await createSessionToken({ uid: user.id, email: user.email, name: user.name, role: user.role, teacherId: user.teacherId });
  const res = NextResponse.json({ ok: true, name: user.name, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}

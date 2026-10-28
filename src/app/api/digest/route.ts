import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { botEnabled, dayText, send, targetOf } from "@/lib/telegram";
import { dayPush, pushTo } from "@/lib/push";
import type { Target } from "@/lib/daily";
import { getToday } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function telegramDigest(date: string) {
  if (!botEnabled()) return 0;
  const subs = await prisma.telegramSub.findMany({ where: { morning: true } });
  let sent = 0;
  for (const s of subs) {
    const target = await targetOf(s.chatId);
    if (!target) continue;
    await send(s.chatId, `☀️ Доброго ранку!\n\n${await dayText(target, date)}`);
    sent++;
  }
  return sent;
}

async function pushDigest(date: string) {
  const subs = await prisma.pushSub.findMany({ where: { morning: true }, distinct: ["target"], select: { target: true, groupId: true, teacherId: true } });
  const [groups, teachers] = await Promise.all([
    prisma.group.findMany({ where: { id: { in: subs.map((s) => s.groupId).filter((x): x is number => !!x) } } }),
    prisma.teacher.findMany({ where: { id: { in: subs.map((s) => s.teacherId).filter((x): x is number => !!x) } } }),
  ]);
  let sent = 0;
  for (const s of subs) {
    const g = groups.find((x) => x.id === s.groupId);
    const t = teachers.find((x) => x.id === s.teacherId);
    const target: Target | null = g ? { kind: "group", id: g.id, name: g.name } : t ? { kind: "teacher", id: t.id, name: t.shortName } : null;
    const payload = target && (await dayPush(target, date));
    if (payload) sent += await pushTo({ target: s.target, morning: true }, payload);
  }
  return sent;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });

  const today = await getToday();
  if (today.weekday > 5) return NextResponse.json({ ok: true, sent: 0, reason: "вихідний" });

  const [telegram, push] = await Promise.all([telegramDigest(today.ymd), pushDigest(today.ymd)]);
  return NextResponse.json({ ok: true, telegram, push });
}

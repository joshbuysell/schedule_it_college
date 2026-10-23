import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { botEnabled, dayText, send, targetOf } from "@/lib/telegram";
import { getToday } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  if (!botEnabled()) return NextResponse.json({ ok: false, reason: "TELEGRAM_BOT_TOKEN не задано" });

  const today = await getToday();
  if (today.weekday > 5) return NextResponse.json({ ok: true, sent: 0, reason: "вихідний" });

  const subs = await prisma.telegramSub.findMany({ where: { morning: true } });
  let sent = 0;
  for (const s of subs) {
    const target = await targetOf(s.chatId);
    if (!target) continue;
    await send(s.chatId, `☀️ Доброго ранку!\n\n${await dayText(target, today.ymd)}`);
    sent++;
  }
  return NextResponse.json({ ok: true, sent });
}

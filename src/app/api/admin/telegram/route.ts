import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad } from "@/lib/admin";
import { botEnabled, tg } from "@/lib/telegram";
import { publicUrl } from "@/lib/publicUrl";
import { audit } from "@/lib/audit";

export async function GET() {
  const [subs, info, me] = await Promise.all([
    prisma.telegramSub.count(),
    botEnabled() ? tg("getWebhookInfo", {}) : null,
    botEnabled() ? tg("getMe", {}) : null,
  ]);
  return NextResponse.json({ enabled: botEnabled(), subs, webhook: info?.result?.url ?? null, username: me?.result?.username ?? null });
}

export async function POST() {
  if (!botEnabled()) return bad("Задайте TELEGRAM_BOT_TOKEN у змінних середовища");
  if (!process.env.TELEGRAM_WEBHOOK_SECRET) return bad("Задайте TELEGRAM_WEBHOOK_SECRET у змінних середовища");
  const base = await publicUrl();
  if (!base.startsWith("https://")) return bad("Telegram працює лише з публічною адресою https:// (після розміщення онлайн)");

  const hook = await tg("setWebhook", { url: `${base}/api/telegram`, secret_token: process.env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ["message"] });
  await tg("setMyCommands", {
    commands: [
      { command: "today", description: "Розклад на сьогодні" },
      { command: "tomorrow", description: "Розклад на наступний робочий день" },
      { command: "morning", description: "Увімкнути/вимкнути ранкове повідомлення" },
      { command: "stop", description: "Відписатися" },
    ],
  });
  if (!hook?.ok) return bad(hook?.description ?? "Telegram відхилив запит");
  await audit("telegram.webhook", `Підключено Telegram-бота до ${base}`);
  return NextResponse.json({ ok: true });
}

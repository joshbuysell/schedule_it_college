import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dayText, findTarget, send, targetOf } from "@/lib/telegram";
import { getToday } from "@/lib/queries";
import { addDays, weekdayOf } from "@/lib/schedule";

const HELP = `Надішліть назву групи (напр. <b>КІ-21</b>) або прізвище викладача — і я:
• покажу розклад на сьогодні;
• щоранку надсилатиму пари на день;
• одразу повідомлю про заміни.

Команди:
/today — сьогодні
/tomorrow — наступний робочий день
/morning — увімкнути/вимкнути ранкове повідомлення
/stop — відписатися`;

export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = await req.json().catch(() => null);
  const msg = update?.message;
  const text: string = msg?.text?.trim() ?? "";
  const chatId = msg?.chat?.id != null ? String(msg.chat.id) : null;
  if (!chatId || !text) return NextResponse.json({ ok: true });

  const today = await getToday();
  const nextWorkday = () => {
    let d = addDays(today.ymd, 1);
    while (weekdayOf(d) > 5) d = addDays(d, 1);
    return d;
  };

  if (text === "/start" || text === "/help") {
    await send(chatId, `Вітаю! Це бот розкладу ІТ коледжу Львівської політехніки.\n\n${HELP}`);
  } else if (text === "/stop") {
    await prisma.telegramSub.deleteMany({ where: { chatId } });
    await send(chatId, "Ви відписалися. Щоб підписатися знову, надішліть назву групи.");
  } else if (text === "/morning") {
    const sub = await prisma.telegramSub.findUnique({ where: { chatId } });
    if (!sub) await send(chatId, "Спершу надішліть назву групи або прізвище.");
    else {
      await prisma.telegramSub.update({ where: { chatId }, data: { morning: !sub.morning } });
      await send(chatId, sub.morning ? "Ранкові повідомлення вимкнено. Про заміни повідомлятиму й далі." : "Ранкові повідомлення увімкнено.");
    }
  } else if (text === "/today" || text === "/tomorrow") {
    const target = await targetOf(chatId);
    if (!target) await send(chatId, "Спершу надішліть назву групи або прізвище викладача.");
    else await send(chatId, await dayText(target, text === "/today" ? today.ymd : nextWorkday()));
  } else {
    const found = await findTarget(text.replace(/^\//, ""));
    if (!found) {
      await send(chatId, `Не знайшов «${text.slice(0, 40)}». Перевірте назву групи, напр. КН-21.\n\n${HELP}`);
    } else if (Array.isArray(found)) {
      await send(chatId, `Знайшов кількох викладачів:\n${found.map((t) => `• ${t.name}`).join("\n")}\n\nНадішліть прізвище з ініціалами.`);
    } else {
      await prisma.telegramSub.upsert({
        where: { chatId },
        update: { groupId: found.kind === "group" ? found.id : null, teacherId: found.kind === "teacher" ? found.id : null },
        create: { chatId, groupId: found.kind === "group" ? found.id : null, teacherId: found.kind === "teacher" ? found.id : null },
      });
      const date = today.weekday > 5 || today.minutes > 17 * 60 ? nextWorkday() : today.ymd;
      await send(chatId, `✅ Ви підписані на <b>${found.name}</b>.\n\n${await dayText(found, date)}`);
    }
  }
  return NextResponse.json({ ok: true });
}

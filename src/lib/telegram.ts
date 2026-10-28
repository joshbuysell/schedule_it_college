import "server-only";
import { prisma } from "./db";
import { changeSummary, type ChangeDTO } from "./changes";
import { dayPlan, isStruck, type Target } from "./daily";
import { formatDate, normalizeQuery, layoutSwap, translit } from "./schedule";

const API = "https://api.telegram.org";

export const botEnabled = () => !!process.env.TELEGRAM_BOT_TOKEN;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function tg(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return res?.json().catch(() => null) ?? null;
}

export async function send(chatId: string, text: string) {
  return tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true });
}

export async function dayText(target: Target, date: string) {
  const { day, parity, bells, lessons } = await dayPlan(target, date);
  const title = `<b>${esc(target.name)}</b> · ${formatDate(date, { weekday: "long", day: "numeric", month: "long" })}`;
  if (day > 5) return `${title}\nВихідний 🙂`;
  if (!lessons.length) return `${title}\nПар немає.`;
  const lines = lessons.map((l) => {
    const b = bells.find((x) => x.pair === l.pair);
    const who = target.kind === "group" ? l.teacher : l.group;
    const body = [l.subject, who, l.room && `ауд. ${l.room}`, l.subgroup ? `${l.subgroup} пгр` : null].filter(Boolean).map((x) => esc(String(x))).join(" · ");
    const mark = l.change ? (l.change.kind === "cancelled" ? " ❌ скасовано" : l.change.kind === "taken" ? " ↪︎ заміна" : l.change.kind === "room" ? " 🚪 інша аудиторія" : " 🔄 заміна") : "";
    return `${l.pair}. ${b?.start ?? ""} ${isStruck(l) ? `<s>${body}</s>` : body}${mark}${l.change?.note ? `\n   <i>${esc(l.change.note)}</i>` : ""}`;
  });
  return `${title} · ${parity === "num" ? "чисельник" : "знаменник"}\n\n${lines.join("\n")}`;
}

export async function findTarget(text: string): Promise<Target | Target[] | null> {
  const variants = [...new Set([text, layoutSwap(text), translit(text)].map(normalizeQuery).filter(Boolean))];
  if (!variants.length) return null;
  const groups = await prisma.group.findMany();
  const g = groups.find((x) => variants.includes(normalizeQuery(x.name)));
  if (g) return { kind: "group", id: g.id, name: g.name };
  const teachers = await prisma.teacher.findMany();
  const hits = teachers.filter((t) => variants.some((v) => normalizeQuery(t.shortName).startsWith(v) || normalizeQuery(t.fullName ?? "").startsWith(v)));
  if (hits.length === 1) return { kind: "teacher", id: hits[0].id, name: hits[0].shortName };
  if (hits.length > 1) return hits.slice(0, 8).map((t) => ({ kind: "teacher", id: t.id, name: t.shortName }));
  return null;
}

export async function targetOf(chatId: string): Promise<Target | null> {
  const sub = await prisma.telegramSub.findUnique({ where: { chatId } });
  if (sub?.groupId) {
    const g = await prisma.group.findUnique({ where: { id: sub.groupId } });
    if (g) return { kind: "group", id: g.id, name: g.name };
  }
  if (sub?.teacherId) {
    const t = await prisma.teacher.findUnique({ where: { id: sub.teacherId } });
    if (t) return { kind: "teacher", id: t.id, name: t.shortName };
  }
  return null;
}

export async function notifyChanges(changes: ChangeDTO[]) {
  if (!botEnabled()) return;
  for (const c of changes) {
    const teacherIds = [c.teacherId, ...c.replaces.map((r) => r.teacherId)].filter((x): x is number => !!x);
    const subs = await prisma.telegramSub.findMany({ where: { OR: [{ groupId: c.groupId }, { teacherId: { in: teacherIds } }] } });
    const text = `📣 <b>Зміна в розкладі</b>\n${formatDate(c.date, { weekday: "long", day: "numeric", month: "long" })}, ${c.pair} пара, ${esc(c.group)}\n${esc(changeSummary(c))}${c.note ? `\n<i>${esc(c.note)}</i>` : ""}`;
    for (const s of subs) await send(s.chatId, text);
  }
}

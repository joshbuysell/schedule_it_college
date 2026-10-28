import "server-only";
import webpush from "web-push";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { changeSummary, type ChangeDTO } from "./changes";
import { dayPlan, isStruck, type Target } from "./daily";
import { formatDate } from "./schedule";

type Keys = { publicKey: string; privateKey: string };
let cached: Keys | null = null;

async function vapidKeys(): Promise<Keys> {
  if (cached) return cached;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    cached = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    return cached;
  }
  const row = await prisma.setting.findUnique({ where: { key: "vapidKeys" } });
  if (row) return (cached = JSON.parse(row.value));
  const fresh = webpush.generateVAPIDKeys();
  await prisma.setting.create({ data: { key: "vapidKeys", value: JSON.stringify(fresh) } }).catch(() => null);
  const saved = await prisma.setting.findUnique({ where: { key: "vapidKeys" } });
  return (cached = saved ? JSON.parse(saved.value) : fresh);
}

export async function pushPublicKey() {
  return (await vapidKeys()).publicKey;
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

export async function pushTo(where: Prisma.PushSubWhereInput, payload: PushPayload | ((s: { groupId: number | null; teacherId: number | null }) => PushPayload)) {
  const subs = await prisma.pushSub.findMany({ where, orderBy: { id: "asc" } });
  const unique = [...new Map(subs.map((s) => [s.endpoint, s])).values()];
  if (!unique.length) return 0;

  const { publicKey, privateKey } = await vapidKeys();
  const vapidDetails = { subject: process.env.VAPID_SUBJECT || `mailto:${process.env.ADMIN_EMAIL || "admin@itcollege.lviv.ua"}`, publicKey, privateKey };
  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    unique.map((s) => {
      const body = typeof payload === "function" ? payload(s) : payload;
      return webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(body), { vapidDetails, TTL: 12 * 3600, urgency: "high" })
        .then(() => sent++)
        .catch((e: { statusCode?: number }) => {
          if (e.statusCode === 404 || e.statusCode === 410) dead.push(s.endpoint);
          else console.error("push", e.statusCode, e);
        });
    }),
  );
  if (dead.length) await prisma.pushSub.deleteMany({ where: { endpoint: { in: dead } } });
  return sent;
}

const pageOf = (s: { groupId: number | null; teacherId: number | null }, group: string) =>
  s.teacherId && !s.groupId ? `/teacher/${s.teacherId}` : `/group/${encodeURIComponent(group)}`;

export async function notifyChangesPush(changes: ChangeDTO[]) {
  for (const c of changes) {
    const teacherIds = [c.teacherId, ...c.replaces.map((r) => r.teacherId)].filter((x): x is number => !!x);
    const when = formatDate(c.date, { weekday: "short", day: "numeric", month: "long" });
    await pushTo({ OR: [{ groupId: c.groupId }, { teacherId: { in: teacherIds } }] }, (s) => ({
      title: `Зміна в розкладі · ${c.group}`,
      body: `${when}, ${c.pair} пара: ${changeSummary(c)}${c.note ? `\n${c.note}` : ""}`,
      url: pageOf(s, c.group),
      tag: `change-${c.id}`,
    }));
  }
}

export async function notifyRequestPush(teacherId: number, text: string) {
  return pushTo({ teacherId }, { title: "Заявка до навчальної частини", body: text, url: "/cabinet", tag: `request-${teacherId}` });
}

export async function dayPush(target: Target, date: string): Promise<PushPayload | null> {
  const { day, bells, lessons } = await dayPlan(target, date);
  if (day > 5) return null;
  const live = lessons.filter((l) => !isStruck(l));
  const changed = lessons.some((l) => l.change);
  const lines = live.map((l) => {
    const start = bells.find((b) => b.pair === l.pair)?.start ?? "";
    return `${l.pair}. ${start} ${l.subject}${l.room ? `, ауд. ${l.room}` : ""}${l.change ? " (заміна)" : ""}`;
  });
  return {
    title: `${target.name}: ${live.length ? `${live.length} ${live.length === 1 ? "пара" : live.length < 5 ? "пари" : "пар"} сьогодні` : "сьогодні пар немає"}${changed ? " · є зміни" : ""}`,
    body: lines.join("\n") || "Гарного дня!",
    url: target.kind === "group" ? `/group/${encodeURIComponent(target.name)}` : `/teacher/${target.id}`,
    tag: `morning-${target.kind}-${target.id}`,
  };
}

import "server-only";
import { prisma } from "./db";
import { kyivNow } from "./schedule";

const KNOWN = /^\/(|groups|teachers|rooms|help|integration|board|embed|embed\/changes|group\/[^/]{1,30}|teacher\/\d{1,6}|room\/[^/]{1,20})$/;

export function normalizePath(raw: string) {
  let path: string;
  try {
    path = decodeURIComponent(new URL(raw, "http://x").pathname).replace(/\/+$/, "") || "/";
  } catch {
    return null;
  }
  if (path.startsWith("/embed/group/")) path = "/embed";
  return KNOWN.test(path) ? path : null;
}

export async function hit(path: string) {
  const day = kyivNow().ymd;
  await prisma.pageStat
    .upsert({ where: { day_path: { day, path } }, update: { count: { increment: 1 } }, create: { day, path, count: 1 } })
    .catch(() => null);
}

export async function statsSince(days: number) {
  const now = kyivNow().ymd;
  const from = new Date(now + "T12:00:00Z");
  from.setUTCDate(from.getUTCDate() - days + 1);
  const fromYmd = from.toISOString().slice(0, 10);
  const rows = await prisma.pageStat.findMany({ where: { day: { gte: fromYmd } } });

  const byDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() + i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  const byPath = new Map<string, number>();
  for (const r of rows) {
    byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.count);
    byPath.set(r.path, (byPath.get(r.path) ?? 0) + r.count);
  }
  const sum = (pred: (p: string) => boolean) => [...byPath].filter(([p]) => pred(p)).reduce((s, [, n]) => s + n, 0);
  return {
    days: [...byDay].map(([day, count]) => ({ day, count })),
    total: sum(() => true),
    embed: sum((p) => p.startsWith("/embed")),
    calendars: sum((p) => p.startsWith("ics:")),
    board: sum((p) => p === "/board"),
    groups: [...byPath]
      .filter(([p]) => p.startsWith("/group/"))
      .map(([p, n]) => ({ name: p.slice(7), count: n }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}

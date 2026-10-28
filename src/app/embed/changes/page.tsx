import type { Metadata } from "next";
import { getChanges, getToday } from "@/lib/queries";
import { addDays, weekdayOf } from "@/lib/schedule";
import ChangesWidget from "./ChangesWidget";

export const metadata: Metadata = { title: "Зміни в розкладі", robots: { index: false } };
export const dynamic = "force-dynamic";

const safeLink = (v?: string) => (v && /^https?:\/\/[^\s"'<>]+$/.test(v) ? v : null);

export default async function ChangesEmbed({ searchParams }: { searchParams: Promise<{ link?: string; limit?: string }> }) {
  const sp = await searchParams;
  const today = await getToday();
  const start = today.weekday > 5 ? addDays(today.ymd, 8 - today.weekday) : today.ymd;
  let next = addDays(start, 1);
  while (weekdayOf(next) > 5) next = addDays(next, 1);
  const changes = await getChanges({ status: "approved", date: { in: [start, next] } });

  return (
    <div className="theme-college">
      <ChangesWidget
        changes={changes}
        today={today.ymd}
        dates={[start, next]}
        parity={today.parity}
        link={safeLink(sp.link)}
        limit={Math.min(20, Math.max(3, Number(sp.limit) || 6))}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { getDictionaries } from "@/lib/admin";
import { getBells, getChanges, getSettings, getToday, lessonsWhere } from "@/lib/queries";
import { addDays, weekdayOf } from "@/lib/schedule";
import ChangesBoard from "./ChangesBoard";

export const metadata: Metadata = { title: "Заміни" };
export const dynamic = "force-dynamic";

function workingDay(ymd: string) {
  let d = ymd;
  while (weekdayOf(d) > 5) d = addDays(d, 1);
  return d;
}

export default async function ChangesPage({ searchParams }: { searchParams: Promise<{ date?: string; change?: string }> }) {
  const [{ date: q, change }, today, dict, lessons, bells, settings, pending] = await Promise.all([
    searchParams,
    getToday(),
    getDictionaries(),
    lessonsWhere({}),
    getBells(),
    getSettings(),
    getChanges({ status: "pending" }),
  ]);
  const date = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : workingDay(today.minutes > 17 * 60 + 50 ? addDays(today.ymd, 1) : today.ymd);
  const changes = await getChanges({ date, status: { not: "rejected" } });

  return (
    <ChangesBoard
      dict={dict}
      lessons={lessons}
      bells={bells}
      anchor={settings.numeratorAnchor}
      initialDate={date}
      today={today.ymd}
      initialChanges={changes}
      initialPending={pending}
      focusChange={change ? Number(change) : null}
    />
  );
}

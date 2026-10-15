"use client";

import { useEffect, useState } from "react";
import { currentPair, kyivNow, type BellDTO, type Week } from "@/lib/schedule";

const DAY_NAMES = ["", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];

export default function TodayBadge({ bells, parity }: { bells: BellDTO[]; parity: Exclude<Week, "all"> }) {
  const [now, setNow] = useState<ReturnType<typeof kyivNow> | null>(null);
  useEffect(() => {
    const tick = () => setNow(kyivNow());
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  const cur = now && now.weekday <= 5 ? currentPair(bells, now.minutes) : null;
  const bell = cur && bells.find((b) => b.pair === cur.pair);
  const date = now ? new Date(now.ymd + "T12:00:00").toLocaleDateString("uk-UA", { day: "numeric", month: "long" }) : "";

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
      <span className="rounded-full border border-line bg-surface px-3 py-1.5">
        {now ? `${DAY_NAMES[now.weekday]}, ${date}` : " "}
      </span>
      <span className="rounded-full bg-brand px-3 py-1.5 text-brand-ink">
        {parity === "num" ? "Чисельник" : "Знаменник"}
      </span>
      {cur && bell && (
        <span className="flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-accent">
          {cur.live && <span className="live-dot size-2 rounded-full bg-accent" />}
          {cur.live ? "Зараз" : "Далі"} {cur.pair} пара · {bell.start}–{bell.end}
        </span>
      )}
    </div>
  );
}

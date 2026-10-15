"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { currentPair, kyivNow, type BellDTO, type Week } from "@/lib/schedule";

const DAY_NAMES = ["", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];

export default function TodayBadge({ bells, parity, onBrand }: { bells: BellDTO[]; parity: Exclude<Week, "all">; onBrand?: boolean }) {
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
      <span className={clsx("rounded-full px-3 py-1.5", onBrand ? "bg-white/15" : "border border-line bg-surface")}>
        {now ? `${DAY_NAMES[now.weekday]}, ${date}` : " "}
      </span>
      <span className={clsx("rounded-full px-3 py-1.5", onBrand ? "bg-white text-brand" : "bg-brand text-brand-ink")}>
        {parity === "num" ? "Чисельник" : "Знаменник"}
      </span>
      {cur && bell && (
        <span className={clsx("flex items-center gap-2 rounded-full px-3 py-1.5", onBrand ? "bg-accent text-white" : "bg-accent-soft text-accent")}>
          {cur.live && <span className={clsx("live-dot size-2 rounded-full", onBrand ? "bg-white" : "bg-accent")} />}
          {cur.live ? "Зараз" : "Далі"} {cur.pair} пара · {bell.start}–{bell.end}
        </span>
      )}
    </div>
  );
}

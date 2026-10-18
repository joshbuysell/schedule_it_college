"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { currentPair, kyivNow, type BellDTO, type Week } from "@/lib/schedule";

const DAY_NAMES = ["", "понеділок", "вівторок", "середа", "четвер", "пʼятниця", "субота", "неділя"];

export default function TodayBadge({ bells, parity, onBrand }: { bells: BellDTO[]; parity: Exclude<Week, "all">; onBrand?: boolean }) {
  const [now, setNow] = useState<ReturnType<typeof kyivNow> | null>(null);
  useEffect(() => {
    const tick = () => setNow(kyivNow());
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  if (!now) return <p className="h-5" />;

  const cur = now.weekday <= 5 ? currentPair(bells, now.minutes) : null;
  const bell = cur && bells.find((b) => b.pair === cur.pair);
  const date = new Date(now.ymd + "T12:00:00").toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
  const week = parity === "num" ? "чисельник" : "знаменник";

  return (
    <p className={clsx("flex flex-wrap items-center gap-x-3 gap-y-1 text-sm", onBrand ? "text-white/85" : "text-ink-2")}>
      <span>
        {date}, {DAY_NAMES[now.weekday]}
      </span>
      <span className={onBrand ? "text-white/40" : "text-line"}>|</span>
      <span>
        {now.weekday > 5 ? "з понеділка " : "тиждень: "}
        <b className={onBrand ? "text-white" : "text-brand"}>{week}</b>
      </span>
      {cur && bell && (
        <>
          <span className={onBrand ? "text-white/40" : "text-line"}>|</span>
          <span className="inline-flex items-center gap-1.5">
            {cur.live && <span className="live-dot size-2 rounded-full bg-accent" />}
            {cur.live ? "зараз" : "далі"}{" "}
            <b className={onBrand ? "text-white" : "text-ink"}>
              {cur.pair} пара, {bell.start}–{bell.end}
            </b>
          </span>
        </>
      )}
    </p>
  );
}

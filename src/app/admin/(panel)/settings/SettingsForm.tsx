"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, LoaderCircle } from "lucide-react";
import type { BellDTO, Week } from "@/lib/schedule";

type Settings = { semesterLabel: string; numeratorAnchor: string; semesterEnd: string; approverTitle: string; approverName: string };

export default function SettingsForm({
  settings,
  bells: initialBells,
  parity,
  thisMonday,
}: {
  settings: Settings;
  bells: BellDTO[];
  parity: Exclude<Week, "all">;
  thisMonday: string;
}) {
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [bells, setBells] = useState(initialBells);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save(patch: Partial<Settings> & { bells?: BellDTO[] }) {
    setBusy(true);
    const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    setBusy(false);
    setMsg(res.ok ? "Збережено" : (await res.json().catch(() => ({}))).error ?? "Помилка");
    setTimeout(() => setMsg(""), 3000);
    router.refresh();
  }

  const flipWeek = () => {
    const anchor = parity === "num" ? new Date(Date.parse(thisMonday) - 7 * 86_400_000).toISOString().slice(0, 10) : thisMonday;
    setS({ ...s, numeratorAnchor: anchor });
    save({ numeratorAnchor: anchor });
  };

  const input = "h-10 rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand focus:ring-4 focus:ring-brand/15";
  return (
    <main className="mx-auto max-w-3xl px-4 pb-8">
      <div className="flex items-center justify-between">
        <span />
        {(busy || msg) && <span className="flex items-center gap-2 text-sm font-semibold text-ok">{busy && <LoaderCircle className="size-4 animate-spin" />}{msg}</span>}
      </div>

      <section className="mt-6 rounded-3xl border border-line bg-surface p-6 shadow-card">
        <h2 className="text-lg font-bold">Чисельник / знаменник</h2>
        <p className="mt-1 text-sm text-ink-3">Тиждень рахується автоматично. Якщо навчальна частина оголосила інакше — перемкніть одним натиском.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-xl bg-brand px-4 py-2 font-bold text-brand-ink">
            Цей тиждень: {parity === "num" ? "чисельник" : "знаменник"}
          </span>
          <button onClick={flipWeek} className="flex items-center gap-2 rounded-xl border border-line px-4 py-2 font-semibold hover:border-ink-3">
            <ArrowLeftRight className="size-4" /> Зробити {parity === "num" ? "знаменником" : "чисельником"}
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-line bg-surface p-6 shadow-card">
        <h2 className="text-lg font-bold">Семестр</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold sm:col-span-2">
            Назва (показується на головній)
            <input value={s.semesterLabel} onChange={(e) => setS({ ...s, semesterLabel: e.target.value })} className={`${input} mt-1.5 w-full`} />
          </label>
          <label className="text-sm font-semibold">
            Понеділок першого тижня-чисельника
            <input type="date" value={s.numeratorAnchor} onChange={(e) => setS({ ...s, numeratorAnchor: e.target.value })} className={`${input} mt-1.5 w-full`} />
          </label>
          <label className="text-sm font-semibold">
            Кінець семестру (для календаря .ics)
            <input type="date" value={s.semesterEnd} onChange={(e) => setS({ ...s, semesterEnd: e.target.value })} className={`${input} mt-1.5 w-full`} />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            «Затверджую» на друкованому розкладі — посада
            <input value={s.approverTitle} onChange={(e) => setS({ ...s, approverTitle: e.target.value })} className={`${input} mt-1.5 w-full`} />
          </label>
          <label className="text-sm font-semibold">
            Імʼя та ПРІЗВИЩЕ
            <input value={s.approverName} onChange={(e) => setS({ ...s, approverName: e.target.value })} className={`${input} mt-1.5 w-full`} />
          </label>
        </div>
        <button onClick={() => save(s)} className="mt-4 rounded-xl bg-brand px-4 py-2 font-semibold text-brand-ink hover:opacity-90">Зберегти</button>
      </section>

      <section className="mt-6 rounded-3xl border border-line bg-surface p-6 shadow-card">
        <h2 className="text-lg font-bold">Розклад дзвінків</h2>
        <div className="mt-4 space-y-2">
          {bells.map((b, i) => (
            <div key={b.pair} className="flex items-center gap-3">
              <span className="w-16 font-bold">{b.pair} пара</span>
              {(["start", "end"] as const).map((k) => (
                <input
                  key={k}
                  type="time"
                  value={b[k]}
                  onChange={(e) => setBells(bells.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                  className={input}
                />
              ))}
            </div>
          ))}
        </div>
        <button onClick={() => save({ bells })} className="mt-4 rounded-xl bg-brand px-4 py-2 font-semibold text-brand-ink hover:opacity-90">Зберегти дзвінки</button>
      </section>
    </main>
  );
}

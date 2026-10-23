import Link from "next/link";
import type { Metadata } from "next";
import clsx from "clsx";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getRoomOccupancy, getToday } from "@/lib/queries";
import { addDays, currentPair, formatDate } from "@/lib/schedule";

export const metadata: Metadata = { title: "Вільні аудиторії" };
export const dynamic = "force-dynamic";

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ date?: string; pair?: string }> }) {
  const sp = await searchParams;
  const today = await getToday();
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today.ymd;
  const cur = date === today.ymd ? currentPair(today.bells, today.minutes) : null;
  const pair = Number(sp.pair) || cur?.pair || 1;
  const { rooms, busy, parity, day } = await getRoomOccupancy(date);
  const usable = rooms.filter((r) => !r.shared);
  const free = usable.filter((r) => !busy.has(`${r.id}:${pair}`));
  const link = (d: string, p: number) => `/rooms?date=${d}&pair=${p}`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Вільні аудиторії</h1>
        <p className="mt-1 text-ink-2">
          {formatDate(date, { weekday: "long", day: "numeric", month: "long" })}
          {day <= 5 && <span className="text-ink-3"> · {parity === "num" ? "чисельник" : "знаменник"}</span>} · з урахуванням замін
        </p>

        <form className="mt-5 flex flex-wrap items-end gap-2">
          <label className="text-sm text-ink-2">
            Дата
            <input type="date" name="date" defaultValue={date} className="mt-1 block h-10 rounded-md border border-line px-2" />
          </label>
          <label className="text-sm text-ink-2">
            Пара
            <select name="pair" defaultValue={pair} className="mt-1 block h-10 rounded-md border border-line px-2">
              {today.bells.map((b) => (
                <option key={b.pair} value={b.pair}>
                  {b.pair} пара, {b.start}–{b.end}
                </option>
              ))}
            </select>
          </label>
          <button className="h-10 rounded-md bg-brand px-4 font-medium text-white hover:bg-brand-deep">Показати</button>
          <Link href={link(addDays(date, 1), pair)} className="h-10 content-center rounded-md border border-line px-3 text-sm hover:border-brand">
            Наступний день →
          </Link>
        </form>

        {day > 5 ? (
          <p className="mt-8 text-ink-2">Вихідний — усі аудиторії вільні.</p>
        ) : (
          <>
            <h2 className="mt-8 text-xl font-semibold">
              Вільні на {pair} пару: {free.length} з {usable.length}
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {free.map((r) => (
                <Link key={r.id} href={`/room/${encodeURIComponent(r.name)}`} className="rounded border border-ok/40 bg-ok/5 px-2.5 py-1 font-medium text-ok tabular-nums hover:bg-ok hover:text-white">
                  {r.name}
                </Link>
              ))}
            </div>

            <h2 className="mt-10 mb-3 text-xl font-semibold">Зайнятість за день</h2>
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-surface-2 text-left text-ink-3">
                  <tr>
                    <th className="px-3 py-2 font-medium">Аудиторія</th>
                    {today.bells.map((b) => (
                      <th key={b.pair} className={clsx("px-2 py-2 text-center font-medium", b.pair === pair && "bg-brand text-white")}>
                        <Link href={link(date, b.pair)}>{b.pair}</Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {usable.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-1.5 font-medium tabular-nums">
                        <Link href={`/room/${encodeURIComponent(r.name)}`} className="hover:text-brand hover:underline">
                          {r.name}
                        </Link>
                      </td>
                      {today.bells.map((b) => {
                        const who = busy.get(`${r.id}:${b.pair}`);
                        return (
                          <td key={b.pair} className="px-1 py-1">
                            <div
                              title={who?.join("\n")}
                              className={clsx(
                                "h-6 rounded-sm",
                                who ? (who.length > 1 ? "bg-danger/70" : "bg-brand/70") : "bg-ok/15",
                                b.pair === pair && "ring-2 ring-brand",
                              )}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-ink-3">Зелене — вільно, синє — зайнято, червоне — накладка. Наведіть курсор, щоб побачити групу.</p>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

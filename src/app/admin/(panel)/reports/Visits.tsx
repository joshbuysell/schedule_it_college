import { formatDate } from "@/lib/schedule";
import type { statsSince } from "@/lib/stats";

type Stats = Awaited<ReturnType<typeof statsSince>>;

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <p className="text-3xl font-semibold tabular-nums">{value.toLocaleString("uk-UA")}</p>
      <p className="mt-1 text-sm text-ink-2">{label}</p>
    </div>
  );
}

export default function Visits({ stats, subscribers }: { stats: Stats; subscribers: number }) {
  const max = Math.max(1, ...stats.days.map((d) => d.count));
  const label = (ymd: string) => formatDate(ymd, { day: "numeric", month: "short" });

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">Відвідуваність за 30 днів</h2>
        <span className="text-sm text-ink-3">Без cookie й IP-адрес: рахуються лише перегляди сторінок</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Tile value={stats.total - stats.calendars} label="переглядів розкладу" />
        <Tile value={stats.embed} label="з них — через сайт коледжу" />
        <Tile value={stats.calendars} label="оновлень календарів у телефонах" />
        <Tile value={subscribers} label="пристроїв зі сповіщеннями" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <figure className="rounded-md border border-line bg-surface p-4">
          <figcaption className="flex justify-between text-sm font-medium text-ink-2">
            Переглядів за день <span className="font-normal tabular-nums text-ink-3">найбільше: {max}</span>
          </figcaption>
          <div className="mt-3 flex h-40 items-end gap-[2px] border-b border-line" role="img" aria-label="Стовпчикова діаграма переглядів за день">
            {stats.days.map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 items-end">
                <div
                  className="w-full rounded-t-[4px] bg-brand transition-opacity group-hover:opacity-80"
                  style={{ height: d.count ? `${Math.max(2, (d.count / max) * 100)}%` : 0 }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white group-hover:block">
                  {formatDate(d.day, { weekday: "short", day: "numeric", month: "long" })}: <b>{d.count}</b>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-ink-3">
            <span>{label(stats.days[0].day)}</span>
            <span>{label(stats.days[stats.days.length - 1].day)}</span>
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-ink-3 hover:text-brand">Показати таблицею</summary>
            <table className="mt-2 w-full max-w-xs tabular-nums">
              <tbody>
                {stats.days.map((d) => (
                  <tr key={d.day} className="border-b border-line">
                    <td className="py-1 text-ink-2">{formatDate(d.day, { weekday: "short", day: "numeric", month: "long" })}</td>
                    <td className="py-1 text-right">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </figure>

        <div className="rounded-md border border-line bg-surface p-4">
          <p className="text-sm font-medium text-ink-2">Найпопулярніші групи</p>
          {stats.groups.length ? (
            <ol className="mt-2 text-sm">
              {stats.groups.map((g) => (
                <li key={g.name} className="flex justify-between border-b border-line py-1.5 last:border-0">
                  <span className="font-medium">{g.name}</span>
                  <span className="tabular-nums text-ink-2">{g.count}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-ink-3">Даних ще немає.</p>
          )}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Search from "@/components/Search";
import TodayBadge from "@/components/TodayBadge";
import GroupMatrix from "@/components/GroupMatrix";
import { MyGroupCard } from "@/components/MyGroup";
import { getSearchIndex, getToday } from "@/lib/queries";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [today, index, groups] = await Promise.all([getToday(), getSearchIndex(), prisma.group.findMany()]);

  return (
    <>
      <SiteHeader search={false} />
      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="border-b border-line pb-8 pt-8 sm:pt-12">
          <p className="text-sm text-ink-3">{today.settings.semesterLabel}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Розклад занять</h1>
          <div className="mt-6 max-w-3xl">
            <Search index={index} />
          </div>
          <div className="mt-4">
            <TodayBadge bells={today.bells} parity={today.parity} />
          </div>
        </section>

        <MyGroupCard bells={today.bells} parity={today.parity} />

        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold">Групи</h2>
            <Link href="/teachers" className="text-sm text-brand hover:underline">
              Розклад викладачів →
            </Link>
          </div>
          <GroupMatrix groups={groups} />
        </section>

        <section id="bells" className="mt-12 grid scroll-mt-20 gap-10 md:grid-cols-[minmax(0,320px)_1fr]">
          <div>
            <h2 className="mb-3 text-xl font-semibold">Розклад дзвінків</h2>
            <table className="w-full text-[15px]">
              <tbody>
                {today.bells.map((b) => (
                  <tr key={b.pair} className="border-b border-line">
                    <td className="py-2 pr-4 text-ink-3">{b.pair} пара</td>
                    <td className="py-2 text-right font-medium tabular-nums">
                      {b.start} – {b.end}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold">Корисно знати</h2>
            <ul className="space-y-3 text-[15px] text-ink-2">
              <li>
                <b className="text-ink">Чисельник і знаменник</b> — розклад сам показує заняття поточного тижня. Інший тиждень
                можна переглянути перемикачем над розкладом.
              </li>
              <li>
                <b className="text-ink">Моя група.</b> На сторінці групи натисніть «Зробити моєю групою» — і тут зʼявлятимуться
                сьогоднішні пари.
              </li>
              <li>
                <b className="text-ink">Календар у телефоні.</b> Кнопка «У календар» завантажує розклад групи для Google чи Apple
                Календаря.
              </li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter source={today.settings.source} />
    </>
  );
}

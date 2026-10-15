import Link from "next/link";
import { ArrowUpRight, Bell, CalendarRange, UsersRound } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Search from "@/components/Search";
import TodayBadge from "@/components/TodayBadge";
import { MyGroupCard } from "@/components/MyGroup";
import { getGroupsByCourse, getSearchIndex, getToday } from "@/lib/queries";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [today, index, byCourse, stats] = await Promise.all([
    getToday(),
    getSearchIndex(),
    getGroupsByCourse(),
    Promise.all([prisma.group.count(), prisma.teacher.count(), prisma.lesson.count(), prisma.room.count()]),
  ]);
  const [groupCount, teacherCount, lessonCount, roomCount] = stats;

  return (
    <>
      <SiteHeader search={false} />
      <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <section className="grid-paper relative -mx-4 px-4 pb-10 pt-10 sm:-mx-6 sm:px-6 sm:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink-2">
              {today.settings.semesterLabel}
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Розклад занять <span className="text-brand">без фото роздруківок</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-ink-2 sm:text-lg">
              Знайдіть свою групу чи викладача за секунду. Працює з телефона, показує поточну пару та чисельник/знаменник.
            </p>
            <div className="mt-8">
              <Search index={index} />
            </div>
            <div className="mt-5 flex justify-center">
              <TodayBadge bells={today.bells} parity={today.parity} />
            </div>
          </div>
        </section>

        <div className="mt-4 space-y-10">
          <MyGroupCard bells={today.bells} parity={today.parity} />

          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl font-bold">Групи</h2>
              <Link href="/groups" className="text-sm font-semibold text-brand hover:underline">
                Усі групи за спеціальностями
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...byCourse.entries()].map(([course, groups]) => (
                <div key={course} className="rounded-3xl border border-line bg-surface p-5 shadow-card">
                  <div className="mb-4 flex items-baseline justify-between">
                    <h3 className="font-display text-lg font-bold">{course} курс</h3>
                    <span className="text-xs font-semibold text-ink-3">{groups.length} груп</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {groups.map((g) => (
                      <Link
                        key={g.id}
                        href={`/group/${encodeURIComponent(g.name)}`}
                        className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-sm font-bold tabular-nums transition hover:-translate-y-px hover:border-brand hover:bg-brand hover:text-brand-ink"
                      >
                        {g.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-card">
              <div className="mb-4 flex items-center gap-2">
                <Bell className="size-5 text-brand" />
                <h2 className="font-display text-lg font-bold">Розклад дзвінків</h2>
              </div>
              <ol className="space-y-1.5">
                {today.bells.map((b) => (
                  <li key={b.pair} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm">
                    <span className="font-bold">{b.pair} пара</span>
                    <span className="font-semibold tabular-nums text-ink-2">
                      {b.start} – {b.end}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col justify-between rounded-3xl bg-brand p-6 text-brand-ink shadow-card lg:col-span-2">
              <div>
                <h2 className="font-display text-2xl font-bold">Розклад, з яким зручно</h2>
                <p className="mt-2 max-w-lg opacity-85">
                  Позначте свою групу зірочкою — і на головній завжди будуть сьогоднішні пари. Додайте розклад у Google
                  Календар одним натиском.
                </p>
              </div>
              <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  [groupCount, "груп", UsersRound],
                  [teacherCount, "викладачів", UsersRound],
                  [lessonCount, "занять на тиждень", CalendarRange],
                  [roomCount, "аудиторій", ArrowUpRight],
                ].map(([n, label]) => (
                  <div key={label as string}>
                    <dt className="font-display text-3xl font-bold">{n as number}</dt>
                    <dd className="text-sm opacity-80">{label as string}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter source={today.settings.source} />
    </>
  );
}

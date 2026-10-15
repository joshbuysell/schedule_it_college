import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Викладачі" };
export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const teachers = await prisma.teacher.findMany({
    orderBy: { shortName: "asc" },
    include: { _count: { select: { lessons: true } } },
  });
  const sorted = teachers.sort((a, b) => a.shortName.localeCompare(b.shortName, "uk"));
  const byLetter = new Map<string, typeof teachers>();
  for (const t of sorted) {
    const letter = t.shortName[0].toUpperCase();
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), t]);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Викладачі</h1>
        <p className="mt-2 text-ink-2">{teachers.length} викладачів · натисніть, щоб побачити тижневий розклад</p>

        <nav className="sticky top-16 z-30 -mx-4 mt-6 flex gap-1 overflow-x-auto bg-bg/90 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
          {[...byLetter.keys()].map((l) => (
            <a key={l} href={`#l-${l}`} className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-sm font-bold hover:border-brand hover:text-brand">
              {l}
            </a>
          ))}
        </nav>

        <div className="mt-4 space-y-8">
          {[...byLetter.entries()].map(([letter, list]) => (
            <section key={letter} id={`l-${letter}`} className="scroll-mt-32">
              <h2 className="mb-3 font-display text-2xl font-bold text-ink-3">{letter}</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((t) => (
                  <Link
                    key={t.id}
                    href={`/teacher/${t.id}`}
                    className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card transition hover:border-brand"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft font-display text-sm font-bold text-brand">
                      {t.shortName.split(" ")[0][0]}
                      {t.shortName.split(" ")[1]?.[0]}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold group-hover:text-brand">{t.fullName ?? t.shortName}</span>
                      <span className="block truncate text-xs text-ink-3">
                        {t._count.lessons} занять{t.commission ? ` · ${t.commission}` : ""}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

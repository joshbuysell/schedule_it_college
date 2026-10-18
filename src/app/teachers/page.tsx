import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";
import { byName } from "@/lib/schedule";

export const metadata: Metadata = { title: "Викладачі" };
export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const teachers = await prisma.teacher.findMany({ include: { _count: { select: { lessons: true } } } });
  teachers.sort((a, b) => byName(a.shortName, b.shortName));

  const byLetter = new Map<string, typeof teachers>();
  for (const t of teachers) {
    const letter = t.shortName[0].toUpperCase();
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), t]);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Викладачі</h1>
        <p className="mt-1 text-ink-2">{teachers.length} викладачів</p>

        <nav className="sticky top-12 z-30 -mx-4 mt-5 flex flex-wrap gap-x-1 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
          {[...byLetter.keys()].map((l) => (
            <a key={l} href={`#l-${l}`} className="rounded px-2 py-1 font-medium text-brand hover:bg-brand hover:text-white">
              {l}
            </a>
          ))}
        </nav>

        <div className="mt-6 columns-1 gap-10 sm:columns-2 lg:columns-3">
          {[...byLetter.entries()].map(([letter, list]) => (
            <section key={letter} id={`l-${letter}`} className="mb-6 scroll-mt-28 break-inside-avoid">
              <h2 className="mb-1 border-b border-line pb-1 text-lg font-semibold text-brand">{letter}</h2>
              <ul>
                {list.map((t) => (
                  <li key={t.id}>
                    <Link href={`/teacher/${t.id}`} className="group flex items-baseline justify-between gap-3 py-1 hover:text-brand">
                      <span className="group-hover:underline">{t.fullName ?? t.shortName}</span>
                      <span className="shrink-0 text-sm text-ink-3 tabular-nums">{t._count.lessons}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/db";
import { byName } from "@/lib/schedule";

export const metadata: Metadata = { title: "Групи" };
export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const groups = await prisma.group.findMany({ orderBy: [{ specialty: "asc" }, { course: "asc" }, { name: "asc" }] });
  groups.sort((a, b) => byName(a.specialty, b.specialty) || a.course - b.course || byName(a.name, b.name));
  const bySpecialty = new Map<string, typeof groups>();
  for (const g of groups) bySpecialty.set(g.specialty, [...(bySpecialty.get(g.specialty) ?? []), g]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Групи</h1>
        <p className="mt-2 text-ink-2">{groups.length} груп за спеціальностями та курсами</p>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {[...bySpecialty.entries()].map(([spec, list]) => (
            <section key={spec} className="rounded-3xl border border-line bg-surface p-6 shadow-card">
              <h2 className="font-display text-lg font-bold">{spec}</h2>
              <div className="mt-4 space-y-3">
                {[1, 2, 3, 4].map((course) => {
                  const items = list.filter((g) => g.course === course);
                  if (!items.length) return null;
                  return (
                    <div key={course} className="flex items-start gap-3">
                      <span className="mt-1.5 w-16 shrink-0 text-xs font-bold uppercase tracking-wide text-ink-3">{course} курс</span>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((g) => (
                          <Link
                            key={g.id}
                            href={`/group/${encodeURIComponent(g.name)}`}
                            className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-sm font-bold hover:border-brand hover:bg-brand hover:text-brand-ink"
                          >
                            {g.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { activeSemesterId, getSettings, lessonsWhere } from "@/lib/queries";
import { computeWorkload } from "@/lib/workload";
import ImportPanel from "./ImportPanel";

export const metadata: Metadata = { title: "Звіти та Excel" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [lessons, settings, semesters, active] = await Promise.all([
    lessonsWhere({}),
    getSettings(),
    prisma.semester.findMany({ orderBy: { id: "desc" } }),
    activeSemesterId(),
  ]);
  const rows = computeWorkload(lessons);
  const total = rows.reduce((s, r) => s + r.pairs, 0);
  const btn = "inline-flex items-center rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium hover:border-brand hover:text-brand";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-semibold">Звіти та Excel</h1>
      <p className="mt-1 text-ink-2">{settings.semesterLabel}</p>

      <section className="mt-6 flex flex-wrap gap-2">
        <a href="/api/admin/export/schedule" className={btn}>
          Розклад у Excel
        </a>
        <a href="/api/admin/export/workload" className={btn}>
          Навантаження у Excel
        </a>
        <Link href="/admin/print" className={btn}>
          Друк в офіційному форматі
        </Link>
      </section>

      <ImportPanel semesters={semesters.map((s) => ({ id: s.id, title: s.title, active: s.id === active }))} />

      <section className="mt-10">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">Навантаження викладачів</h2>
          <span className="text-sm text-ink-3">
            {rows.length} викладачів · {total} пар ({total * 2} год) на тиждень · чисельник/знаменник рахуються як 0,5
          </span>
        </div>
        <div className="overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-ink-3">
              <tr>
                <th className="px-3 py-2 font-medium">Викладач</th>
                <th className="px-3 py-2 text-right font-medium">Пар/тиж</th>
                <th className="px-3 py-2 text-right font-medium">Год/тиж</th>
                <th className="px-3 py-2 font-medium">Групи</th>
                <th className="px-3 py-2 font-medium">Дисципліни</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.teacherId} className="align-top">
                  <td className="px-3 py-2">
                    <Link href={`/teacher/${r.teacherId}`} target="_blank" className="hover:text-brand hover:underline">
                      {r.teacher}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.pairs}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{r.hours}</td>
                  <td className="px-3 py-2 text-ink-2">{r.groups.join(", ")}</td>
                  <td className="px-3 py-2 text-ink-2">{r.subjects.map((s) => `${s.subject} (${s.pairs})`).join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

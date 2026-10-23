import type { Metadata } from "next";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Історія змін" };
export const dynamic = "force-dynamic";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const rows = await prisma.auditLog.findMany({
    where: q ? { OR: [{ summary: { contains: q, mode: "insensitive" } }, { userName: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { at: "desc" },
    take: 300,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-semibold">Історія змін</h1>
      <p className="mt-1 text-ink-2">Хто й коли змінював розклад, заміни, довідники та налаштування.</p>
      <form className="mt-5">
        <input name="q" defaultValue={q} placeholder="Пошук: група, викладач, користувач" className="h-10 w-full max-w-md rounded-md border border-line bg-surface px-3 outline-none focus:border-brand" />
      </form>
      {rows.length === 0 ? (
        <p className="mt-6 text-ink-3">Записів немає.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-ink-3">
              <tr>
                <th className="w-40 px-3 py-2 font-medium">Коли</th>
                <th className="w-44 px-3 py-2 font-medium">Хто</th>
                <th className="px-3 py-2 font-medium">Що</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-3 py-2 tabular-nums text-ink-3">
                    {r.at.toLocaleString("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Kyiv" })}
                  </td>
                  <td className="px-3 py-2">{r.userName}</td>
                  <td className="px-3 py-2">{r.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

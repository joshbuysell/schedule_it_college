import Link from "next/link";
import { describeLesson, type ChangeDTO } from "@/lib/changes";
import { formatDate } from "@/lib/schedule";

export default function ChangesToday({ changes, today }: { changes: ChangeDTO[]; today: string }) {
  if (!changes.length) return null;
  const dates = [...new Set(changes.map((c) => c.date))];

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-xl font-semibold">Зміни в розкладі</h2>
      <div className="space-y-4">
        {dates.map((d) => (
          <div key={d}>
            <p className="mb-1 text-sm text-ink-3">
              {d === today ? "Сьогодні" : "Наступний робочий день"}, {formatDate(d, { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <table className="w-full text-[15px]">
              <tbody>
                {changes
                  .filter((c) => c.date === d)
                  .map((c) => (
                    <tr key={c.id} className="border-b border-line align-top">
                      <td className="w-24 py-2 pr-3">
                        <Link href={`/group/${encodeURIComponent(c.group)}`} className="font-medium text-brand hover:underline">
                          {c.group}
                        </Link>
                      </td>
                      <td className="w-20 py-2 pr-3 tabular-nums text-ink-2">{c.pair} пара</td>
                      <td className="py-2">
                        {c.cancelled ? (
                          <span>
                            <span className="text-danger">Скасовано:</span> {c.replaces.map((r) => r.subject).join(", ") || "пара"}
                          </span>
                        ) : (
                          <span>
                            <span className="text-accent">{c.replaces.length ? "Заміна:" : "Додатково:"}</span> {describeLesson(c)}
                            {c.replaces.length > 0 && <span className="text-ink-3"> (замість: {c.replaces.map(describeLesson).join("; ")})</span>}
                          </span>
                        )}
                        {c.subgroup > 0 && <span className="text-ink-3"> · {c.subgroup} підгрупа</span>}
                        {c.note && <span className="block text-sm text-ink-3">{c.note}</span>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}

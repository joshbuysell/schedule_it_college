import Link from "next/link";
import { byName } from "@/lib/schedule";

type G = { id: number; name: string; course: number; specialty: string };

export default function GroupMatrix({ groups }: { groups: G[] }) {
  const specialties = [...new Set(groups.map((g) => g.specialty))].sort(byName);
  const courses = [1, 2, 3, 4];
  const cell = (spec: string, course: number) =>
    groups.filter((g) => g.specialty === spec && g.course === course).sort((a, b) => byName(a.name, b.name));

  const link = (g: G) => (
    <Link
      key={g.id}
      href={`/group/${encodeURIComponent(g.name)}`}
      className="inline-block rounded px-1.5 py-0.5 font-medium text-brand tabular-nums hover:bg-brand hover:text-white"
    >
      {g.name}
    </Link>
  );

  return (
    <>
      <table className="hidden w-full table-fixed border-collapse text-[15px] md:table">
        <thead>
          <tr className="border-b-2 border-brand text-left text-sm text-ink-3">
            <th className="w-[32%] py-2 pr-4 font-medium">Спеціальність</th>
            {courses.map((c) => (
              <th key={c} className="px-3 py-2 font-medium">
                {c} курс
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specialties.map((spec) => (
            <tr key={spec} className="border-b border-line align-top">
              <td className="py-3 pr-4 font-medium text-ink">{spec}</td>
              {courses.map((c) => (
                <td key={c} className="px-2 py-2.5">
                  <div className="-mx-0.5 flex flex-wrap gap-x-1 gap-y-0.5">{cell(spec, c).map(link)}</div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="divide-y divide-line border-y border-line md:hidden">
        {specialties.map((spec) => (
          <div key={spec} className="py-3">
            <p className="mb-1.5 font-medium">{spec}</p>
            {courses.map((c) => {
              const items = cell(spec, c);
              if (!items.length) return null;
              return (
                <div key={c} className="flex items-baseline gap-2">
                  <span className="w-14 shrink-0 text-sm text-ink-3">{c} курс</span>
                  <div className="flex flex-wrap gap-x-1">{items.map(link)}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

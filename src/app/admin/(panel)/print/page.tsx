import Link from "next/link";
import type { Metadata } from "next";
import clsx from "clsx";
import { prisma } from "@/lib/db";
import { activeSemesterId, getBells, getSettings, lessonsWhere } from "@/lib/queries";
import { DAYS, byName, type LessonDTO } from "@/lib/schedule";
import PrintButton from "@/components/PrintButton";

export const metadata: Metadata = { title: "Друк розкладу" };
export const dynamic = "force-dynamic";

const DAY_UPPER = DAYS.map((d) => d.toUpperCase());

function Cell({ items }: { items: LessonDTO[] }) {
  if (!items.length) return <td className="pc-subj" />;
  const num = items.filter((l) => l.week === "num");
  const den = items.filter((l) => l.week === "den");
  const all = items.filter((l) => l.week === "all");

  if (!all.length && (num.length || den.length)) {
    return (
      <td className="pc-subj pc-split">
        <div className="pc-top">{num.map(line)}</div>
        <div className="pc-bottom">{den.map(line)}</div>
      </td>
    );
  }
  const teachers = all.map((l) => l.teacher).filter(Boolean);
  return (
    <td className="pc-subj">
      <b>{all[0].subject}</b>
      <span className="pc-teacher">{[...new Set(teachers)].join("-")}</span>
    </td>
  );
}

function line(l: LessonDTO) {
  return (
    <span key={l.id} className="block">
      <b>{l.subject}</b> {l.teacher}
    </span>
  );
}

function rooms(items: LessonDTO[]) {
  return [...new Set(items.map((l) => l.room).filter(Boolean))].map((r) => (
    <span key={r} className="block">
      {r}
    </span>
  ));
}

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ course?: string; per?: string }> }) {
  const { course, per } = await searchParams;
  const perPage = Math.min(5, Math.max(2, Number(per) || 4));
  const [groups, lessons, bells, settings, practices] = await Promise.all([
    prisma.group.findMany({ where: course ? { course: Number(course) } : {} }),
    lessonsWhere({}),
    getBells(),
    getSettings(),
    prisma.practice.findMany({ where: { semesterId: await activeSemesterId() } }),
  ]);
  groups.sort((a, b) => a.course - b.course || byName(a.name, b.name));
  const pages: (typeof groups)[] = [];
  for (let i = 0; i < groups.length; i += perPage) pages.push(groups.slice(i, i + perPage));

  const courses = [1, 2, 3, 4];
  const link = (c?: number) => `/admin/print?${new URLSearchParams({ ...(c && { course: String(c) }), per: String(perPage) })}`;

  return (
    <div className="print-root">
      <div className="no-print mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center gap-2 rounded-md border border-line bg-surface p-3 text-sm">
        <span className="text-ink-2">Курс:</span>
        <Link href={link()} className={clsx("rounded px-2 py-1", !course ? "bg-brand text-white" : "hover:bg-surface-2")}>
          усі
        </Link>
        {courses.map((c) => (
          <Link key={c} href={link(c)} className={clsx("rounded px-2 py-1", Number(course) === c ? "bg-brand text-white" : "hover:bg-surface-2")}>
            {c}
          </Link>
        ))}
        <span className="ml-4 text-ink-2">Груп на аркуш:</span>
        {[3, 4, 5].map((n) => (
          <Link
            key={n}
            href={`/admin/print?${new URLSearchParams({ ...(course && { course }), per: String(n) })}`}
            className={clsx("rounded px-2 py-1", perPage === n ? "bg-brand text-white" : "hover:bg-surface-2")}
          >
            {n}
          </Link>
        ))}
        <span className="ml-auto text-ink-3">{pages.length} арк.</span>
        <PrintButton />
      </div>

      {pages.map((page, pi) => {
        const ids = new Set(page.map((g) => g.id));
        const mine = lessons.filter((l) => ids.has(l.groupId));
        return (
          <section key={pi} className="print-sheet">
            <header className="pc-head">
              <div className="pc-title">
                <b>РОЗКЛАД</b>
                <br />
                навчальних занять
                <br />
                {settings.semesterLabel}
              </div>
              <div className="pc-approve">
                <b>ЗАТВЕРДЖУЮ</b>
                <br />
                {settings.approverTitle}
                <br />
                {settings.approverName}
                <br />
                «___» ____________ {new Date().getFullYear()} р.
              </div>
            </header>
            <table className="pc-table">
              <colgroup>
                <col style={{ width: "6mm" }} />
                <col style={{ width: "12mm" }} />
                {page.map((g) => [<col key={`${g.id}s`} />, <col key={`${g.id}r`} style={{ width: "9mm" }} />])}
              </colgroup>
              <thead>
                <tr>
                  <th className="pc-day" />
                  <th className="pc-time" />
                  {page.map((g) => (
                    <th key={g.id} colSpan={2} className="pc-group">
                      {g.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAY_UPPER.map((dayName, di) => {
                  const day = di + 1;
                  const maxPair = Math.max(3, ...mine.filter((l) => l.day === day).map((l) => l.pair));
                  const rows = bells.filter((b) => b.pair <= maxPair);
                  return rows.map((b, ri) => (
                    <tr key={`${day}-${b.pair}`} className={clsx(ri === 0 && "pc-daystart")}>
                      {ri === 0 && (
                        <td rowSpan={rows.length} className="pc-day">
                          <span>{dayName}</span>
                        </td>
                      )}
                      <td className="pc-time">
                        {b.start.replace(/^0/, "")}-{b.end}
                      </td>
                      {page.map((g) => {
                        const items = mine.filter((l) => l.groupId === g.id && l.day === day && l.pair === b.pair);
                        return [<Cell key={`${g.id}s`} items={items} />, <td key={`${g.id}r`} className="pc-room">{rooms(items)}</td>];
                      })}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
            <div className="pc-practices" style={{ gridTemplateColumns: `repeat(${page.length}, 1fr)` }}>
              {page.map((g) => (
                <div key={g.id}>
                  {practices
                    .filter((p) => p.groupId === g.id)
                    .map((p) => (
                      <div key={p.id} className="pc-practice">
                        <b>{p.title}</b>
                        <span>{p.dates}</span>
                        <span>{p.teachers}</span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalendarPlus } from "lucide-react";
import ScheduleShell from "@/components/ScheduleShell";
import { actionClass } from "@/components/ui";
import Timetable from "@/components/Timetable";
import { PinGroupButton } from "@/components/MyGroup";
import { prisma } from "@/lib/db";
import { getToday, lessonsWhere } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = decodeURIComponent((await params).name);
  return { title: `Група ${name}` };
}

export default async function GroupPage({ params }: Props) {
  const name = decodeURIComponent((await params).name);
  const group = await prisma.group.findUnique({ where: { name }, include: { practices: true } });
  if (!group) notFound();

  const [lessons, today] = await Promise.all([lessonsWhere({ groupId: group.id }), getToday()]);
  const updated = group.updatedAt.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Kyiv" });

  return (
    <ScheduleShell
      crumbs={[{ href: "/", label: "Розклад" }, { href: "/groups", label: "Групи" }]}
      title={`Група ${group.name}`}
      subtitle={
        <>
          {group.course} курс · {group.specialty}
          <span className="ml-3 text-sm text-ink-3">оновлено {updated}</span>
        </>
      }
      actions={
        <>
          <PinGroupButton group={group.name} />
          <a
            href={`/api/v1/groups/${encodeURIComponent(group.name)}/ics`}
            className={actionClass}
            title="Завантажте .ics і відкрийте в Google / Apple Календарі"
          >
            <CalendarPlus className="size-4" /> У календар
          </a>
        </>
      }
    >
      <Timetable lessons={lessons} bells={today.bells} parity={today.parity} mode="group" storageKey={group.name} />

      {group.practices.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-xl font-semibold">Практика</h2>
          <table className="w-full max-w-3xl text-[15px]">
            <tbody>
              {group.practices.map((p) => (
                <tr key={p.id} className="border-b border-line align-top">
                  <td className="w-36 py-2 pr-4 font-medium tabular-nums">{p.dates}</td>
                  <td className="py-2 pr-4">{p.title}</td>
                  <td className="py-2 text-ink-2">{p.teachers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </ScheduleShell>
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ScheduleShell from "@/components/ScheduleShell";
import CalendarMenu from "@/components/CalendarMenu";
import { actionClass } from "@/components/ui";
import { QrCode } from "lucide-react";
import Timetable from "@/components/Timetable";
import { PinGroupButton } from "@/components/MyGroup";
import NotifyButton from "@/components/NotifyButton";
import { prisma } from "@/lib/db";
import { activeSemesterId, getToday, getWeekChanges, lessonsWhere } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = decodeURIComponent((await params).name);
  return { title: `Група ${name}` };
}

export default async function GroupPage({ params }: Props) {
  const name = decodeURIComponent((await params).name);
  const group = await prisma.group.findUnique({ where: { name }, include: { practices: { where: { semesterId: await activeSemesterId() } } } });
  if (!group) notFound();

  const today = await getToday();
  const [lessons, changes] = await Promise.all([lessonsWhere({ groupId: group.id }), getWeekChanges(today.weekStart, { groupId: group.id })]);
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
          <NotifyButton target={`g:${group.id}`} group={group.name} name={`група ${group.name}`} />
          <CalendarMenu path={`/api/v1/groups/${encodeURIComponent(group.name)}/ics`} />
          <a href={`/poster?group=${encodeURIComponent(group.name)}`} target="_blank" className={actionClass}>
            <QrCode className="size-4" /> QR для аудиторії
          </a>
        </>
      }
    >
      <Timetable lessons={lessons} bells={today.bells} parity={today.parity} mode="group" storageKey={group.name} changes={changes} viewId={group.id} weekStart={today.weekStart} />

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

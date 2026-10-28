import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ScheduleShell from "@/components/ScheduleShell";
import CalendarMenu from "@/components/CalendarMenu";
import Timetable from "@/components/Timetable";
import NotifyButton from "@/components/NotifyButton";
import { prisma } from "@/lib/db";
import { getToday, getWeekChanges, lessonsWhere } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const n = Number(id);
  return Number.isInteger(n) ? prisma.teacher.findUnique({ where: { id: n } }) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await load((await params).id);
  return { title: t ? t.fullName ?? t.shortName : "Викладач" };
}

export default async function TeacherPage({ params }: Props) {
  const teacher = await load((await params).id);
  if (!teacher) notFound();

  const today = await getToday();
  const [lessons, changes] = await Promise.all([lessonsWhere({ teacherId: teacher.id }), getWeekChanges(today.weekStart)]);
  const groups = [...new Set(lessons.map((l) => l.group))].sort((a, b) => a.localeCompare(b, "uk"));
  const load_ = lessons.reduce((s, l) => s + (l.week === "all" ? 1 : 0.5), 0);

  return (
    <ScheduleShell
      crumbs={[{ href: "/", label: "Розклад" }, { href: "/teachers", label: "Викладачі" }]}
      title={teacher.fullName ?? teacher.shortName}
      subtitle={
        [teacher.degree, teacher.commission && `циклова комісія ${teacher.commission.toLowerCase()}`, `${load_} пар на тиждень`]
          .filter(Boolean)
          .join(" · ")
      }
      actions={
        <>
          <NotifyButton target={`t:${teacher.id}`} teacherId={teacher.id} name={teacher.shortName} />
          <CalendarMenu path={`/api/v1/teachers/${teacher.id}/ics`} />
        </>
      }
    >
      <Timetable lessons={lessons} bells={today.bells} parity={today.parity} mode="teacher" changes={changes} viewId={teacher.id} weekStart={today.weekStart} />
      {groups.length > 0 && (
        <p className="mt-6 text-sm text-ink-3">
          Групи: <span className="font-semibold text-ink-2">{groups.join(", ")}</span>
        </p>
      )}
    </ScheduleShell>
  );
}

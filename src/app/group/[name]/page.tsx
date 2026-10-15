import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalendarPlus, Hammer } from "lucide-react";
import ScheduleShell from "@/components/ScheduleShell";
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
  const teachers = new Set(lessons.map((l) => l.teacherId).filter(Boolean)).size;
  const subjects = new Set(lessons.map((l) => l.subjectId)).size;

  return (
    <ScheduleShell
      eyebrow={`${group.course} курс`}
      title={group.name}
      subtitle={group.specialty}
      stats={[
        { label: "дисциплін", value: subjects },
        { label: "викладачів", value: teachers },
        { label: "занять у розкладі", value: lessons.length },
      ]}
      actions={
        <>
          <PinGroupButton group={group.name} />
          <a
            href={`/api/v1/groups/${encodeURIComponent(group.name)}/ics`}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold hover:border-ink-3"
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
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold">
            <Hammer className="size-5 text-accent" /> Практики
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.practices.map((p) => (
              <div key={p.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                <p className="font-display text-lg font-bold tabular-nums">{p.dates}</p>
                <p className="font-semibold">{p.title}</p>
                <p className="mt-1 text-sm text-ink-3">{p.teachers}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </ScheduleShell>
  );
}

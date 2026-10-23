import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getBells, getChanges, getSettings, getToday, lessonsWhere } from "@/lib/queries";
import { addDays } from "@/lib/schedule";
import Cabinet from "./Cabinet";

export const metadata: Metadata = { title: "Кабінет викладача" };
export const dynamic = "force-dynamic";

export default async function CabinetPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login?next=/cabinet");
  const teacher = session.teacherId ? await prisma.teacher.findUnique({ where: { id: session.teacherId } }) : null;
  if (!teacher) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Обліковий запис не повʼязаний з викладачем</h1>
        <p className="mt-2 text-ink-2">Зверніться до навчальної частини, щоб привʼязати ваш акаунт до прізвища в розкладі.</p>
      </main>
    );
  }

  const today = await getToday();
  const [lessons, changes, own, bells, settings, rooms] = await Promise.all([
    lessonsWhere({ teacherId: teacher.id }),
    getChanges({ status: "approved", date: { gte: today.weekStart, lte: addDays(today.weekStart, 13) } }),
    getChanges({ authorId: session.uid, date: { gte: addDays(today.ymd, -14) } }),
    getBells(),
    getSettings(),
    prisma.room.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <Cabinet
      teacher={{ id: teacher.id, name: teacher.fullName ?? teacher.shortName, short: teacher.shortName }}
      lessons={lessons}
      changes={changes}
      own={own}
      bells={bells}
      anchor={settings.numeratorAnchor}
      today={today.ymd}
      weekStart={today.weekStart}
      rooms={rooms.map((r) => r.name)}
    />
  );
}

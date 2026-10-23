import { prisma } from "@/lib/db";
import { getChanges, getToday, lessonsWhere } from "@/lib/queries";
import { buildCalendar, calendarResponse } from "@/lib/ics";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const teacher = Number.isInteger(id) ? await prisma.teacher.findUnique({ where: { id } }) : null;
  if (!teacher) return new Response("Викладача не знайдено", { status: 404 });

  const today = await getToday();
  const [lessons, all] = await Promise.all([lessonsWhere({ teacherId: id }), getChanges({ status: "approved" })]);
  const changes = all.filter((c) => c.teacherId === id || c.replaces.some((r) => r.teacherId === id));
  const body = buildCalendar({
    title: `Розклад: ${teacher.shortName}`,
    lessons,
    changes,
    inView: (l) => l.teacherId === id,
    showGroup: true,
    bells: today.bells,
    anchor: today.settings.numeratorAnchor,
    semesterEnd: today.settings.semesterEnd,
  });
  return calendarResponse(body, `schedule-${teacher.shortName}.ics`, new URL(req.url).searchParams.has("download"));
}

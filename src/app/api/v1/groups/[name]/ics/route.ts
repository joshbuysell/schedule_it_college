import { prisma } from "@/lib/db";
import { getChanges, getToday, lessonsWhere } from "@/lib/queries";
import { buildCalendar, calendarResponse } from "@/lib/ics";
import { hit } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name);
  const group = await prisma.group.findUnique({ where: { name } });
  if (!group) return new Response("Групу не знайдено", { status: 404 });

  const today = await getToday();
  const [lessons, changes] = await Promise.all([
    lessonsWhere({ groupId: group.id }),
    getChanges({ status: "approved", groupId: group.id }),
  ]);
  const body = buildCalendar({
    title: `Розклад ${group.name}`,
    lessons,
    changes,
    inView: (l) => l.groupId === group.id,
    showGroup: false,
    bells: today.bells,
    anchor: today.settings.numeratorAnchor,
    semesterEnd: today.settings.semesterEnd,
  });
  await hit(`ics:g:${group.name}`);
  return calendarResponse(body, `schedule-${group.name}.ics`, new URL(req.url).searchParams.has("download"));
}

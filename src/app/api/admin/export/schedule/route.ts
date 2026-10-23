import { prisma } from "@/lib/db";
import { activeSemesterId, getBells, lessonsWhere } from "@/lib/queries";
import { scheduleWorkbook } from "@/lib/excel";
import { xlsx } from "../xlsx";

export async function GET(req: Request) {
  const semesterId = Number(new URL(req.url).searchParams.get("semester")) || (await activeSemesterId());
  const [semester, lessons, groups, bells] = await Promise.all([
    prisma.semester.findUnique({ where: { id: semesterId } }),
    lessonsWhere({ semesterId }),
    prisma.group.findMany({ select: { name: true, course: true } }),
    getBells(),
  ]);
  const title = semester?.title ?? "Розклад";
  return xlsx(await scheduleWorkbook(lessons, groups, bells, title), `Розклад ${title}.xlsx`);
}

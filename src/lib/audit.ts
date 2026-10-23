import "server-only";
import { prisma } from "./db";
import { getSession } from "./admin";
import { DAYS, type LessonDTO } from "./schedule";

export async function audit(action: string, summary: string) {
  const session = await getSession();
  await prisma.auditLog
    .create({ data: { userId: session?.uid ?? null, userName: session?.name ?? "система", action, summary } })
    .catch(() => {});
}

export function lessonLabel(l: Pick<LessonDTO, "group" | "day" | "pair" | "subject" | "teacher" | "room">) {
  return `${l.group}, ${DAYS[l.day - 1]?.toLowerCase()} ${l.pair} пара: ${[l.subject, l.teacher, l.room && `ауд. ${l.room}`].filter(Boolean).join(", ")}`;
}

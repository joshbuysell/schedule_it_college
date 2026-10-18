import { PrismaClient } from "@prisma/client";
import { findConflicts } from "../src/lib/conflicts";
import { DAYS, type Week } from "../src/lib/schedule";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.lesson.findMany({ include: { subject: true, teacher: true, room: true, group: true } });
  const lessons = rows.map((l) => ({
    id: l.id, day: l.day, pair: l.pair, week: l.week as Week, subgroup: l.subgroup,
    subject: l.subject.name, subjectId: l.subjectId, teacher: l.teacher?.shortName ?? null, teacherId: l.teacherId,
    room: l.room?.name ?? null, roomId: l.roomId, group: l.group.name, groupId: l.groupId,
  }));
  const shared = new Set((await prisma.room.findMany({ where: { shared: true } })).map((r) => r.id));
  const conflicts = findConflicts(lessons, shared);
  for (const c of conflicts) {
    console.log(`${DAYS[c.day - 1]}, ${c.pair} пара — ${c.label} (${c.kind})`);
    for (const l of c.lessons) console.log(`   ${l.group}: ${l.subject} · ${l.teacher ?? "—"} · ауд. ${l.room ?? "—"}${l.week !== "all" ? ` · ${l.week}` : ""}`);
  }
  console.log(`\nНакладок: ${conflicts.length}`);
}

main().finally(() => prisma.$disconnect());

import "server-only";
import { prisma } from "./db";
import type { ChangeDTO } from "./changes";
import { notifyChanges as telegram } from "./telegram";
import { notifyChangesPush, notifyRequestPush } from "./push";
import { formatDate } from "./schedule";

export async function notifyChanges(changes: ChangeDTO[]) {
  await Promise.all([
    telegram(changes).catch((e) => console.error("telegram notify", e)),
    notifyChangesPush(changes).catch((e) => console.error("push notify", e)),
  ]);
}

export async function notifyRequestDecision(changeId: number, approved: boolean) {
  const c = await prisma.change.findUnique({ where: { id: changeId }, include: { group: true, author: true } });
  const teacherId = c?.author?.teacherId;
  if (!c || !teacherId) return;
  const when = formatDate(c.date, { weekday: "short", day: "numeric", month: "long" });
  await notifyRequestPush(teacherId, `${approved ? "Підтверджено" : "Відхилено"}: ${when}, ${c.pair} пара, ${c.group.name}`).catch((e) =>
    console.error("push notify", e),
  );
}

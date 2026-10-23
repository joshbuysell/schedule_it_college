import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSearchIndex, getToday, getWeekChanges, lessonsWhere } from "@/lib/queries";
import { decodeSelection } from "@/lib/selection";
import type { LessonDTO } from "@/lib/schedule";
import EmbedApp from "./EmbedApp";

export const metadata: Metadata = { title: "Розклад занять", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EmbedPage({ searchParams }: { searchParams: Promise<{ select?: string }> }) {
  const { select } = await searchParams;
  const initial = decodeSelection(select);
  const [index, today] = await Promise.all([getSearchIndex(), getToday()]);

  let initialLessons: LessonDTO[] | null = null;
  let viewId: number | null = null;
  if (initial?.kind === "group") {
    const g = await prisma.group.findUnique({ where: { name: initial.key } });
    if (g) {
      initialLessons = await lessonsWhere({ groupId: g.id });
      viewId = g.id;
    }
  } else if (initial?.kind === "teacher" && /^\d+$/.test(initial.key)) {
    initialLessons = await lessonsWhere({ teacherId: +initial.key });
    viewId = +initial.key;
  } else if (initial?.kind === "room") {
    const r = await prisma.room.findUnique({ where: { name: initial.key } });
    if (r) {
      initialLessons = await lessonsWhere({ roomId: r.id });
      viewId = r.id;
    }
  }

  return (
    <div className="theme-college">
      <EmbedApp
        index={index}
        bells={today.bells}
        parity={today.parity}
        semesterLabel={today.settings.semesterLabel}
        initial={initialLessons ? initial : null}
        initialLessons={initialLessons}
        initialView={{ changes: initialLessons ? await getWeekChanges(today.weekStart) : [], viewId, weekStart: today.weekStart }}
      />
    </div>
  );
}

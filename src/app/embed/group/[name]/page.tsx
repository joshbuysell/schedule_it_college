import { notFound } from "next/navigation";
import Timetable from "@/components/Timetable";
import { prisma } from "@/lib/db";
import { getToday, lessonsWhere } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EmbedGroup({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name);
  const group = await prisma.group.findUnique({ where: { name } });
  if (!group) notFound();
  const [lessons, today] = await Promise.all([lessonsWhere({ groupId: group.id }), getToday()]);

  return (
    <main className="p-3">
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Розклад {group.name}</h1>
        <a href={`/group/${encodeURIComponent(group.name)}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand hover:underline">
          Відкрити повністю ↗
        </a>
      </div>
      <Timetable lessons={lessons} bells={today.bells} parity={today.parity} mode="group" storageKey={group.name} />
    </main>
  );
}

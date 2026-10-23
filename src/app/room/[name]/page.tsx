import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ScheduleShell from "@/components/ScheduleShell";
import Timetable from "@/components/Timetable";
import { prisma } from "@/lib/db";
import { getToday, getWeekChanges, lessonsWhere } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ name: string }> };

const roomTitle = (name: string) => (name === "кфв" ? "Спорткомплекс" : `Аудиторія ${name}`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: roomTitle(decodeURIComponent((await params).name)) };
}

export default async function RoomPage({ params }: Props) {
  const name = decodeURIComponent((await params).name);
  const room = await prisma.room.findUnique({ where: { name } });
  if (!room) notFound();

  const today = await getToday();
  const [lessons, changes] = await Promise.all([lessonsWhere({ roomId: room.id }), getWeekChanges(today.weekStart)]);
  const busy = new Set(lessons.map((l) => `${l.day}.${l.pair}`)).size;
  const total = 5 * today.bells.filter((b) => b.pair <= 5).length;

  return (
    <ScheduleShell
      crumbs={[{ href: "/", label: "Розклад" }]}
      title={roomTitle(room.name)}
      subtitle={`Зайнята ${busy} з ${total} пар на тиждень (${Math.round((busy / total) * 100)}%)`}
    >
      <Timetable lessons={lessons} bells={today.bells} parity={today.parity} mode="room" changes={changes} viewId={room.id} weekStart={today.weekStart} />
    </ScheduleShell>
  );
}

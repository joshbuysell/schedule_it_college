import { NextResponse } from "next/server";
import { bad, getSession } from "@/lib/admin";
import { teacherRequest } from "@/lib/changeInput";
import { saveChange, teacherLessonsOn } from "@/lib/changeOps";
import { getChanges, getToday } from "@/lib/queries";
import { addDays } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const today = await getToday();
  const changes = await getChanges({ authorId: session!.uid, date: { gte: addDays(today.ymd, -14) } });
  return NextResponse.json({ changes });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.teacherId) return bad("Обліковий запис не повʼязаний з викладачем", 403);
  const parsed = teacherRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  const r = parsed.data;
  if (r.date < (await getToday()).ymd) return bad("Ця дата вже минула");

  const lessons = await teacherLessonsOn(session.teacherId, r.date);
  const lesson = lessons.find((l) => l.groupId === r.groupId && l.pair === r.pair && l.subgroup === r.subgroup);
  if (!lesson) return bad("У цей час у вас немає пари з цією групою", 404);
  if (r.kind === "room" && !r.room) return bad("Вкажіть нову аудиторію");

  const change = await saveChange(
    {
      date: r.date,
      groupId: r.groupId,
      pair: r.pair,
      subgroup: r.subgroup,
      cancelled: r.kind !== "room",
      subject: r.kind === "room" ? lesson.subject : null,
      teacher: r.kind === "room" ? lesson.teacher : null,
      room: r.kind === "room" ? r.room : null,
      note: [r.kind === "substitute" ? "Потрібна заміна" : null, r.note].filter(Boolean).join(". ") || null,
    },
    { authorId: session.uid, status: "pending" },
  );
  return NextResponse.json({ change }, { status: 201 });
}

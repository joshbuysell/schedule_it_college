import { NextResponse } from "next/server";
import { bad, getSession } from "@/lib/admin";
import { absenceRequest } from "@/lib/changeInput";
import { saveChange, teacherLessonsOn } from "@/lib/changeOps";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.teacherId) return bad("Обліковий запис не повʼязаний з викладачем", 403);
  const parsed = absenceRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");

  const lessons = await teacherLessonsOn(session.teacherId, parsed.data.date);
  if (!lessons.length) return bad("Цього дня у вас немає пар");
  const note = ["Викладач відсутній, потрібна заміна", parsed.data.note].filter(Boolean).join(". ");
  const changes = [];
  for (const l of lessons) {
    changes.push(
      await saveChange(
        { date: parsed.data.date, groupId: l.groupId, pair: l.pair, subgroup: l.subgroup, cancelled: true, note },
        { authorId: session.uid, status: "pending" },
      ),
    );
  }
  return NextResponse.json({ changes }, { status: 201 });
}

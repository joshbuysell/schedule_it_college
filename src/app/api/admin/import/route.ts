import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, ensureRoom, ensureSubject, ensureTeacher } from "@/lib/admin";
import { parseImport } from "@/lib/excel";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const semesterId = Number(form?.get("semesterId"));
  const apply = form?.get("apply") === "1";
  if (!(file instanceof File)) return bad("Додайте файл .xlsx");
  if (file.size > 5_000_000) return bad("Файл завеликий (до 5 МБ)");
  const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
  if (!semester) return bad("Семестр не знайдено", 404);

  const { rows, errors } = await parseImport(await file.arrayBuffer()).catch(() => ({
    rows: [],
    errors: [{ row: 0, message: "Не вдалося прочитати файл. Збережіть його у форматі .xlsx" }],
  }));

  const groups = await prisma.group.findMany();
  const byName = new Map(groups.map((g) => [g.name.toLowerCase(), g]));
  const unknown = [...new Set(rows.filter((r) => !byName.has(r.group.toLowerCase())).map((r) => r.group))];
  const valid = rows.filter((r) => byName.has(r.group.toLowerCase()));
  const affected = [...new Set(valid.map((r) => byName.get(r.group.toLowerCase())!.name))];

  const summary = {
    total: rows.length,
    valid: valid.length,
    groups: affected,
    unknownGroups: unknown,
    errors: errors.slice(0, 50),
    errorCount: errors.length,
  };
  if (!apply) return NextResponse.json({ preview: summary });
  if (errors.length || unknown.length) return bad("Спершу виправте помилки у файлі");

  const ids = affected.map((n) => byName.get(n.toLowerCase())!.id);
  const cache = new Map<string, number | null>();
  const idOf = async (kind: "s" | "t" | "r", name: string | null) => {
    if (!name) return null;
    const key = kind + name;
    if (!cache.has(key)) cache.set(key, (kind === "s" ? await ensureSubject(name) : kind === "t" ? await ensureTeacher(name) : await ensureRoom(name))?.id ?? null);
    return cache.get(key)!;
  };
  const data = [];
  for (const r of valid) {
    data.push({
      semesterId,
      groupId: byName.get(r.group.toLowerCase())!.id,
      day: r.day,
      pair: r.pair,
      week: r.week,
      subgroup: r.subgroup,
      subjectId: (await idOf("s", r.subject))!,
      teacherId: await idOf("t", r.teacher),
      roomId: await idOf("r", r.room),
    });
  }
  await prisma.$transaction([
    prisma.lesson.deleteMany({ where: { semesterId, groupId: { in: ids } } }),
    prisma.lesson.createMany({ data }),
  ]);
  await audit("import", `Імпорт з Excel у «${semester.title}»: ${data.length} занять, групи ${affected.join(", ")}`);
  return NextResponse.json({ imported: data.length, groups: affected });
}

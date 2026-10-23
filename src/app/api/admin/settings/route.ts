import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { bad } from "@/lib/admin";
import { getActiveSemester } from "@/lib/queries";
import { audit } from "@/lib/audit";

const time = z.string().regex(/^\d{2}:\d{2}$/);
const schema = z.object({
  semesterLabel: z.string().trim().max(80).optional(),
  numeratorAnchor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  semesterEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  approverTitle: z.string().trim().max(160).optional(),
  approverName: z.string().trim().max(80).optional(),
  bells: z.array(z.object({ pair: z.number().int().min(1).max(8), start: time, end: time })).optional(),
});

export async function PATCH(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  const { bells, semesterLabel, numeratorAnchor, semesterEnd, ...settings } = parsed.data;
  const active = await getActiveSemester();
  if (active && (semesterLabel || numeratorAnchor || semesterEnd)) {
    await prisma.semester.update({
      where: { id: active.id },
      data: {
        ...(semesterLabel && { title: semesterLabel }),
        ...(numeratorAnchor && { numeratorAnchor }),
        ...(semesterEnd && { endDate: semesterEnd }),
      },
    });
  }
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  for (const b of bells ?? []) {
    await prisma.bell.upsert({ where: { pair: b.pair }, update: b, create: b });
  }
  await audit("settings.update", `Змінено налаштування: ${Object.keys(parsed.data).join(", ")}`);
  return NextResponse.json({ ok: true });
}

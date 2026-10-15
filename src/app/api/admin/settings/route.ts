import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { bad } from "@/lib/admin";

const time = z.string().regex(/^\d{2}:\d{2}$/);
const schema = z.object({
  semesterLabel: z.string().trim().max(80).optional(),
  numeratorAnchor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  semesterEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  bells: z.array(z.object({ pair: z.number().int().min(1).max(8), start: time, end: time })).optional(),
});

export async function PATCH(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  const { bells, ...settings } = parsed.data;
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  for (const b of bells ?? []) {
    await prisma.bell.upsert({ where: { pair: b.pair }, update: b, create: b });
  }
  return NextResponse.json({ ok: true });
}

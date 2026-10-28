import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = z.object({ endpoint: z.string().max(1000) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некоректні дані" }, { status: 400 });
  const subs = await prisma.pushSub.findMany({ where: { endpoint: parsed.data.endpoint }, select: { target: true, morning: true } });
  return NextResponse.json({ targets: subs });
}

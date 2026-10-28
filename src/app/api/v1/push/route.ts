import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { pushPublicKey } from "@/lib/push";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const endpoint = z.string().url().startsWith("https://").max(1000);
const subscribe = z.object({
  subscription: z.object({ endpoint, keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }) }),
  group: z.string().trim().max(40).optional(),
  teacherId: z.number().int().positive().optional(),
  morning: z.boolean().default(false),
});
const unsubscribe = z.object({ endpoint, target: z.string().max(20).optional() });

function limited(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  return !rateLimit(`push:${ip}`, 30, 60_000).ok;
}

export async function GET() {
  return NextResponse.json({ publicKey: await pushPublicKey() });
}

export async function POST(req: Request) {
  if (limited(req)) return NextResponse.json({ error: "Забагато запитів" }, { status: 429 });
  const parsed = subscribe.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некоректні дані" }, { status: 400 });
  const { subscription, group, teacherId, morning } = parsed.data;

  const g = group ? await prisma.group.findUnique({ where: { name: group } }) : null;
  const t = !g && teacherId ? await prisma.teacher.findUnique({ where: { id: teacherId } }) : null;
  if (!g && !t) return NextResponse.json({ error: "Групу чи викладача не знайдено" }, { status: 404 });

  const target = g ? `g:${g.id}` : `t:${t!.id}`;
  const data = { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, groupId: g?.id ?? null, teacherId: t?.id ?? null, morning };
  await prisma.pushSub.upsert({
    where: { endpoint_target: { endpoint: subscription.endpoint, target } },
    update: data,
    create: { endpoint: subscription.endpoint, target, ...data },
  });
  return NextResponse.json({ ok: true, target });
}

export async function DELETE(req: Request) {
  if (limited(req)) return NextResponse.json({ error: "Забагато запитів" }, { status: 429 });
  const parsed = unsubscribe.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некоректні дані" }, { status: 400 });
  const { count } = await prisma.pushSub.deleteMany({ where: { endpoint: parsed.data.endpoint, ...(parsed.data.target && { target: parsed.data.target }) } });
  return NextResponse.json({ ok: true, removed: count });
}

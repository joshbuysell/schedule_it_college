import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad, getSession } from "@/lib/admin";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const id = Number((await params).id);
  const { count } = await prisma.change.deleteMany({ where: { id, authorId: session!.uid, status: "pending" } });
  return count ? NextResponse.json({ ok: true }) : bad("Можна скасувати лише власну заявку, яку ще не розглянули", 404);
}

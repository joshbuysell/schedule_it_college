import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { bad, getSession } from "@/lib/admin";
import { changeInput } from "@/lib/changeInput";
import { approveChange, saveChange } from "@/lib/changeOps";
import { audit } from "@/lib/audit";
import { notifyRequestDecision } from "@/lib/notify";

type Ctx = { params: Promise<{ id: string }> };

const statusPatch = z.object({ status: z.enum(["approved", "rejected"]) });

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  if (!(await prisma.change.findUnique({ where: { id } }))) return bad("Зміну не знайдено", 404);
  const body = await req.json().catch(() => null);

  const st = statusPatch.safeParse(body);
  if (st.success) {
    if (st.data.status === "approved") return NextResponse.json({ change: await approveChange(id) });
    const c = await prisma.change.update({ where: { id }, data: { status: "rejected" }, include: { group: true } });
    await audit("change.reject", `Відхилено заявку на ${c.date}: ${c.group.name}, ${c.pair} пара`);
    await notifyRequestDecision(id, false);
    return NextResponse.json({ ok: true });
  }

  const parsed = changeInput.safeParse(body);
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  const session = await getSession();
  return NextResponse.json({ change: await saveChange(parsed.data, { id, authorId: session!.uid, status: "approved" }) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const ok = await prisma.change.delete({ where: { id: Number((await params).id) }, include: { group: true } }).catch(() => null);
  if (ok) await audit("change.delete", `Видалено зміну на ${ok.date}: ${ok.group.name}, ${ok.pair} пара`);
  return ok ? NextResponse.json({ ok: true }) : bad("Зміну не знайдено", 404);
}

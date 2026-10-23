import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad } from "@/lib/admin";
import { DICT, DICT_LABEL, isDictKind } from "../../fields";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ kind: string; id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { kind, id } = await params;
  if (!isDictKind(kind)) return bad("Невідомий довідник", 404);
  const parsed = DICT[kind].schema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = await (prisma[DICT[kind].model] as any).update({ where: { id: Number(id) }, data: parsed.data });
    await audit(`${kind}.update`, `${DICT_LABEL[kind]}: змінено «${Object.values(parsed.data)[0] ?? id}»`);
    return NextResponse.json({ item });
  } catch {
    return bad("Не вдалося зберегти: можливо, така назва вже є", 409);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { kind, id } = await params;
  if (!isDictKind(kind)) return bad("Невідомий довідник", 404);
  const where = { id: Number(id) };
  if (kind === "subjects") {
    const used = await prisma.lesson.count({ where: { subjectId: where.id } });
    if (used) return bad(`Дисципліна використовується в ${used} заняттях`, 409);
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma[DICT[kind].model] as any).delete({ where });
    await audit(`${kind}.delete`, `${DICT_LABEL[kind]}: видалено запис #${where.id}`);
    return NextResponse.json({ ok: true });
  } catch {
    return bad("Не вдалося видалити запис", 409);
  }
}

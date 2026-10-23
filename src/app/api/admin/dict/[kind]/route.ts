import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bad } from "@/lib/admin";
import { DICT, DICT_LABEL, isDictKind } from "../fields";
import { audit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isDictKind(kind)) return bad("Невідомий довідник", 404);
  const parsed = DICT[kind].schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = await (prisma[DICT[kind].model] as any).create({ data: parsed.data });
    await audit(`${kind}.create`, `${DICT_LABEL[kind]}: додано «${Object.values(parsed.data)[0]}»`);
    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return bad("Такий запис уже існує", 409);
  }
}

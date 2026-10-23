import { NextResponse } from "next/server";
import { bad, getSession } from "@/lib/admin";
import { changeInput } from "@/lib/changeInput";
import { saveChange } from "@/lib/changeOps";
import { getChanges } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const status = url.searchParams.get("status");
  const changes = await getChanges({
    ...(date && { date }),
    ...(status ? { status } : { status: { not: "rejected" } }),
  });
  return NextResponse.json({ changes });
}

export async function POST(req: Request) {
  const session = await getSession();
  const parsed = changeInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Некоректні дані");
  const change = await saveChange(parsed.data, { authorId: session!.uid, status: "approved" });
  return NextResponse.json({ change }, { status: 201 });
}

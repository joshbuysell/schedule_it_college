import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveSemester } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    const [semester, lessons] = await Promise.all([getActiveSemester(), prisma.lesson.count()]);
    return NextResponse.json(
      { ok: true, db: "ok", semester: semester?.title ?? null, lessons, ms: Date.now() - started },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, db: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

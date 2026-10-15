import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const groups = await prisma.group.findMany({
    orderBy: [{ course: "asc" }, { name: "asc" }],
    select: { name: true, course: true, specialty: true, updatedAt: true },
  });
  return NextResponse.json({ groups }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

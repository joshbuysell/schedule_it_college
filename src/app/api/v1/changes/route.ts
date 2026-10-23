import { NextResponse } from "next/server";
import { getChanges, getToday } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const today = await getToday();
  const date = url.searchParams.get("date");
  const from = date ?? url.searchParams.get("from") ?? today.ymd;
  const to = date ?? url.searchParams.get("to") ?? from;
  if (![from, to].every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))) {
    return NextResponse.json({ error: "Дата у форматі YYYY-MM-DD" }, { status: 400 });
  }
  const changes = await getChanges({ status: "approved", date: { gte: from, lte: to } });
  return NextResponse.json({ from, to, changes }, { headers: { "Access-Control-Allow-Origin": "*" } });
}

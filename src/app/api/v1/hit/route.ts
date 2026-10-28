import { NextResponse } from "next/server";
import { hit, normalizePath } from "@/lib/stats";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (/bot|crawl|spider|preview/i.test(req.headers.get("user-agent") ?? "") || !rateLimit(`hit:${ip}`, 60, 60_000).ok) {
    return new NextResponse(null, { status: 204 });
  }
  const path = normalizePath((await req.text()).slice(0, 200));
  if (path) await hit(path);
  return new NextResponse(null, { status: 204 });
}

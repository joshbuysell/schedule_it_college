import { NextResponse } from "next/server";
import { getDictionaries } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getDictionaries());
}

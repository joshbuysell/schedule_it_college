import { NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/queries";
import { layoutSwap, normalizeQuery, translit } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const index = await getSearchIndex();
  const variants = [...new Set([q, layoutSwap(q), translit(q)].map(normalizeQuery).filter(Boolean))];
  const hit = (s: string) => variants.some((v) => normalizeQuery(s).includes(v));
  return NextResponse.json(
    variants.length
      ? {
          groups: index.groups.filter((g) => hit(g.name)),
          teachers: index.teachers.filter((t) => hit(t.shortName) || hit(t.fullName ?? "")),
          rooms: index.rooms.filter((r) => hit(r.name)),
        }
      : index,
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}

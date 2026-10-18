import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const [groups, teachers] = await Promise.all([
    prisma.group.findMany({ select: { name: true, updatedAt: true } }),
    prisma.teacher.findMany({ select: { id: true } }),
  ]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/groups` },
    { url: `${base}/teachers` },
    ...groups.map((g) => ({ url: `${base}/group/${encodeURIComponent(g.name)}`, lastModified: g.updatedAt })),
    ...teachers.map((t) => ({ url: `${base}/teacher/${t.id}` })),
  ];
}

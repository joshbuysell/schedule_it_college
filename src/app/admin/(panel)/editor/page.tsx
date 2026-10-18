import type { Metadata } from "next";
import { getDictionaries } from "@/lib/admin";
import { getBells, lessonsWhere } from "@/lib/queries";
import { prisma } from "@/lib/db";
import Editor from "./Editor";

export const metadata: Metadata = { title: "Редактор" };
export const dynamic = "force-dynamic";

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ group?: string; slot?: string }> }) {
  const [{ group, slot }, dict, lessons, bells, practices] = await Promise.all([
    searchParams,
    getDictionaries(),
    lessonsWhere({}),
    getBells(),
    prisma.practice.findMany({ orderBy: { id: "asc" } }),
  ]);
  return (
    <Editor initialDict={dict} initialLessons={lessons} initialPractices={practices} bells={bells} initialGroup={group} initialSlot={slot} />
  );
}

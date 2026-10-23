import type { Metadata } from "next";
import { getDictionaries } from "@/lib/admin";
import { activeSemesterId, getBells, lessonsWhere } from "@/lib/queries";
import { prisma } from "@/lib/db";
import Editor from "./Editor";

export const metadata: Metadata = { title: "Редактор" };
export const dynamic = "force-dynamic";

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ group?: string; slot?: string; semester?: string }> }) {
  const sp = await searchParams;
  const [semesters, active] = await Promise.all([prisma.semester.findMany({ orderBy: { id: "desc" } }), activeSemesterId()]);
  const semesterId = semesters.find((s) => s.id === Number(sp.semester))?.id ?? active;
  const [dict, lessons, bells, practices] = await Promise.all([
    getDictionaries(),
    lessonsWhere({ semesterId }),
    getBells(),
    prisma.practice.findMany({ where: { semesterId }, orderBy: { id: "asc" } }),
  ]);
  return (
    <Editor
      key={semesterId}
      initialDict={dict}
      initialLessons={lessons}
      initialPractices={practices}
      bells={bells}
      initialGroup={sp.group}
      initialSlot={sp.slot}
      semesters={semesters.map((s) => ({ id: s.id, title: s.title, active: s.active }))}
      semesterId={semesterId}
    />
  );
}

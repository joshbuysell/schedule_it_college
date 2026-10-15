import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import Dictionaries from "./Dictionaries";

export const metadata: Metadata = { title: "Довідники" };
export const dynamic = "force-dynamic";

export default async function DictionariesPage() {
  const [teachers, subjects, rooms, groups] = await Promise.all([
    prisma.teacher.findMany({ include: { _count: { select: { lessons: true } } } }),
    prisma.subject.findMany({ include: { _count: { select: { lessons: true } } } }),
    prisma.room.findMany({ include: { _count: { select: { lessons: true } } } }),
    prisma.group.findMany({ include: { _count: { select: { lessons: true } } } }),
  ]);
  const by = <T extends Record<string, unknown>>(key: keyof T) => (a: T, b: T) =>
    String(a[key]).localeCompare(String(b[key]), "uk", { numeric: true });

  return (
    <Dictionaries
      data={{
        teachers: teachers.sort(by("shortName")),
        subjects: subjects.sort(by("name")),
        rooms: rooms.sort(by("name")),
        groups: groups.sort(by("name")),
      }}
    />
  );
}

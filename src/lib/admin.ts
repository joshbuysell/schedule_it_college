import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./db";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

export async function getSession() {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Знайти або створити запис довідника за назвою (для швидкого введення в редакторі). */
export async function ensureSubject(name: string) {
  const n = name.trim();
  return prisma.subject.upsert({ where: { name: n }, update: {}, create: { name: n } });
}
export async function ensureTeacher(shortName: string | null | undefined) {
  const n = shortName?.trim();
  if (!n) return null;
  return prisma.teacher.upsert({ where: { shortName: n }, update: {}, create: { shortName: n } });
}
export async function ensureRoom(name: string | null | undefined) {
  const n = name?.trim();
  if (!n) return null;
  return prisma.room.upsert({ where: { name: n }, update: {}, create: { name: n, shared: n === "кфв" } });
}

export async function getDictionaries() {
  const [groups, teachers, subjects, rooms] = await Promise.all([
    prisma.group.findMany({ orderBy: [{ course: "asc" }, { name: "asc" }] }),
    prisma.teacher.findMany({ orderBy: { shortName: "asc" } }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.room.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { groups, teachers, subjects, rooms };
}
export type Dictionaries = Awaited<ReturnType<typeof getDictionaries>>;

import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/admin";
import { byName } from "@/lib/schedule";
import Users from "./Users";

export const metadata: Metadata = { title: "Користувачі" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [session, users, teachers] = await Promise.all([
    getSession(),
    prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, teacherId: true } }),
    prisma.teacher.findMany({ select: { id: true, shortName: true, fullName: true } }),
  ]);
  users.sort((a, b) => a.role.localeCompare(b.role) || byName(a.name, b.name));
  teachers.sort((a, b) => byName(a.shortName, b.shortName));
  return <Users users={users} teachers={teachers} me={session!.uid} canManage={session!.role === "admin"} />;
}

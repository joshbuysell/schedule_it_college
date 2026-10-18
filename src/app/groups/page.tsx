import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import GroupMatrix from "@/components/GroupMatrix";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Групи" };
export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const groups = await prisma.group.findMany();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Групи</h1>
        <p className="mb-6 mt-1 text-ink-2">{groups.length} груп, згруповані за спеціальністю та курсом</p>
        <GroupMatrix groups={groups} />
      </main>
      <SiteFooter />
    </>
  );
}

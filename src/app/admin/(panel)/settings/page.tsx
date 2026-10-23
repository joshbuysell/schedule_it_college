import type { Metadata } from "next";
import { getBells, getSettings } from "@/lib/queries";
import { kyivNow, weekParity } from "@/lib/schedule";
import SettingsForm from "./SettingsForm";
import Semesters from "./Semesters";
import TelegramPanel from "./TelegramPanel";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Налаштування" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, bells, semesters] = await Promise.all([
    getSettings(),
    getBells(),
    prisma.semester.findMany({ orderBy: { id: "desc" }, include: { _count: { select: { lessons: true } } } }),
  ]);
  const now = kyivNow();
  return (
    <>
    <Semesters
      semesters={semesters.map((s) => ({ id: s.id, title: s.title, numeratorAnchor: s.numeratorAnchor, endDate: s.endDate, active: s.active, lessons: s._count.lessons }))}
    />
    <TelegramPanel />
    <SettingsForm
      settings={settings}
      bells={bells}
      parity={weekParity(settings.numeratorAnchor, now.ymd, now.weekday)}
      thisMonday={new Date(Date.parse(now.ymd + "T00:00:00Z") - (now.weekday - 1) * 86_400_000).toISOString().slice(0, 10)}
    />
    </>
  );
}

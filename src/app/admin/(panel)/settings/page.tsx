import type { Metadata } from "next";
import { getBells, getSettings } from "@/lib/queries";
import { kyivNow, weekParity } from "@/lib/schedule";
import SettingsForm from "./SettingsForm";

export const metadata: Metadata = { title: "Налаштування" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, bells] = await Promise.all([getSettings(), getBells()]);
  const now = kyivNow();
  return (
    <SettingsForm
      settings={settings}
      bells={bells}
      parity={weekParity(settings.numeratorAnchor, now.ymd, now.weekday)}
      thisMonday={new Date(Date.parse(now.ymd + "T00:00:00Z") - (now.weekday - 1) * 86_400_000).toISOString().slice(0, 10)}
    />
  );
}

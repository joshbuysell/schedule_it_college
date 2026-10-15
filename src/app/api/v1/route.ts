import { NextResponse } from "next/server";

/** Опис публічного API — для інтеграції з сайтом коледжу та мобільними застосунками. */
export function GET(req: Request) {
  const base = new URL(req.url).origin;
  return NextResponse.json({
    name: "Розклад ІТ коледжу Львівської політехніки — публічне API",
    version: 1,
    endpoints: {
      groups: `${base}/api/v1/groups`,
      group: `${base}/api/v1/groups/{name}`,
      groupCalendar: `${base}/api/v1/groups/{name}/ics`,
      teacher: `${base}/api/v1/teachers/{id}`,
      search: `${base}/api/v1/search?q=КІ-21`,
      embed: `${base}/embed/group/{name}`,
    },
    notes: {
      week: "all — щотижня, num — чисельник, den — знаменник",
      subgroup: "0 — уся група, 1/2 — підгрупа",
      day: "1 — понеділок … 5 — п'ятниця",
    },
  });
}

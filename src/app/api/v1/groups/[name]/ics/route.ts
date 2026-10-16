import { prisma } from "@/lib/db";
import { getToday, lessonsWhere } from "@/lib/queries";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[\\,;]/g, (c) => "\\" + c);

function addDays(ymd: string, days: number) {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Календар групи у форматі iCalendar: щотижневі / двотижневі (чисельник, знаменник) події. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name);
  const group = await prisma.group.findUnique({ where: { name } });
  if (!group) return new Response("Групу не знайдено", { status: 404 });

  const [lessons, today] = await Promise.all([lessonsWhere({ groupId: group.id }), getToday()]);
  const { numeratorAnchor, semesterEnd } = today.settings;
  const until = semesterEnd.replaceAll("-", "") + "T235959Z";
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IT College Lviv Polytechnic//Schedule//UK",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:Розклад ${esc(group.name)}`,
    "X-WR-TIMEZONE:Europe/Kyiv",
  ];

  for (const l of lessons) {
    const bell = today.bells.find((b) => b.pair === l.pair);
    if (!bell) continue;
    // перший день: понеділок-якір + (день − 1) + тиждень, якщо знаменник
    const date = addDays(numeratorAnchor, l.day - 1 + (l.week === "den" ? 7 : 0)).replaceAll("-", "");
    const time = (hhmm: string) => hhmm.replace(":", "") + "00";
    const tags = [l.week === "num" ? "чисельник" : l.week === "den" ? "знаменник" : "", l.subgroup ? `${l.subgroup} підгрупа` : ""].filter(Boolean);
    lines.push(
      "BEGIN:VEVENT",
      `UID:lesson-${l.id}@schedule.itcollege`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Kyiv:${date}T${time(bell.start)}`,
      `DTEND;TZID=Europe/Kyiv:${date}T${time(bell.end)}`,
      `RRULE:FREQ=WEEKLY;INTERVAL=${l.week === "all" ? 1 : 2};UNTIL=${until}`,
      `SUMMARY:${esc(l.subject)}${l.room ? esc(` · ауд. ${l.room}`) : ""}`,
      `DESCRIPTION:${esc([l.teacher, ...tags].filter(Boolean).join(" · "))}`,
      ...(l.room ? [`LOCATION:${esc(`Аудиторія ${l.room}, вул. Володимира Великого 12, Львів`)}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  // RFC 5545: рядки до 75 октетів, CRLF
  const fold = (line: string) => {
    const out: string[] = [];
    let cur = "";
    for (const ch of line) {
      if (Buffer.byteLength(cur + ch) > 73) {
        out.push(cur);
        cur = " " + ch;
      } else cur += ch;
    }
    out.push(cur);
    return out.join("\r\n");
  };

  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`schedule-${group.name}.ics`)}`,
    },
  });
}

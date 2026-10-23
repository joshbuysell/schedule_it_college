import { addDays, type BellDTO, type LessonDTO } from "./schedule";
import type { ChangeDTO } from "./changes";

const esc = (s: string) => s.replace(/[\\,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
const compact = (ymd: string) => ymd.replaceAll("-", "");
const time = (hhmm: string) => hhmm.replace(":", "") + "00";
const ADDRESS = "вул. Володимира Великого 12, Львів";

function fold(line: string) {
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
}

type Options = {
  title: string;
  lessons: LessonDTO[];
  changes: ChangeDTO[];
  inView: (l: { groupId: number; teacherId: number | null; roomId: number | null }) => boolean;
  showGroup: boolean;
  bells: BellDTO[];
  anchor: string;
  semesterEnd: string;
};

export function buildCalendar({ title, lessons, changes, inView, showGroup, bells, anchor, semesterEnd }: Options) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const bell = (pair: number) => bells.find((b) => b.pair === pair);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IT College Lviv Polytechnic//Schedule//UK",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(title)}`,
    "X-WR-TIMEZONE:Europe/Kyiv",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];

  const summary = (l: { subject: string | null; room: string | null; group: string }) =>
    esc([l.subject, showGroup ? l.group : null, l.room && `ауд. ${l.room}`].filter(Boolean).join(" · "));

  for (const l of lessons) {
    const b = bell(l.pair);
    if (!b) continue;
    const start = addDays(anchor, l.day - 1 + (l.week === "den" ? 7 : 0));
    const skipped = changes.filter((c) => c.replaces.some((r) => r.id === l.id)).map((c) => compact(c.date));
    const tags = [l.week === "num" ? "чисельник" : l.week === "den" ? "знаменник" : "", l.subgroup ? `${l.subgroup} підгрупа` : ""];
    lines.push(
      "BEGIN:VEVENT",
      `UID:lesson-${l.id}@schedule.itcollege`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Kyiv:${compact(start)}T${time(b.start)}`,
      `DTEND;TZID=Europe/Kyiv:${compact(start)}T${time(b.end)}`,
      `RRULE:FREQ=WEEKLY;INTERVAL=${l.week === "all" ? 1 : 2};UNTIL=${compact(semesterEnd)}T235959Z`,
      ...skipped.map((d) => `EXDATE;TZID=Europe/Kyiv:${d}T${time(b.start)}`),
      `SUMMARY:${summary(l)}`,
      `DESCRIPTION:${esc([l.teacher, ...tags].filter(Boolean).join(" · "))}`,
      ...(l.room ? [`LOCATION:${esc(`Аудиторія ${l.room}, ${ADDRESS}`)}`] : []),
      "END:VEVENT",
    );
  }

  for (const c of changes) {
    const b = bell(c.pair);
    if (!b || c.cancelled || !inView(c)) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:change-${c.id}@schedule.itcollege`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Kyiv:${compact(c.date)}T${time(b.start)}`,
      `DTEND;TZID=Europe/Kyiv:${compact(c.date)}T${time(b.end)}`,
      `SUMMARY:${summary(c)} (заміна)`,
      `DESCRIPTION:${esc([c.teacher, c.note].filter(Boolean).join(" · "))}`,
      ...(c.room ? [`LOCATION:${esc(`Аудиторія ${c.room}, ${ADDRESS}`)}`] : []),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function calendarResponse(body: string, filename: string, download: boolean) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=900",
      ...(download && { "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` }),
    },
  });
}

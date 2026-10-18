
export type Week = "all" | "num" | "den";

export type LessonDTO = {
  id: number;
  day: number;
  pair: number;
  week: Week;
  subgroup: number;
  subject: string;
  subjectId: number;
  teacher: string | null;
  teacherId: number | null;
  room: string | null;
  roomId: number | null;
  group: string;
  groupId: number;
};

export type BellDTO = { pair: number; start: string; end: string };

export const DAYS = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"];
export const DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт"];

export const WEEK_LABEL: Record<Week, string> = {
  all: "Щотижня",
  num: "Чисельник",
  den: "Знаменник",
};

export const TZ = "Europe/Kyiv";

export function kyivNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: weekdayMap[get("weekday")] ?? 1,
    minutes: (+get("hour") % 24) * 60 + +get("minute"),
  };
}

function utcDay(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function weekParity(anchor: string, ymd: string, weekday: number): Exclude<Week, "all"> {
  const monday = utcDay(ymd) - (weekday - 1);
  const a = utcDay(anchor);
  const anchorMonday = a - ((new Date(a * 86_400_000).getUTCDay() + 6) % 7);
  const weeks = Math.round((monday - anchorMonday) / 7);
  return ((weeks % 2) + 2) % 2 === 0 ? "num" : "den";
}

export function relevantParity(anchor: string, ymd: string, weekday: number): Exclude<Week, "all"> {
  const p = weekParity(anchor, ymd, weekday);
  return weekday > 5 ? (p === "num" ? "den" : "num") : p;
}

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function currentPair(bells: BellDTO[], minutes: number) {
  for (const b of bells) {
    if (minutes >= toMinutes(b.start) && minutes < toMinutes(b.end)) return { pair: b.pair, live: true };
  }
  const next = bells.find((b) => minutes < toMinutes(b.start));
  return next ? { pair: next.pair, live: false } : null;
}

export function weeksOverlap(a: Week, b: Week) {
  return a === "all" || b === "all" || a === b;
}

export function matchesWeek(lesson: Week, filter: Week) {
  return filter === "all" || lesson === "all" || lesson === filter;
}

export function subjectHue(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h % 360;
}

export function courseOf(group: string) {
  const m = group.match(/-(\d)/);
  return m ? +m[1] : 0;
}

export function shortSubject(name: string, max = 28) {
  return name.length <= max ? name : name.slice(0, max - 1).trimEnd() + "…";
}

const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const UA = "йцукенгшщзхїфівапролджєячсмитьбюʼ";
export function normalizeQuery(q: string) {
  return q
    .toLowerCase()
    .replace(/[\s\-–—_.'’ʼ]/g, "")
    .replace(/i/g, "і");
}
export function layoutSwap(q: string) {
  return [...q.toLowerCase()].map((c) => {
    const i = EN.indexOf(c);
    return i >= 0 ? UA[i] : c;
  }).join("");
}
export function translit(q: string) {
  const map: Record<string, string> = {
    shch: "щ", zh: "ж", kh: "х", ts: "ц", ch: "ч", sh: "ш", yu: "ю", ya: "я", ye: "є", yi: "ї",
    a: "а", b: "б", v: "в", h: "г", g: "ґ", d: "д", e: "е", z: "з", y: "и", i: "і", k: "к",
    l: "л", m: "м", n: "н", o: "о", p: "п", r: "р", s: "с", t: "т", u: "у", f: "ф", c: "к",
  };
  let s = q.toLowerCase();
  for (const [k, v] of Object.entries(map)) s = s.split(k).join(v);
  return s;
}

export const byName = (a: string, b: string) => a.localeCompare(b, "uk", { numeric: true });

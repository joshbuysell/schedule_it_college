import type { OpenTarget } from "@/components/Timetable";

export function encodeSelection(t: OpenTarget) {
  return `${t.kind[0]}:${t.key}`;
}

export function decodeSelection(s: string | null | undefined): OpenTarget | null {
  const m = s?.match(/^([gtr]):(.+)$/);
  if (!m) return null;
  return { kind: m[1] === "g" ? "group" : m[1] === "t" ? "teacher" : "room", key: m[2] };
}

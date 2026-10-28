import "server-only";
import { applyChanges, type DisplayLesson } from "./changes";
import { getBells, getChanges, getSettings, lessonsWhere } from "./queries";
import { matchesWeek, weekParity, weekdayOf, type BellDTO } from "./schedule";

export type Target = { kind: "group"; id: number; name: string } | { kind: "teacher"; id: number; name: string };

export type DayPlan = { day: number; parity: "num" | "den"; bells: BellDTO[]; lessons: DisplayLesson[] };

export async function dayPlan(target: Target, date: string): Promise<DayPlan> {
  const [settings, bells] = await Promise.all([getSettings(), getBells()]);
  const day = weekdayOf(date);
  const parity = weekParity(settings.numeratorAnchor, date, day);
  if (day > 5) return { day, parity, bells, lessons: [] };

  const where = target.kind === "group" ? { groupId: target.id, day } : { teacherId: target.id, day };
  const [base, changes] = await Promise.all([lessonsWhere(where), getChanges({ status: "approved", date })]);
  const inView = (l: { groupId: number; teacherId: number | null }) => (target.kind === "group" ? l.groupId === target.id : l.teacherId === target.id);
  const lessons = applyChanges(base.filter((l) => matchesWeek(l.week, parity)), changes, inView).sort((a, b) => a.pair - b.pair || a.subgroup - b.subgroup);
  return { day, parity, bells, lessons };
}

export const isStruck = (l: DisplayLesson) => l.change?.kind === "cancelled" || l.change?.kind === "taken";

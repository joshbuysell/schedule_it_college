import { describe, expect, it } from "vitest";
import { applyChanges, changeSummary, roomOnly, type ChangeDTO } from "../src/lib/changes";
import type { LessonDTO } from "../src/lib/schedule";

const math: LessonDTO = {
  id: 1, day: 2, pair: 1, week: "all", subgroup: 0, subject: "Вища математика", subjectId: 1,
  teacher: "Кузар Х.В.", teacherId: 10, room: "401", roomId: 100, group: "КІ-21", groupId: 5,
};

const change = (p: Partial<ChangeDTO>): ChangeDTO => ({
  id: 7, date: "2026-10-27", day: 2, pair: 1, subgroup: 0, cancelled: false,
  subject: "Вища математика", subjectId: 1, teacher: "Йосифів Л.Б.", teacherId: 11, room: "406", roomId: 101,
  group: "КІ-21", groupId: 5, note: null, status: "approved", author: null, replaces: [math], ...p,
});

describe("applyChanges", () => {
  it("група бачить заміну замість основної пари", () => {
    const out = applyChanges([math], [change({})], (l) => l.groupId === 5);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ teacher: "Йосифів Л.Б.", change: { kind: "replaced", was: "Вища математика, Кузар Х.В., ауд. 401" } });
  });

  it("викладач, якого замінили, бачить свою пару перекресленою", () => {
    const out = applyChanges([math], [change({})], (l) => l.teacherId === 10);
    expect(out).toHaveLength(1);
    expect(out[0].change?.kind).toBe("taken");
  });

  it("викладач, який замінює, бачить додану пару", () => {
    const out = applyChanges([], [change({})], (l) => l.teacherId === 11);
    expect(out[0]).toMatchObject({ group: "КІ-21", change: { kind: "replaced" } });
  });

  it("зміна лише аудиторії позначена як «інша аудиторія»", () => {
    const out = applyChanges([math], [change({ teacher: "Кузар Х.В.", teacherId: 10, room: "211" })], (l) => l.groupId === 5);
    expect(out[0]).toMatchObject({ room: "211", change: { kind: "room", was: "ауд. 401" } });
  });

  it("скасована пара лишається, але позначена", () => {
    const out = applyChanges([math], [change({ cancelled: true, subject: null, teacher: null, teacherId: null })], (l) => l.groupId === 5);
    expect(out).toHaveLength(1);
    expect(out[0].change?.kind).toBe("cancelled");
  });

  it("додаткова пара без основної", () => {
    const out = applyChanges([], [change({ replaces: [], pair: 5 })], (l) => l.groupId === 5);
    expect(out[0]).toMatchObject({ pair: 5, change: { kind: "added" } });
  });
});

describe("roomOnly", () => {
  it("та сама пара в іншій аудиторії — це зміна аудиторії", () => {
    const c = change({ teacher: "Кузар Х.В.", teacherId: 10, room: "105" });
    expect(roomOnly(c)).toBe(true);
    expect(changeSummary(c)).toBe("Вища математика — ауд. 105 (замість 401)");
  });

  it("інший викладач — це заміна, а не зміна аудиторії", () => {
    expect(roomOnly(change({}))).toBe(false);
  });

  it("скасування і додаткова пара — не зміна аудиторії", () => {
    expect(roomOnly(change({ cancelled: true }))).toBe(false);
    expect(roomOnly(change({ replaces: [] }))).toBe(false);
  });
});

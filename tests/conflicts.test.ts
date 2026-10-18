import { describe, expect, it } from "vitest";
import { conflictKind, findConflicts } from "../src/lib/conflicts";
import type { LessonDTO } from "../src/lib/schedule";

let id = 0;
const lesson = (p: Partial<LessonDTO>): LessonDTO => ({
  id: ++id, day: 1, pair: 1, week: "all", subgroup: 0, subject: "Фізика", subjectId: 1,
  teacher: "Шеремета М.Я.", teacherId: 1, room: "413", roomId: 1, group: "КІ-11", groupId: 1, ...p,
});

describe("conflictKind", () => {
  it("викладач у двох групах одночасно", () => {
    expect(conflictKind(lesson({}), lesson({ groupId: 2, roomId: 2 }), new Set())).toBe("teacher");
  });

  it("чисельник і знаменник не конфліктують", () => {
    expect(conflictKind(lesson({ week: "num" }), lesson({ week: "den", groupId: 2 }), new Set())).toBeNull();
  });

  it("різні підгрупи однієї групи — не накладка", () => {
    expect(conflictKind(lesson({ subgroup: 1 }), lesson({ subgroup: 2, teacherId: 2, roomId: 2 }), new Set())).toBeNull();
  });

  it("спільна аудиторія (спортзал) не перевіряється", () => {
    expect(conflictKind(lesson({ teacherId: 1 }), lesson({ groupId: 2, teacherId: 2 }), new Set([1]))).toBeNull();
  });

  it("аудиторія зайнята двома групами", () => {
    expect(conflictKind(lesson({}), lesson({ groupId: 2, teacherId: 2 }), new Set())).toBe("room");
  });
});

describe("findConflicts", () => {
  it("групує накладки за часом і причиною", () => {
    const list = [lesson({}), lesson({ groupId: 2, roomId: 2 }), lesson({ groupId: 3, roomId: 3 }), lesson({ day: 2, groupId: 4 })];
    const result = findConflicts(list, new Set());
    expect(result).toHaveLength(1);
    expect(result[0].lessons).toHaveLength(3);
  });
});

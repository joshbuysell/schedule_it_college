import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSchedule } from "../prisma/seed";

describe("parseSchedule", () => {
  it("розбирає чисельник, знаменник і підгрупи", () => {
    const [g] = parseSchedule(`=КІ-11
2.1 ч: Всесвітня історія | Жукова Н.В. | 213
2.1 з: Зарубіжна література | Щерба І.Г. | 214
5.2 Іноземна мова | Цебенко О.З. / Ляшенко В.Е. | 302 / 313л
1.1 Іноземна мова | Цебенко О.З. | 302 | sg2
practice: Навчальна практика | 25.05-07.06 | Іванишин О.В. / Сторож Ю.Д.`);

    expect(g.name).toBe("КІ-11");
    expect(g.lessons.map((l) => l.week)).toEqual(["num", "den", "all", "all", "all"]);
    expect(g.lessons[2]).toMatchObject({ subgroup: 1, teacher: "Цебенко О.З.", room: "302" });
    expect(g.lessons[3]).toMatchObject({ subgroup: 2, teacher: "Ляшенко В.Е.", room: "313л" });
    expect(g.lessons[4].subgroup).toBe(2);
    expect(g.practices[0].teachers).toBe("Іванишин О.В., Сторож Ю.Д.");
  });

  it("повний файл розкладу розбирається без помилок", () => {
    const text = readFileSync(join(__dirname, "../prisma/data/schedule-2025-2026-sem2.txt"), "utf8");
    const groups = parseSchedule(text);
    expect(groups).toHaveLength(50);
    expect(groups.reduce((n, g) => n + g.lessons.length, 0)).toBe(908);
  });
});

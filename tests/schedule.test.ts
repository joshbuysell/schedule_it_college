import { describe, expect, it } from "vitest";
import { currentPair, layoutSwap, matchesWeek, normalizeQuery, relevantParity, translit, weekParity, weeksOverlap } from "../src/lib/schedule";

const bells = [
  { pair: 1, start: "08:30", end: "09:50" },
  { pair: 2, start: "10:00", end: "11:20" },
];

describe("weekParity", () => {
  it("рахує чисельник і знаменник від понеділка-якоря", () => {
    expect(weekParity("2026-09-07", "2026-09-09", 3)).toBe("num");
    expect(weekParity("2026-09-07", "2026-09-14", 1)).toBe("den");
    expect(weekParity("2026-09-07", "2026-09-21", 1)).toBe("num");
  });

  it("працює, якщо якір — не понеділок", () => {
    expect(weekParity("2026-09-10", "2026-09-07", 1)).toBe("num");
    expect(weekParity("2026-09-10", "2026-09-16", 3)).toBe("den");
  });

  it("працює для дат до якоря", () => {
    expect(weekParity("2026-09-07", "2026-08-31", 1)).toBe("den");
  });

  it("у вихідні показує наступний тиждень", () => {
    expect(relevantParity("2026-09-07", "2026-09-12", 6)).toBe("den");
    expect(relevantParity("2026-09-07", "2026-09-11", 5)).toBe("num");
  });
});

describe("тижні та пари", () => {
  it("weeksOverlap", () => {
    expect(weeksOverlap("all", "num")).toBe(true);
    expect(weeksOverlap("num", "den")).toBe(false);
    expect(weeksOverlap("den", "den")).toBe(true);
  });

  it("matchesWeek", () => {
    expect(matchesWeek("num", "all")).toBe(true);
    expect(matchesWeek("num", "den")).toBe(false);
    expect(matchesWeek("all", "den")).toBe(true);
  });

  it("currentPair: пара, перерва, кінець дня", () => {
    expect(currentPair(bells, 9 * 60)).toEqual({ pair: 1, live: true });
    expect(currentPair(bells, 9 * 60 + 55)).toEqual({ pair: 2, live: false });
    expect(currentPair(bells, 12 * 60)).toBeNull();
  });
});

describe("пошук", () => {
  it("ігнорує регістр, дефіси та латинську i", () => {
    expect(normalizeQuery("КІ-21")).toBe("кі21");
    expect(normalizeQuery("Ki 21")).toBe("kі21");
  });

  it("виправляє англійську розкладку", () => {
    expect(layoutSwap("rehbkfc")).toBe("курилас");
  });

  it("розуміє транслітерацію", () => {
    expect(translit("kuzar")).toBe("кузар");
  });
});

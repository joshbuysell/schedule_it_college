import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../src/lib/db", () => ({ prisma: {} }));

const { normalizePath } = await import("../src/lib/stats");

describe("normalizePath", () => {
  it("приймає публічні сторінки й декодує назви груп", () => {
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("/group/%D0%9A%D0%86-21")).toBe("/group/КІ-21");
    expect(normalizePath("/teacher/42/")).toBe("/teacher/42");
    expect(normalizePath("/embed/group/КІ-21")).toBe("/embed");
    expect(normalizePath("/help?x=1#faq")).toBe("/help");
  });

  it("відкидає службові й довільні адреси", () => {
    expect(normalizePath("/admin")).toBeNull();
    expect(normalizePath("/cabinet")).toBeNull();
    expect(normalizePath("/api/v1/groups")).toBeNull();
    expect(normalizePath("/group/a/b")).toBeNull();
    expect(normalizePath("/whatever")).toBeNull();
    expect(normalizePath("%E0%A4%A")).toBeNull();
  });
});

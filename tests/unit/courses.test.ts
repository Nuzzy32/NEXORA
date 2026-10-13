import { describe, expect, it } from "vitest";
import { courseInputSchema, formatGpa, gpaSummary, isoWeekday, sessionInputSchema } from "@/features/courses/schema";

describe("gpaSummary (UNAIR scale)", () => {
  it("weights grades by credits per semester and overall, skipping ungraded courses", () => {
    const g = gpaSummary([
      { semester: 1, credits: 3, grade: "A" }, // 12
      { semester: 1, credits: 2, grade: "BC" }, // 5
      { semester: 2, credits: 4, grade: "AB" }, // 14
      { semester: 2, credits: 3, grade: null },
    ]);
    expect(g.ipk).toBe(3.44); // 31 / 9
    expect(g.gradedCredits).toBe(9);
    expect(g.totalCredits).toBe(12);
    expect(g.semesters).toEqual([
      { semester: 2, ips: 3.5, credits: 7, gradedCredits: 4 },
      { semester: 1, ips: 3.4, credits: 5, gradedCredits: 5 },
    ]);
  });

  it("is empty-safe", () => {
    expect(gpaSummary([])).toEqual({ ipk: null, gradedCredits: 0, totalCredits: 0, semesters: [] });
    expect(formatGpa(null)).toBe("–");
    expect(formatGpa(3.5)).toBe("3,50");
  });
});

describe("course and session input", () => {
  it("coerces form strings and treats blanks as empty", () => {
    expect(courseInputSchema.parse({ name: " Basis Data ", code: "", credits: "3", semester: "5", lecturer: "", grade: "" })).toEqual({
      name: "Basis Data",
      code: null,
      credits: 3,
      semester: 5,
      lecturer: null,
      grade: null,
    });
    expect(courseInputSchema.safeParse({ name: "x", credits: "0", semester: "1", grade: "" }).success).toBe(false);
    expect(courseInputSchema.safeParse({ name: "x", credits: "3", semester: "1", grade: "B+" }).success).toBe(false);
  });

  it("requires the end after the start", () => {
    expect(sessionInputSchema.parse({ weekday: "2", starts_at: "08:00", ends_at: "09:40", room: "" })).toEqual({
      weekday: 2,
      starts_at: "08:00",
      ends_at: "09:40",
      room: null,
    });
    expect(sessionInputSchema.safeParse({ weekday: "2", starts_at: "10:00", ends_at: "09:00", room: "" }).success).toBe(false);
    expect(sessionInputSchema.safeParse({ weekday: "8", starts_at: "08:00", ends_at: "09:00", room: "" }).success).toBe(false);
  });
});

describe("isoWeekday", () => {
  it("maps Monday to 1 and Sunday to 7", () => {
    expect(isoWeekday("2026-10-12")).toBe(1);
    expect(isoWeekday("2026-10-18")).toBe(7);
  });
});

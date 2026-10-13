import { describe, expect, it } from "vitest";
import { formatMinutes, matchCourse, minutesByCourse, targetPlan } from "@/features/courses/links";

const courses = [
  { id: "c1", name: "Perencanaan Arsitektur Perusahaan (praktikum)", code: "SIA302" },
  { id: "c2", name: "Analisis dan Visualisasi Data", code: null },
  { id: "c3", name: "Basis Data", code: "SIA101" },
];

describe("matchCourse", () => {
  it("prefers the Moodle course code in the description", () => {
    const task = { title: "Sesuatu · Tugas 1", description: "Mata kuliah: 2026Ganjil - SIA302 - Perencanaan ... - S1" };
    expect(matchCourse(task, courses)).toBe("c1");
  });
  it("falls back to the title prefix, case-insensitive", () => {
    expect(matchCourse({ title: "analisis dan visualisasi data · Project UTS", description: null }, courses)).toBe("c2");
    // a name that is only a prefix of a longer word does not match
    expect(matchCourse({ title: "Basis Data Lanjut · Kuis", description: "" }, courses)).toBeNull();
  });
  it("links nothing when two courses claim the task", () => {
    const twins = [...courses, { id: "c4", name: "X", code: "SIA302" }];
    expect(matchCourse({ title: "x · y", description: "2026Ganjil - SIA302 - X" }, twins)).toBeNull();
  });
  it("does not match a code inside a longer code", () => {
    expect(matchCourse({ title: "t", description: "SIA3021" }, courses)).toBeNull();
  });
});

describe("targetPlan", () => {
  const graded = [{ credits: 20, grade: "B" as const }]; // 60 points
  it("computes the average the ungraded credits need", () => {
    // (3.5 * 40 - 60) / 20 = 4.0 -> A
    expect(targetPlan([...graded, { credits: 20, grade: null }], 3.5)).toEqual({ kind: "plan", needed: 4, remaining: 20, letter: "A" });
    // (3.25 * 40 - 60) / 20 = 3.5 -> AB
    expect(targetPlan([...graded, { credits: 20, grade: null }], 3.25)).toMatchObject({ kind: "plan", letter: "AB" });
  });
  it("flags reached, impossible and nothing-left", () => {
    expect(targetPlan([...graded, { credits: 20, grade: null }], 1).kind).toBe("reached");
    expect(targetPlan([...graded, { credits: 2, grade: null }], 3.9).kind).toBe("impossible");
    expect(targetPlan(graded, 3).kind).toBe("none");
  });
});

describe("study minutes", () => {
  it("sums minutes per course from a local start date", () => {
    const sessions = [
      { course_id: "c1", minutes: 25, ended_at: "2026-10-12T02:00:00Z" },
      { course_id: "c1", minutes: 50, ended_at: "2026-10-13T02:00:00Z" },
      { course_id: null, minutes: 25, ended_at: "2026-10-13T03:00:00Z" },
      { course_id: "c1", minutes: 25, ended_at: "2026-10-05T02:00:00Z" },
    ];
    const m = minutesByCourse(sessions, "2026-10-12", (t) => t.slice(0, 10));
    expect(m.get("c1")).toBe(75);
    expect(m.get(null)).toBe(25);
    expect(formatMinutes(75)).toBe("1 j 15 m");
    expect(formatMinutes(40)).toBe("40 m");
  });
});

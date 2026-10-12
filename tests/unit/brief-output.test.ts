import { describe, expect, it } from "vitest";
import { parseBriefOutput } from "@/features/brief/generate";
import type { BriefInput } from "@/features/brief/input";
import { BriefError, estimateCostUSD, formatUSD } from "@/features/brief/schema";

const input: BriefInput = {
  today: "2026-10-11",
  projects: ["Nexora", "Skripsi"].map((name) => ({
    name,
    status: "active" as const,
    starts_on: null,
    due_on: null,
    tasks_open: 1,
    tasks_done: 1,
    tasks_overdue: 0,
    last_activity: "2026-10-10",
    days_since_activity: 1,
    top_open_tasks: [],
    recent_decision_titles: [],
  })),
  coursework_due_soon: [],
};
const project = (o: Record<string, unknown> = {}) => ({ name: "Nexora", progress: "1 dari 2 task selesai.", next: ["Selesaikan brief"], risk: null, ...o });
const out = (o: Record<string, unknown> = {}) => JSON.stringify({ headline: "Ringkasan hari ini", projects: [project()], watch: [], ...o });

describe("parseBriefOutput", () => {
  it("accepts a valid brief", () => {
    const c = parseBriefOutput(out({ watch: ["Tugas A besok"] }), input);
    expect(c.headline).toBe("Ringkasan hari ini");
    expect(c.projects).toHaveLength(1);
    expect(c.watch).toEqual(["Tugas A besok"]);
  });

  it("treats a blank risk as none", () => {
    expect(parseBriefOutput(out({ projects: [project({ risk: "  " })] }), input).projects[0].risk).toBeNull();
  });

  it.each([
    ["broken JSON", "{ headline: "],
    ["not an object", "[]"],
    ["missing headline", JSON.stringify({ projects: [project()], watch: [] })],
    ["missing watch", JSON.stringify({ headline: "x", projects: [project()] })],
    ["headline over 140", out({ headline: "x".repeat(141) })],
    ["no next steps", out({ projects: [project({ next: [] })] })],
    ["more than 3 next steps", out({ projects: [project({ next: ["a", "b", "c", "d"] })] })],
    ["more than 5 watch items", out({ watch: ["1", "2", "3", "4", "5", "6"] })],
    ["wrong type", out({ projects: "Nexora" })],
  ])("rejects %s", (_name, text) => {
    expect(() => parseBriefOutput(text, input)).toThrow(BriefError);
  });

  it("matches names case-insensitively to the input spelling and ignores unknown or repeated projects", () => {
    const c = parseBriefOutput(
      out({ projects: [project({ name: "nexora" }), project({ name: "Proyek karangan" }), project({ name: "NEXORA" }), project({ name: "Skripsi" })] }),
      input,
    );
    expect(c.projects.map((p) => p.name)).toEqual(["Nexora", "Skripsi"]);
  });

  it("fails when no project name is recognized but projects were sent", () => {
    expect(() => parseBriefOutput(out({ projects: [project({ name: "Karangan" })] }), input)).toThrow(/proyek yang dikenal/);
  });

  it("allows an empty project list when none were sent (coursework only)", () => {
    const c = parseBriefOutput(out({ projects: [], watch: ["Tugas A"] }), { ...input, projects: [] });
    expect(c.projects).toEqual([]);
  });
});

describe("cost estimate", () => {
  it("uses $0.10 per 1M input and $0.50 per 1M output tokens", () => {
    expect(estimateCostUSD(1_000_000, 0)).toBeCloseTo(0.1);
    expect(estimateCostUSD(0, 1_000_000)).toBeCloseTo(0.5);
    expect(estimateCostUSD(2000, 800)).toBeCloseTo(0.0006);
  });

  it("formats sub-cent amounts with four decimals", () => {
    expect(formatUSD(0.0006)).toBe("$0.0006");
    expect(formatUSD(0.0254)).toBe("$0.03");
  });
});

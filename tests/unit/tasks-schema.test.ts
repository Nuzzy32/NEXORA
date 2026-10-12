import { describe, expect, it } from "vitest";
import { parseFilters, parseTaskForm, quickAddSchema } from "@/features/tasks/schema";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const valid = { title: "Tulis PRD", status: "todo", priority: "medium" };

describe("parseTaskForm", () => {
  it("accepts a minimal task and nulls blank optional fields", () => {
    const r = parseTaskForm(form({ ...valid, description: "  ", due_date: "", project_id: "" }));
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ ...valid, description: null, due_date: null, project_id: null });
  });

  it("trims the title and rejects an empty one", () => {
    expect(parseTaskForm(form({ ...valid, title: "  halo  " })).data?.title).toBe("halo");
    expect(parseTaskForm(form({ ...valid, title: "   " })).success).toBe(false);
    expect(parseTaskForm(form({ status: "todo", priority: "low" })).success).toBe(false);
  });

  it("rejects bad enum, date, uuid and over-long title", () => {
    expect(parseTaskForm(form({ ...valid, status: "archived" })).success).toBe(false);
    expect(parseTaskForm(form({ ...valid, priority: "urgent" })).success).toBe(false);
    expect(parseTaskForm(form({ ...valid, due_date: "2026-02-30" })).success).toBe(false);
    expect(parseTaskForm(form({ ...valid, project_id: "not-a-uuid" })).success).toBe(false);
    expect(parseTaskForm(form({ ...valid, title: "x".repeat(201) })).success).toBe(false);
  });
});

describe("parseFilters", () => {
  it("defaults to open/all and ignores unknown values", () => {
    expect(parseFilters({})).toEqual({ status: "open", priority: "all", q: "", due: "" });
    expect(parseFilters({ status: "bogus", priority: ["high", "low"], q: "  kopi  " })).toEqual({
      status: "open",
      priority: "high",
      q: "kopi",
      due: "",
    });
    expect(parseFilters({ due: "2026-10-13" }).due).toBe("2026-10-13");
    expect(parseFilters({ due: "besok" }).due).toBe("");
    expect(parseFilters({ status: "done" }).status).toBe("done");
  });
});

describe("quickAddSchema", () => {
  it("takes just a trimmed title and rejects empty or over-long ones", () => {
    expect(quickAddSchema.safeParse({ title: "  Beli kopi " }).data).toEqual({ title: "Beli kopi" });
    expect(quickAddSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(quickAddSchema.safeParse({ title: null }).success).toBe(false);
    expect(quickAddSchema.safeParse({ title: "x".repeat(201) }).success).toBe(false);
  });

  it("accepts the overdue status filter", () => {
    expect(parseFilters({ status: "overdue" }).status).toBe("overdue");
  });
});

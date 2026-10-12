import { describe, expect, it } from "vitest";
import { countsFor, DELETE_PLANS, describeCounts, type DataTable } from "@/features/settings/delete";
import { CONFIRM_WORD, DELETE_CATEGORIES, parseDeleteRequest, parsePrefsForm } from "@/features/settings/schema";
import { resolveTasksView, urlDecidesView } from "@/features/settings/view";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("parsePrefsForm", () => {
  it("accepts calendar and list", () => {
    expect(parsePrefsForm(form({ default_tasks_view: "calendar" })).data).toEqual({ default_tasks_view: "calendar" });
    expect(parsePrefsForm(form({ default_tasks_view: "list" })).data).toEqual({ default_tasks_view: "list" });
  });

  it("rejects anything else, including a missing value, and never carries brief fields through", () => {
    for (const v of [{}, { default_tasks_view: "board" }, { default_tasks_view: "" }] as Record<string, string>[]) expect(parsePrefsForm(form(v)).success).toBe(false);
    const r = parsePrefsForm(form({ default_tasks_view: "list", brief_enabled: "true", brief_consented_at: "now" }));
    expect(r.data).toEqual({ default_tasks_view: "list" });
  });
});

describe("parseDeleteRequest", () => {
  it("lets the four single categories through without a typed word", () => {
    for (const c of ["memory", "conversations", "briefs", "elearning"]) expect(parseDeleteRequest(c, "").success).toBe(true);
  });

  it(`requires ${CONFIRM_WORD} for "all", trimmed and exact`, () => {
    expect(parseDeleteRequest("all", "").success).toBe(false);
    expect(parseDeleteRequest("all", "hapus").success).toBe(false);
    expect(parseDeleteRequest("all", "HAPUS SEMUA").success).toBe(false);
    expect(parseDeleteRequest("all", null).success).toBe(false);
    expect(parseDeleteRequest("all", "HAPUS").success).toBe(true);
    expect(parseDeleteRequest("all", "  HAPUS ").success).toBe(true);
    expect(parseDeleteRequest("all", "").error?.issues[0].path).toEqual(["confirm"]);
  });

  it("rejects an unknown category", () => {
    for (const c of ["users", "", "ALL", undefined]) expect(parseDeleteRequest(c, "HAPUS").success).toBe(false);
  });
});

describe("delete plans", () => {
  it("has a plan for every category", () => {
    expect(Object.keys(DELETE_PLANS).sort()).toEqual([...DELETE_CATEGORIES].sort());
  });

  it("deletes children before parents in the all plan, projects last", () => {
    const order = DELETE_PLANS.all.map((s) => s.table);
    expect(order.at(-1)).toBe("projects");
    expect(order.indexOf("messages")).toBeLessThan(order.indexOf("conversations"));
    expect(order.indexOf("tasks")).toBeLessThan(order.indexOf("projects"));
    expect(order.indexOf("project_notes")).toBeLessThan(order.indexOf("projects"));
    expect(new Set(order).size).toBe(order.length);
  });

  it("limits the e-learning category to imported tasks", () => {
    expect(DELETE_PLANS.elearning).toEqual([{ table: "tasks", key: "id", eq: ["source", "elearning"] }]);
  });

  it("describes counts and drops zeros", () => {
    expect(describeCounts({ memory_items: 12, tasks: 0 })).toBe("12 memory");
    expect(describeCounts({ projects: 3, tasks: 1200, messages: 5 })).toBe(`3 proyek, ${new Intl.NumberFormat("id-ID").format(1200)} task, 5 pesan`);
    expect(describeCounts({})).toBe("");
  });

  it("reads each category's row count from the table counts", () => {
    const tables = Object.fromEntries(
      (["projects", "tasks", "project_notes", "memory_items", "conversations", "messages", "daily_briefs", "integration_syncs"] as DataTable[]).map((t, i) => [t, i + 1]),
    ) as Record<DataTable, number>;
    const c = { tables, elearningTasks: 7 };
    expect(countsFor("elearning", c)).toEqual({ tasks: 7 });
    expect(countsFor("memory", c)).toEqual({ memory_items: tables.memory_items });
    expect(countsFor("all", c).tasks).toBe(tables.tasks);
  });
});

describe("resolveTasksView", () => {
  it("uses the saved preference when the URL says nothing", () => {
    expect(resolveTasksView({}, "calendar")).toBe("calendar");
    expect(resolveTasksView({}, "list")).toBe("list");
    expect(resolveTasksView({ priority: "high", q: "x" }, "list")).toBe("list");
  });

  it("lets ?view win over the preference", () => {
    expect(resolveTasksView({ view: "calendar" }, "list")).toBe("calendar");
    expect(resolveTasksView({ view: "list" }, "calendar")).toBe("list");
    expect(resolveTasksView({ view: ["list", "calendar"] }, "calendar")).toBe("list");
  });

  it("keeps status and due links on the list, as in D-019", () => {
    expect(resolveTasksView({ status: "overdue" }, "calendar")).toBe("list");
    expect(resolveTasksView({ due: "today" }, "calendar")).toBe("list");
    expect(resolveTasksView({ view: "calendar", status: "open" }, "list")).toBe("calendar");
  });

  it("ignores an unknown view value", () => {
    expect(resolveTasksView({ view: "board" }, "list")).toBe("list");
    expect(resolveTasksView({ view: "board" }, "calendar")).toBe("calendar");
  });

  it("knows when the URL alone decides (so the preference need not be read)", () => {
    expect(urlDecidesView({})).toBe(false);
    expect(urlDecidesView({ view: "board" })).toBe(false);
    expect(urlDecidesView({ view: "list" })).toBe(true);
    expect(urlDecidesView({ status: "open" })).toBe(true);
    expect(urlDecidesView({ due: "today" })).toBe(true);
  });
});

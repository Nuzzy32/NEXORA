import { describe, expect, it } from "vitest";
import { buildActivity, type ActivitySources } from "@/features/activity/feed";

const empty: ActivitySources = { doneTasks: [], newTasks: [], projects: [], notes: [], memory: [], documents: [] };

describe("buildActivity", () => {
  it("merges sources newest first and caps the list", () => {
    const items = buildActivity(
      {
        ...empty,
        doneTasks: [{ id: "t1", title: "Selesai", completed_at: "2026-10-13T05:00:00Z" }],
        documents: [{ id: "d1", title: "Bab 1", created_at: "2026-10-13T06:00:00Z" }],
        newTasks: [{ id: "t2", title: "Baru", created_at: "2026-10-12T06:00:00Z" }],
      },
      2,
    );
    expect(items.map((i) => [i.verb, i.title])).toEqual([
      ["PDF diunggah", "Bab 1"],
      ["Task selesai", "Selesai"],
    ]);
    expect(items[0].href).toBe("/learning/d1");
  });

  it("says 'diperbarui' only when an item changed more than a minute after it was created", () => {
    const items = buildActivity({
      ...empty,
      memory: [
        { id: "m1", title: "A", created_at: "2026-10-13T05:00:00Z", updated_at: "2026-10-13T05:00:30Z" },
        { id: "m2", title: "B", created_at: "2026-10-13T05:00:00Z", updated_at: "2026-10-13T07:00:00Z" },
      ],
      notes: [{ id: "n1", title: "N", project_id: "p1", created_at: "2026-10-13T05:00:00Z", updated_at: "2026-10-13T05:00:00Z" }],
    });
    expect(items.map((i) => i.verb)).toEqual(["Memory diperbarui", "Memory disimpan", "Catatan ditambahkan"]);
    expect(items[2].href).toBe("/projects/p1?tab=notes");
  });
});

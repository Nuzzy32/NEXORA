import { describe, expect, it } from "vitest";
import { buildExport, EXPORT_TABLES, exportFilename, readAll, type ExportTable, type Row, type TableRead } from "@/features/settings/export";

const empty = (): Record<ExportTable, TableRead> =>
  Object.fromEntries(EXPORT_TABLES.map((t) => [t, { rows: [], truncated: false }])) as unknown as Record<ExportTable, TableRead>;
const rowsOf = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: i }));
/** A fake table with `total` rows behind an inclusive range, like PostgREST. */
const table = (total: number) => {
  const calls: [number, number][] = [];
  return { calls, fetch: async (from: number, to: number) => (calls.push([from, to]), rowsOf(total).slice(from, to + 1)) };
};

describe("buildExport", () => {
  const now = new Date("2026-10-11T03:04:05.000Z");

  it("has the versioned shape with every table, even empty ones", () => {
    const out = buildExport(now, empty());
    expect(out.version).toBe(1);
    expect(out.exported_at).toBe("2026-10-11T03:04:05.000Z");
    expect(Object.keys(out.data)).toEqual([...EXPORT_TABLES]);
    expect(out.truncated).toBe(false);
    expect(out.truncated_tables).toEqual([]);
    expect(out.counts.tasks).toBe(0);
  });

  it("drops user_id from every row and keeps the rest", () => {
    const reads = empty();
    reads.tasks = { rows: [{ id: "t1", user_id: "u1", title: "Tugas" }], truncated: false };
    reads.owner_settings = { rows: [{ user_id: "u1", brief_enabled: false }], truncated: false };
    const out = buildExport(now, reads);
    expect(out.data.tasks).toEqual([{ id: "t1", title: "Tugas" }]);
    expect(out.data.owner_settings).toEqual([{ brief_enabled: false }]);
    expect(JSON.stringify(out)).not.toContain("u1");
    expect(out.counts.tasks).toBe(1);
  });

  it("contains no env value even when secrets are set in the process", () => {
    const keys = { ANTHROPIC_API_KEY: "sk-ant-test-123", ELEARNING_ICAL_URL: "https://hebat.elearning.unair.ac.id/token-xyz" };
    Object.assign(process.env, keys);
    try {
      const json = JSON.stringify(buildExport(now, empty()));
      for (const v of Object.values(keys)) expect(json).not.toContain(v);
      expect(json).not.toMatch(/ANTHROPIC|ELEARNING_ICAL|service_role/i);
    } finally {
      for (const k of Object.keys(keys)) delete process.env[k];
    }
  });

  it("flags truncation and names the tables", () => {
    const reads = empty();
    reads.messages = { rows: rowsOf(2), truncated: true };
    const out = buildExport(now, reads);
    expect(out.truncated).toBe(true);
    expect(out.truncated_tables).toEqual(["messages"]);
  });

  it("names the file by day", () => {
    expect(exportFilename("2026-10-11")).toBe("nexora-export-2026-10-11.json");
  });
});

describe("readAll", () => {
  it("reads page by page until a short page", async () => {
    const t = table(2500);
    const r = await readAll(t.fetch);
    expect(r.rows).toHaveLength(2500);
    expect(r.truncated).toBe(false);
    expect(t.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("needs one more request when the total is an exact multiple of the page", async () => {
    const t = table(2000);
    expect((await readAll(t.fetch)).rows).toHaveLength(2000);
    expect(t.calls.at(-1)).toEqual([2000, 2999]);
  });

  it("handles an empty table", async () => {
    expect(await readAll(table(0).fetch)).toEqual({ rows: [], truncated: false });
  });

  it("stops at the limit and says so when there is more", async () => {
    const t = table(25);
    const r = await readAll(t.fetch, { pageSize: 10, max: 20 });
    expect(r.rows).toHaveLength(20);
    expect(r.truncated).toBe(true);
    expect(t.calls).toEqual([[0, 9], [10, 19], [20, 20]]);
  });

  it("is not truncated when the table holds exactly the limit", async () => {
    const r = await readAll(table(20).fetch, { pageSize: 10, max: 20 });
    expect(r.rows).toHaveLength(20);
    expect(r.truncated).toBe(false);
  });

  it("propagates a failed page instead of returning a partial table", async () => {
    await expect(readAll(async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
  });
});

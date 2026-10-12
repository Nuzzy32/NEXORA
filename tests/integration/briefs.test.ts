import { beforeEach, describe, expect, it } from "vitest";
import { A, B, createDb } from "./helpers";

let db: Awaited<ReturnType<typeof createDb>>["db"];
let as: Awaited<ReturnType<typeof createDb>>["as"];

beforeEach(async () => {
  ({ db, as } = await createDb());
});

const content = JSON.stringify({ headline: "H", projects: [], watch: [] });
const addBrief = (user: string, o: { date?: string; content?: string; model?: string; input?: number; output?: number; refresh?: number } = {}) =>
  as(
    user,
    "insert into public.daily_briefs (brief_date, content, model, input_tokens, output_tokens, refresh_count) values ($1, $2::jsonb, $3, $4, $5, $6) returning id, user_id, refresh_count",
    [o.date ?? "2026-10-11", o.content ?? content, o.model ?? "claude-haiku-5-5", o.input ?? 1200, o.output ?? 400, o.refresh ?? 0],
  );

describe("daily_briefs", () => {
  it("fills user_id and is invisible to other users", async () => {
    expect((await addBrief(A)).rows[0]).toMatchObject({ user_id: A, refresh_count: 0 });
    expect((await as(B, "select id from public.daily_briefs")).rows).toHaveLength(0);
  });

  it("blocks cross-user update, delete, forged insert and ownership transfer", async () => {
    const id = (await addBrief(A)).rows[0].id;
    expect((await as(B, "update public.daily_briefs set model = 'x' where id = $1 returning id", [id])).rows).toHaveLength(0);
    expect((await as(B, "delete from public.daily_briefs where id = $1 returning id", [id])).rows).toHaveLength(0);
    await expect(
      as(B, "insert into public.daily_briefs (user_id, brief_date, content, model, input_tokens, output_tokens) values ($1, '2026-10-12', '{}', 'm', 1, 1)", [A]),
    ).rejects.toThrow(/row-level security/);
    await expect(as(A, "update public.daily_briefs set user_id = $2 where id = $1", [id, B])).rejects.toThrow(/row-level security/);
    expect((await as(A, "select model from public.daily_briefs where id = $1", [id])).rows[0].model).toBe("claude-haiku-5-5");
  });

  it("lets the owner upsert one row per day and keeps other days separate", async () => {
    await addBrief(A);
    await expect(addBrief(A)).rejects.toThrow(/unique|duplicate/);
    await as(
      A,
      `insert into public.daily_briefs (brief_date, content, model, input_tokens, output_tokens, refresh_count)
       values ('2026-10-11', '{"headline":"baru"}', 'claude-haiku-5-5', 1, 1, 1)
       on conflict (user_id, brief_date) do update set content = excluded.content, refresh_count = excluded.refresh_count`,
    );
    const { rows } = await as(A, "select content->>'headline' as h, refresh_count from public.daily_briefs");
    expect(rows).toEqual([{ h: "baru", refresh_count: 1 }]);
    await addBrief(A, { date: "2026-10-12" });
    await addBrief(B); // another owner may have a brief for the same day
    expect((await as(A, "select id from public.daily_briefs")).rows).toHaveLength(2);
  });

  it("rejects an upsert that targets another user's row (RLS on the update path)", async () => {
    await addBrief(A);
    await expect(
      as(
        B,
        `insert into public.daily_briefs (user_id, brief_date, content, model, input_tokens, output_tokens)
         values ($1, '2026-10-11', '{}', 'm', 1, 1)
         on conflict (user_id, brief_date) do update set content = excluded.content`,
        [A],
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("enforces the content shape and limits", async () => {
    await expect(addBrief(A, { content: "[]" })).rejects.toThrow(/check/);
    await expect(addBrief(A, { content: '"teks"' })).rejects.toThrow(/check/);
    await expect(addBrief(A, { content: JSON.stringify({ headline: "x".repeat(30001) }) })).rejects.toThrow(/check/);
    await expect(addBrief(A, { model: "" })).rejects.toThrow(/check/);
    await expect(addBrief(A, { input: -1 })).rejects.toThrow(/check/);
    await expect(addBrief(A, { output: -1 })).rejects.toThrow(/check/);
    await expect(as(A, "insert into public.daily_briefs (brief_date, content, model, input_tokens, output_tokens) values (null, '{}', 'm', 1, 1)")).rejects.toThrow(/null/);
  });

  it("caps forced refreshes at 5 per day in the database too", async () => {
    await addBrief(A, { refresh: 5 });
    await expect(addBrief(A, { date: "2026-10-12", refresh: 6 })).rejects.toThrow(/check/);
  });

  it("rejects anon: no grants", async () => {
    await addBrief(A);
    await expect(db.exec("set role anon; select * from public.daily_briefs")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
    await expect(
      db.exec("set role anon; insert into public.daily_briefs (brief_date, content, model, input_tokens, output_tokens) values ('2026-10-11', '{}', 'm', 1, 1)"),
    ).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });

  it("is removed with its user", async () => {
    await addBrief(A);
    await db.exec(`delete from auth.users where id = '${A}'`);
    expect((await db.query("select id from public.daily_briefs")).rows).toHaveLength(0);
  });
});

describe("owner_settings", () => {
  const enable = (user: string) =>
    as(user, "insert into public.owner_settings (brief_enabled, brief_consented_at) values (true, now()) returning user_id, brief_enabled");

  it("defaults to disabled, fills user_id and is invisible to other users", async () => {
    expect((await as(A, "insert into public.owner_settings default values returning user_id, brief_enabled, brief_consented_at")).rows[0]).toEqual({
      user_id: A,
      brief_enabled: false,
      brief_consented_at: null,
    });
    expect((await as(B, "select user_id from public.owner_settings")).rows).toHaveLength(0);
  });

  it("cannot be enabled without a consent timestamp", async () => {
    await expect(as(A, "insert into public.owner_settings (brief_enabled) values (true)")).rejects.toThrow(/check/);
    await enable(A);
    await expect(as(A, "update public.owner_settings set brief_consented_at = null")).rejects.toThrow(/check/);
    // turning off with the consent cleared is allowed
    await as(A, "update public.owner_settings set brief_enabled = false, brief_consented_at = null");
  });

  it("allows one row per user", async () => {
    await enable(A);
    await expect(enable(A)).rejects.toThrow(/unique|duplicate/);
    await enable(B);
  });

  it("blocks cross-user read, update and forged insert", async () => {
    await enable(A);
    expect((await as(B, "update public.owner_settings set brief_enabled = false where user_id = $1 returning user_id", [A])).rows).toHaveLength(0);
    await expect(as(B, "insert into public.owner_settings (user_id) values ($1)", [A])).rejects.toThrow(/row-level security/);
    await expect(as(A, "update public.owner_settings set user_id = $1", [B])).rejects.toThrow(/row-level security/);
    expect((await as(A, "select brief_enabled from public.owner_settings")).rows[0].brief_enabled).toBe(true);
  });

  it("keeps updated_at moving on change", async () => {
    await enable(A);
    const before = (await as(A, "select updated_at from public.owner_settings")).rows[0].updated_at as Date;
    await new Promise((r) => setTimeout(r, 20));
    await as(A, "update public.owner_settings set brief_enabled = false, brief_consented_at = null");
    const after = (await as(A, "select updated_at from public.owner_settings")).rows[0].updated_at as Date;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
  });

  it("rejects anon: no grants", async () => {
    await enable(A);
    await expect(db.exec("set role anon; select * from public.owner_settings")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
    await expect(db.exec("set role anon; insert into public.owner_settings default values")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });

  it("cannot be deleted by the app role (no delete grant)", async () => {
    await enable(A);
    await expect(as(A, "delete from public.owner_settings")).rejects.toThrow(/permission denied/);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { DELETE_PLANS, SETTINGS_RESET } from "@/features/settings/delete";
import type { DeleteCategory } from "@/features/settings/schema";
import { A, B, createDb } from "./helpers";

let as: Awaited<ReturnType<typeof createDb>>["as"];

beforeEach(async () => {
  ({ as } = await createDb());
});

describe("owner_settings.default_tasks_view", () => {
  it("defaults to calendar, also on rows created before the column existed", async () => {
    const r = await as(A, "insert into public.owner_settings default values returning default_tasks_view");
    expect(r.rows[0].default_tasks_view).toBe("calendar");
  });

  it("rejects values other than calendar and list", async () => {
    await expect(as(A, "insert into public.owner_settings (default_tasks_view) values ('board')")).rejects.toThrow(/check/);
    await expect(as(A, "insert into public.owner_settings (default_tasks_view) values (null)")).rejects.toThrow(/null/);
    await as(A, "insert into public.owner_settings default values");
    await expect(as(A, "update public.owner_settings set default_tasks_view = 'week'")).rejects.toThrow(/check/);
    await as(A, "update public.owner_settings set default_tasks_view = 'list'");
    expect((await as(A, "select default_tasks_view from public.owner_settings")).rows[0].default_tasks_view).toBe("list");
  });

  it("is private: another user can neither read nor change it", async () => {
    await as(A, "insert into public.owner_settings (default_tasks_view) values ('list')");
    expect((await as(B, "select default_tasks_view from public.owner_settings")).rows).toHaveLength(0);
    expect((await as(B, "update public.owner_settings set default_tasks_view = 'calendar' where user_id = $1 returning user_id", [A])).rows).toHaveLength(0);
    await expect(
      as(B, "insert into public.owner_settings (user_id, default_tasks_view) values ($1, 'list')", [A]),
    ).rejects.toThrow(/row-level security/);
    expect((await as(A, "select default_tasks_view from public.owner_settings")).rows[0].default_tasks_view).toBe("list");
  });

  it("is saved by an upsert that leaves the brief consent alone", async () => {
    await as(A, "insert into public.owner_settings (brief_enabled, brief_consented_at) values (true, now())");
    // the shape savePrefs sends: user_id and the preference column only
    await as(
      A,
      `insert into public.owner_settings (user_id, default_tasks_view) values ($1, 'list')
       on conflict (user_id) do update set default_tasks_view = excluded.default_tasks_view`,
      [A],
    );
    const { rows } = await as(A, "select brief_enabled, brief_consented_at is not null as consented, default_tasks_view from public.owner_settings");
    expect(rows).toEqual([{ brief_enabled: true, consented: true, default_tasks_view: "list" }]);
    // and it creates the row when there is none yet
    await as(
      B,
      `insert into public.owner_settings (user_id, default_tasks_view) values ($1, 'list')
       on conflict (user_id) do update set default_tasks_view = excluded.default_tasks_view`,
      [B],
    );
    expect((await as(B, "select brief_enabled, default_tasks_view from public.owner_settings")).rows).toEqual([{ brief_enabled: false, default_tasks_view: "list" }]);
  });
});

// ---- deleting by category ------------------------------------------------------

async function seed(user: string, tag: string) {
  const project = (await as(user, "insert into public.projects (name) values ($1) returning id", [tag])).rows[0].id as string;
  await as(user, "insert into public.tasks (title, project_id) values ($1, $2)", [`${tag} manual`, project]);
  await as(
    user,
    "insert into public.tasks (title, source, external_id, due_date) values ($1, 'elearning', $2, '2026-10-20')",
    [`${tag} kuliah`, `${tag}-ev1`],
  );
  await as(user, "insert into public.project_notes (project_id, title, body) values ($1, 'catatan', 'isi')", [project]);
  await as(user, "insert into public.memory_items (title, content, category) values ($1, 'isi', 'decision')", [tag]);
  const conv = (await as(user, "insert into public.conversations (title) values ($1) returning id", [tag])).rows[0].id as string;
  await as(user, "insert into public.messages (conversation_id, role, content) values ($1, 'user', 'halo')", [conv]);
  await as(
    user,
    "insert into public.daily_briefs (brief_date, content, model, input_tokens, output_tokens) values ('2026-10-11', '{}', 'm', 1, 1)",
  );
  await as(user, "insert into public.integration_syncs (source, last_status) values ('elearning', 'ok')");
  await as(user, "insert into public.owner_settings (brief_enabled, brief_consented_at, default_tasks_view) values (true, now(), 'list')");
}

const TABLES = ["projects", "tasks", "project_notes", "memory_items", "conversations", "messages", "daily_briefs", "integration_syncs", "owner_settings"];
async function counts(user: string) {
  const out: Record<string, number> = {};
  for (const t of TABLES) out[t] = (await as(user, `select count(*)::int as n from public.${t}`)).rows[0].n as number;
  return out;
}

/** Replays the action's steps as SQL under RLS, like the Supabase client does (delete, optional eq, count). */
async function runPlan(user: string, category: DeleteCategory) {
  for (const s of DELETE_PLANS[category]) {
    await as(user, `delete from public.${s.table} where ${s.eq ? `${s.eq[0]} = $1` : `${s.key} is not null`}`, s.eq ? [s.eq[1]] : []);
  }
  if (category === "all") {
    const cols = Object.keys(SETTINGS_RESET);
    await as(user, `update public.owner_settings set ${cols.map((c, i) => `${c} = $${i + 1}`).join(", ")} where user_id = $${cols.length + 1}`, [
      ...Object.values(SETTINGS_RESET),
      user,
    ]);
  }
}

describe("deleting by category (RLS applies)", () => {
  beforeEach(async () => {
    await seed(A, "a");
    await seed(B, "b");
  });

  const only = (before: Record<string, number>, changed: Record<string, number>) => ({ ...before, ...changed });

  it("memory: removes only the caller's memory and nothing else", async () => {
    const [a0, b0] = [await counts(A), await counts(B)];
    await runPlan(A, "memory");
    expect(await counts(A)).toEqual(only(a0, { memory_items: 0 }));
    expect(await counts(B)).toEqual(b0);
  });

  it("conversations: removes the conversations and their messages", async () => {
    const [a0, b0] = [await counts(A), await counts(B)];
    await runPlan(A, "conversations");
    expect(await counts(A)).toEqual(only(a0, { conversations: 0, messages: 0 }));
    expect(await counts(B)).toEqual(b0);
  });

  it("briefs: removes briefs only and leaves the brief settings alone", async () => {
    const [a0, b0] = [await counts(A), await counts(B)];
    await runPlan(A, "briefs");
    expect(await counts(A)).toEqual(only(a0, { daily_briefs: 0 }));
    expect(await counts(B)).toEqual(b0);
    expect((await as(A, "select brief_enabled from public.owner_settings")).rows[0].brief_enabled).toBe(true);
  });

  it("elearning: removes imported tasks only, keeping manual tasks", async () => {
    const [a0, b0] = [await counts(A), await counts(B)];
    await runPlan(A, "elearning");
    expect(await counts(A)).toEqual(only(a0, { tasks: 1 }));
    expect((await as(A, "select title from public.tasks")).rows).toEqual([{ title: "a manual" }]);
    expect(await counts(B)).toEqual(b0);
  });

  it("all: empties the caller's data, resets settings, keeps the settings row, spares the other user", async () => {
    const b0 = await counts(B);
    await runPlan(A, "all");
    expect(await counts(A)).toEqual({
      projects: 0, tasks: 0, project_notes: 0, memory_items: 0, conversations: 0, messages: 0, daily_briefs: 0, integration_syncs: 0, owner_settings: 1,
    });
    expect((await as(A, "select brief_enabled, brief_consented_at, default_tasks_view from public.owner_settings")).rows).toEqual([
      { brief_enabled: false, brief_consented_at: null, default_tasks_view: "calendar" },
    ]);
    expect(await counts(B)).toEqual(b0);
    expect((await as(B, "select brief_enabled, default_tasks_view from public.owner_settings")).rows).toEqual([{ brief_enabled: true, default_tasks_view: "list" }]);
  });

  it("memory linked to a deleted project survives with the link cleared when only projects go", async () => {
    // guards the ordering rule: the all plan deletes memory before projects, but FK set null must hold regardless
    const project = (await as(A, "select id from public.projects")).rows[0].id as string;
    await as(A, "insert into public.memory_items (title, content, category, project_id) values ('linked', 'x', 'decision', $1)", [project]);
    await as(A, "delete from public.projects where id = $1", [project]);
    expect((await as(A, "select project_id from public.memory_items where title = 'linked'")).rows[0].project_id).toBeNull();
  });
});

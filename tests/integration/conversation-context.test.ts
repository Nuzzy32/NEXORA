import { beforeEach, describe, expect, it } from "vitest";
import { A, B, createDb } from "./helpers";

let db: Awaited<ReturnType<typeof createDb>>["db"];
let as: Awaited<ReturnType<typeof createDb>>["as"];

beforeEach(async () => {
  ({ db, as } = await createDb());
});

const conversation = async (user: string) =>
  (await as(user, "insert into public.conversations default values returning id")).rows[0].id as string;
const memory = async (user: string, title = "Arsitektur") =>
  (await as(user, "insert into public.memory_items (title, content) values ($1, 'isi') returning id", [title])).rows[0].id as string;
const project = async (user: string, name = "Nexora") =>
  (await as(user, "insert into public.projects (name) values ($1) returning id", [name])).rows[0].id as string;
const attach = (user: string, conversationId: string, kind: string, refId: string) =>
  as(user, "insert into public.conversation_context (conversation_id, kind, ref_id) values ($1, $2, $3) returning id, user_id", [
    conversationId, kind, refId,
  ]);
const rowsOf = async (user: string) => (await as(user, "select kind, ref_id from public.conversation_context order by created_at, id")).rows;

describe("conversation_context", () => {
  it("fills user_id and keeps rows invisible to other users", async () => {
    const c = await conversation(A);
    const m = await memory(A);
    expect((await attach(A, c, "memory", m)).rows[0].user_id).toBe(A);
    expect(await rowsOf(A)).toEqual([{ kind: "memory", ref_id: m }]);
    expect(await rowsOf(B)).toHaveLength(0);
  });

  it("accepts both kinds and rejects an unknown kind", async () => {
    const c = await conversation(A);
    await attach(A, c, "memory", await memory(A));
    await attach(A, c, "project", await project(A));
    await expect(attach(A, c, "note", await memory(A, "Lain"))).rejects.toThrow(/check/);
  });

  it("allows an item once per conversation, and the same item in another conversation", async () => {
    const c1 = await conversation(A);
    const c2 = await conversation(A);
    const m = await memory(A);
    await attach(A, c1, "memory", m);
    await expect(attach(A, c1, "memory", m)).rejects.toThrow(/unique|duplicate/);
    await attach(A, c2, "memory", m);
  });

  it("allows at most 10 items per conversation and frees a slot when one is removed", async () => {
    const c = await conversation(A);
    const other = await conversation(A);
    for (let i = 0; i < 6; i++) await attach(A, c, "memory", await memory(A, `m${i}`));
    for (let i = 0; i < 4; i++) await attach(A, c, "project", await project(A, `p${i}`));
    await expect(attach(A, c, "memory", await memory(A, "ke-11"))).rejects.toThrow(/at most 10/);
    // the limit is per conversation
    await attach(A, other, "memory", await memory(A, "di-lain"));
    await as(A, "delete from public.conversation_context where id = (select id from public.conversation_context where conversation_id = $1 limit 1)", [c]);
    await attach(A, c, "memory", await memory(A, "ke-11-lagi"));
  });

  it("rejects a conversation that is not the user's (composite FK) and a spoofed owner (RLS)", async () => {
    const cB = await conversation(B);
    const mA = await memory(A);
    await expect(attach(A, cB, "memory", mA)).rejects.toThrow(/foreign key/);
    await expect(
      as(A, "insert into public.conversation_context (conversation_id, user_id, kind, ref_id) values ($1, $2, 'memory', $3)", [cB, B, mA]),
    ).rejects.toThrow(/row-level security|not found/); // the guard trigger fires before the RLS check
  });

  it("rejects an item that does not exist or belongs to someone else", async () => {
    const c = await conversation(A);
    await expect(attach(A, c, "memory", "00000000-0000-4000-8000-0000000000ff")).rejects.toThrow(/memory item not found/);
    await expect(attach(A, c, "memory", await memory(B))).rejects.toThrow(/memory item not found/);
    await expect(attach(A, c, "project", await project(B))).rejects.toThrow(/project not found/);
    // a project id under kind memory (and the reverse) is not found either
    await expect(attach(A, c, "memory", await project(A))).rejects.toThrow(/memory item not found/);
    await expect(attach(A, c, "project", await memory(A))).rejects.toThrow(/project not found/);
    expect(await rowsOf(A)).toHaveLength(0);
  });

  it("blocks cross-user delete, and has no UPDATE at all", async () => {
    const c = await conversation(A);
    const m = await memory(A);
    const id = (await attach(A, c, "memory", m)).rows[0].id;
    expect((await as(B, "delete from public.conversation_context where id = $1 returning id", [id])).rows).toHaveLength(0);
    await expect(as(A, "update public.conversation_context set kind = 'project' where id = $1", [id])).rejects.toThrow(/permission denied/);
    await expect(as(A, "update public.conversation_context set user_id = $2 where id = $1", [id, B])).rejects.toThrow(/permission denied/);
    expect(await rowsOf(A)).toHaveLength(1);
  });

  it("is deleted with its conversation", async () => {
    const c = await conversation(A);
    await attach(A, c, "memory", await memory(A));
    await attach(A, c, "project", await project(A));
    await as(A, "delete from public.conversations where id = $1", [c]);
    expect(await rowsOf(A)).toHaveLength(0);
  });

  it("forgets an item when its memory or project is deleted, in every conversation", async () => {
    const c1 = await conversation(A);
    const c2 = await conversation(A);
    const m = await memory(A);
    const p = await project(A);
    const keep = await memory(A, "tetap");
    await attach(A, c1, "memory", m);
    await attach(A, c2, "memory", m);
    await attach(A, c1, "project", p);
    await attach(A, c1, "memory", keep);
    await as(A, "delete from public.memory_items where id = $1", [m]);
    await as(A, "delete from public.projects where id = $1", [p]);
    expect(await rowsOf(A)).toEqual([{ kind: "memory", ref_id: keep }]);
  });

  it("refuses anon", async () => {
    const c = await conversation(A);
    await attach(A, c, "memory", await memory(A));
    await expect(
      db.transaction(async (tx) => {
        await tx.query("set local role anon");
        await tx.query("select * from public.conversation_context");
      }),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("messages.context", () => {
  const post = (user: string, c: string, role: string, context: unknown) =>
    as(
      user,
      "insert into public.messages (conversation_id, role, content, context) values ($1, $2, 'x', $3::jsonb) returning id, context",
      [c, role, context === null ? null : JSON.stringify(context)],
    );
  const good = { items: [{ kind: "memory", title: "Arsitektur" }, { kind: "project", title: "Nexora" }], chars: 321 };

  it("is optional and keeps a valid snapshot as written", async () => {
    const c = await conversation(A);
    expect((await post(A, c, "user", null)).rows[0].context).toBeNull();
    expect((await post(A, c, "user", good)).rows[0].context).toEqual(good);
    expect((await post(A, c, "user", { ...good, truncated: true })).rows[0].context).toMatchObject({ truncated: true });
  });

  it("rejects shapes that are not {items: [{kind, title}], chars}", async () => {
    const c = await conversation(A);
    const bad: unknown[] = [
      [],
      "teks",
      {},
      { items: [], chars: 0 },
      { items: "x", chars: 1 },
      { items: { kind: "memory", title: "t" }, chars: 1 },
      { items: good.items },
      { items: good.items, chars: "1" },
      { items: [{ kind: "note", title: "t" }], chars: 1 },
      { items: [{ kind: "memory" }], chars: 1 },
      { items: [{ kind: "memory", title: 5 }], chars: 1 },
      { items: [...good.items, { kind: "memory", title: "rusak" }, { kind: "x", title: "t" }], chars: 1 },
      { items: Array.from({ length: 11 }, () => ({ kind: "memory", title: "t" })), chars: 1 },
      { items: [{ kind: "memory", title: "x".repeat(9000) }], chars: 1 },
    ];
    for (const context of bad) await expect(post(A, c, "user", context), JSON.stringify(context).slice(0, 80)).rejects.toThrow(/check/);
  });

  it("is only for user messages", async () => {
    const c = await conversation(A);
    await expect(post(A, c, "assistant", good)).rejects.toThrow(/check/);
  });

  it("does not hold the attached text, and survives the source being edited or deleted", async () => {
    const c = await conversation(A);
    const m = await memory(A, "Arsitektur");
    const id = (await post(A, c, "user", { items: [{ kind: "memory", title: "Arsitektur" }], chars: 40 })).rows[0].id;
    await as(A, "update public.memory_items set content = 'berubah' where id = $1", [m]);
    await as(A, "delete from public.memory_items where id = $1", [m]);
    const { rows } = await as(A, "select context from public.messages where id = $1", [id]);
    expect(JSON.stringify(rows[0].context)).not.toContain("isi");
    expect(rows[0].context).toEqual({ items: [{ kind: "memory", title: "Arsitektur" }], chars: 40 });
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { A, B, createDb } from "./helpers";

let db: Awaited<ReturnType<typeof createDb>>["db"];
let as: Awaited<ReturnType<typeof createDb>>["as"];

beforeEach(async () => {
  ({ db, as } = await createDb());
});

const addConversation = async (user: string, title?: string) =>
  (
    title === undefined
      ? await as(user, "insert into public.conversations default values returning id")
      : await as(user, "insert into public.conversations (title) values ($1) returning id", [title])
  ).rows[0].id as string;

const addMessage = (user: string, conversationId: string, role: string, content: string) =>
  as(user, "insert into public.messages (conversation_id, role, content) values ($1, $2, $3) returning id, user_id", [
    conversationId, role, content,
  ]);

describe("conversations", () => {
  it("fills user_id and the default title, and is invisible to other users", async () => {
    const id = await addConversation(A);
    const { rows } = await as(A, "select user_id, title from public.conversations where id = $1", [id]);
    expect(rows[0]).toEqual({ user_id: A, title: "Percakapan baru" });
    expect((await as(B, "select id from public.conversations")).rows).toHaveLength(0);
  });

  it("blocks cross-user update, delete and ownership transfer", async () => {
    const id = await addConversation(A, "milik A");
    expect((await as(B, "update public.conversations set title = 'hack' where id = $1 returning id", [id])).rows).toHaveLength(0);
    expect((await as(B, "delete from public.conversations where id = $1 returning id", [id])).rows).toHaveLength(0);
    await expect(as(A, "update public.conversations set user_id = $2 where id = $1", [id, B])).rejects.toThrow(/row-level security/);
    await expect(as(B, "insert into public.conversations (user_id, title) values ($1, 'x')", [A])).rejects.toThrow(/row-level security/);
  });

  it("enforces the title limits", async () => {
    await expect(addConversation(A, "")).rejects.toThrow(/check/);
    await expect(addConversation(A, "x".repeat(201))).rejects.toThrow(/check/);
    await addConversation(A, "x".repeat(200));
  });

  it("lets the owner rename (UPDATE has USING and WITH CHECK)", async () => {
    const id = await addConversation(A);
    const { rows } = await as(A, "update public.conversations set title = 'Baru' where id = $1 returning title", [id]);
    expect(rows).toEqual([{ title: "Baru" }]);
  });
});

describe("messages", () => {
  it("fills user_id, orders by time, and is invisible to other users", async () => {
    const c = await addConversation(A);
    expect((await addMessage(A, c, "user", "halo")).rows[0].user_id).toBe(A);
    await addMessage(A, c, "assistant", "hai");
    expect((await as(A, "select role from public.messages order by created_at, id")).rows.map((r) => r.role).sort()).toEqual(["assistant", "user"]);
    expect((await as(B, "select id from public.messages")).rows).toHaveLength(0);
  });

  it("rejects a message in another user's conversation (composite FK)", async () => {
    const cB = await addConversation(B);
    await expect(addMessage(A, cB, "user", "x")).rejects.toThrow(/foreign key/);
    // even when spoofing the owner, RLS refuses
    await expect(
      as(A, "insert into public.messages (conversation_id, user_id, role, content) values ($1, $2, 'user', 'x')", [cB, B]),
    ).rejects.toThrow(/row-level security/);
  });

  it("rejects an invalid role and over-long or empty content", async () => {
    const c = await addConversation(A);
    await expect(addMessage(A, c, "bot", "x")).rejects.toThrow(/check/);
    await expect(addMessage(A, c, "user", "")).rejects.toThrow(/check/);
    await expect(addMessage(A, c, "user", "y".repeat(32001))).rejects.toThrow(/check/);
    await addMessage(A, c, "system", "y".repeat(32000));
  });

  it("keeps error status consistent: only assistant replies, with a reason", async () => {
    const c = await addConversation(A);
    const failed = (role: string, error: string | null) =>
      as(A, "insert into public.messages (conversation_id, role, content, status, error) values ($1, $2, '', 'error', $3)", [c, role, error]);
    await failed("assistant", "Provider gagal");
    await expect(failed("user", "x")).rejects.toThrow(/check/);
    await expect(failed("assistant", null)).rejects.toThrow(/check/);
    // a complete message must not carry an error, and the status must be known
    await expect(
      as(A, "insert into public.messages (conversation_id, role, content, error) values ($1, 'assistant', 'ok', 'x')", [c]),
    ).rejects.toThrow(/check/);
    await expect(
      as(A, "insert into public.messages (conversation_id, role, content, status) values ($1, 'assistant', 'x', 'pending')", [c]),
    ).rejects.toThrow(/check/);
  });

  it("lets the owner fill in a failed reply (retry) but never edit their own user message", async () => {
    const c = await addConversation(A);
    const userMsg = (await addMessage(A, c, "user", "halo")).rows[0].id;
    const failedId = (
      await as(A, "insert into public.messages (conversation_id, role, status, error) values ($1, 'assistant', 'error', 'gagal') returning id", [c])
    ).rows[0].id;
    const retried = await as(
      A,
      "update public.messages set content = 'berhasil', status = 'complete', error = null, model = 'm' where id = $1 returning status, content",
      [failedId],
    );
    expect(retried.rows).toEqual([{ status: "complete", content: "berhasil" }]);
    expect((await as(A, "update public.messages set content = 'ubah' where id = $1 returning id", [userMsg])).rows).toHaveLength(0);
  });

  it("blocks cross-user update, delete and ownership transfer", async () => {
    const c = await addConversation(A);
    const id = (await addMessage(A, c, "assistant", "milik A")).rows[0].id;
    expect((await as(B, "update public.messages set content = 'hack' where id = $1 returning id", [id])).rows).toHaveLength(0);
    expect((await as(B, "delete from public.messages where id = $1 returning id", [id])).rows).toHaveLength(0);
    await expect(as(A, "update public.messages set user_id = $2 where id = $1", [id, B])).rejects.toThrow(/row-level security|foreign key/);
  });

  it("is deleted with its conversation", async () => {
    const c = await addConversation(A);
    await addMessage(A, c, "user", "a");
    await addMessage(A, c, "assistant", "b");
    await as(A, "delete from public.conversations where id = $1", [c]);
    expect((await as(A, "select id from public.messages")).rows).toHaveLength(0);
  });

  it("moves the conversation to the top of the history when a message arrives", async () => {
    const first = await addConversation(A, "pertama");
    await addConversation(A, "kedua");
    await db.exec("update public.conversations set updated_at = now() - interval '1 day'");
    await addMessage(A, first, "user", "baru");
    const { rows } = await as(A, "select title from public.conversations order by updated_at desc");
    expect(rows[0]).toEqual({ title: "pertama" });
  });
});

describe("anon access", () => {
  it("is refused on both tables", async () => {
    const c = await addConversation(A);
    await addMessage(A, c, "user", "rahasia");
    for (const table of ["conversations", "messages"]) {
      await expect(db.transaction(async (tx) => {
        await tx.query("set local role anon");
        await tx.query(`select * from public.${table}`);
      })).rejects.toThrow(/permission denied/);
    }
    await expect(db.transaction(async (tx) => {
      await tx.query("set local role anon");
      await tx.query("insert into public.conversations (user_id) values ($1)", [A]);
    })).rejects.toThrow(/permission denied/);
  });
});

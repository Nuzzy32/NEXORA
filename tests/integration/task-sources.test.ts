import { beforeEach, describe, expect, it } from "vitest";
import { A, B, createDb } from "./helpers";

let as: Awaited<ReturnType<typeof createDb>>["as"];

beforeEach(async () => {
  ({ as } = await createDb());
});

const addSynced = (user: string, externalId: string, title = "Tugas 1 is due") =>
  as(
    user,
    "insert into public.tasks (title, source, external_id, external_hash) values ($1, 'elearning', $2, 'h') returning id",
    [title, externalId],
  );

describe("tasks.source / external_id", () => {
  it("leaves ordinary tasks untouched (both null)", async () => {
    await as(A, "insert into public.tasks (title) values ('biasa')");
    const { rows } = await as(A, "select source, external_id from public.tasks");
    expect(rows).toEqual([{ source: null, external_id: null }]);
  });

  it("requires source and external_id together", async () => {
    await expect(as(A, "insert into public.tasks (title, source) values ('x', 'elearning')")).rejects.toThrow(/check/);
    await expect(as(A, "insert into public.tasks (title, external_id) values ('x', 'u1')")).rejects.toThrow(/check/);
    await expect(as(A, "insert into public.tasks (title, source, external_id) values ('x', 'moodle', 'u1')")).rejects.toThrow(/check/);
    await expect(as(A, "insert into public.tasks (title, source, external_id) values ('x', 'elearning', '')")).rejects.toThrow(/check/);
  });

  it("makes a re-import idempotent: one task per (user, source, external_id)", async () => {
    await addSynced(A, "u1");
    await expect(addSynced(A, "u1")).rejects.toThrow(/unique|duplicate/);
    await addSynced(A, "u2");
    // another user may hold the same external id
    await addSynced(B, "u1");
    // tasks without a source are not constrained
    await as(A, "insert into public.tasks (title) values ('a'), ('a')");
  });

  it("keeps the existing RLS: other users cannot read or change synced tasks", async () => {
    const id = (await addSynced(A, "u1")).rows[0].id;
    expect((await as(B, "select id from public.tasks")).rows).toHaveLength(0);
    expect((await as(B, "update public.tasks set title = 'hack' where id = $1 returning id", [id])).rows).toHaveLength(0);
    expect((await as(B, "delete from public.tasks where id = $1 returning id", [id])).rows).toHaveLength(0);
    await expect(
      as(B, "insert into public.tasks (user_id, title, source, external_id) values ($1, 'x', 'elearning', 'z')", [A]),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("integration_syncs", () => {
  const record = (user: string, status = "ok", error: string | null = null) =>
    as(
      user,
      "insert into public.integration_syncs (source, last_status, created_count, updated_count, last_error) values ('elearning', $1, 2, 1, $2) returning user_id",
      [status, error],
    );

  it("fills user_id and keeps one row per user and source", async () => {
    expect((await record(A)).rows[0].user_id).toBe(A);
    await expect(record(A)).rejects.toThrow(/unique|duplicate/);
    await record(B);
  });

  it("only accepts a known source and status, and an error needs a reason", async () => {
    await expect(as(A, "insert into public.integration_syncs (source, last_status) values ('moodle', 'ok')")).rejects.toThrow(/check/);
    await expect(as(A, "insert into public.integration_syncs (source, last_status) values ('elearning', 'maybe')")).rejects.toThrow(/check/);
    await expect(record(A, "error", null)).rejects.toThrow(/check/);
    await expect(record(A, "ok", "kok ada galat")).rejects.toThrow(/check/);
    await expect(as(A, "insert into public.integration_syncs (source, last_status, created_count) values ('elearning', 'ok', -1)")).rejects.toThrow(/check/);
    await record(A, "error", "Tidak bisa mengambil kalender e-learning (HTTP 403)");
  });

  it("is invisible and immutable to other users", async () => {
    await record(A);
    expect((await as(B, "select * from public.integration_syncs")).rows).toHaveLength(0);
    expect((await as(B, "update public.integration_syncs set last_status = 'error', last_error = 'x' returning user_id")).rows).toHaveLength(0);
    expect((await as(B, "delete from public.integration_syncs returning user_id")).rows).toHaveLength(0);
    await expect(
      as(B, "insert into public.integration_syncs (user_id, source, last_status) values ($1, 'elearning', 'ok')", [A]),
    ).rejects.toThrow(/row-level security/);
    expect((await as(A, "select last_status from public.integration_syncs")).rows).toEqual([{ last_status: "ok" }]);
  });

  it("lets the owner update the row but not hand it to someone else (USING and WITH CHECK)", async () => {
    await record(A);
    const { rows } = await as(A, "update public.integration_syncs set last_status = 'error', last_error = 'galat' returning last_status");
    expect(rows).toEqual([{ last_status: "error" }]);
    await expect(as(A, "update public.integration_syncs set user_id = $1", [B])).rejects.toThrow(/row-level security/);
  });

  it("is closed to anon", async () => {
    const { db } = await createDb();
    await expect(
      db.transaction(async (tx) => {
        await tx.query("set local role anon");
        return tx.query("select * from public.integration_syncs");
      }),
    ).rejects.toThrow(/permission denied/);
  });
});

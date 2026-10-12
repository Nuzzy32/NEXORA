import { beforeEach, describe, expect, it } from "vitest";
import { A, B, createDb } from "./helpers";

let as: Awaited<ReturnType<typeof createDb>>["as"];

beforeEach(async () => {
  ({ as } = await createDb());
});

const addTask = (user: string, title: string) =>
  as(user, "insert into public.tasks (title) values ($1) returning id, user_id", [title]);

describe("tasks RLS", () => {
  it("fills user_id from the session and hides rows from other users", async () => {
    const { rows } = await addTask(A, "milik A");
    expect(rows[0].user_id).toBe(A);
    expect((await as(A, "select id from public.tasks")).rows).toHaveLength(1);
    expect((await as(B, "select id from public.tasks")).rows).toHaveLength(0);
  });

  it("blocks inserting a row for someone else", async () => {
    await expect(as(B, "insert into public.tasks (title, user_id) values ('x', $1)", [A])).rejects.toThrow(/row-level security/);
  });

  it("blocks update/delete of another user's row (0 rows affected)", async () => {
    const { rows } = await addTask(A, "milik A");
    const id = rows[0].id;
    expect((await as(B, "update public.tasks set title = 'hack' where id = $1 returning id", [id])).rows).toHaveLength(0);
    expect((await as(B, "delete from public.tasks where id = $1 returning id", [id])).rows).toHaveLength(0);
    expect((await as(A, "select title from public.tasks where id = $1", [id])).rows[0].title).toBe("milik A");
  });

  it("blocks handing a row over to another user (WITH CHECK)", async () => {
    const { rows } = await addTask(A, "milik A");
    await expect(as(A, "update public.tasks set user_id = $2 where id = $1", [rows[0].id, B])).rejects.toThrow(/row-level security/);
  });
});

describe("tasks integrity", () => {
  it("rejects a task pointing at another user's project", async () => {
    const p = await as(B, "insert into public.projects (name) values ('proyek B') returning id");
    await expect(as(A, "insert into public.tasks (title, project_id) values ('x', $1)", [p.rows[0].id])).rejects.toThrow(/foreign key/);
  });

  it("keeps the task and its owner when the project is deleted", async () => {
    const p = await as(A, "insert into public.projects (name) values ('P') returning id");
    const t = await as(A, "insert into public.tasks (title, project_id) values ('x', $1) returning id", [p.rows[0].id]);
    await as(A, "delete from public.projects where id = $1", [p.rows[0].id]);
    const { rows } = await as(A, "select project_id, user_id from public.tasks where id = $1", [t.rows[0].id]);
    expect(rows[0]).toEqual({ project_id: null, user_id: A });
  });

  it("requires completed_at exactly when status is done", async () => {
    await expect(as(A, "insert into public.tasks (title, status) values ('x', 'done')")).rejects.toThrow(/check/);
    await expect(as(A, "insert into public.tasks (title, completed_at) values ('x', now())")).rejects.toThrow(/check/);
    await as(A, "insert into public.tasks (title, status, completed_at) values ('x', 'done', now())");
  });

  it("enforces length and enum constraints", async () => {
    await expect(as(A, "insert into public.tasks (title) values ('')")).rejects.toThrow(/check/);
    await expect(as(A, "insert into public.tasks (title, priority) values ('x', 'urgent')")).rejects.toThrow(/check/);
  });

  it("bumps updated_at on update", async () => {
    const { rows } = await as(A, "insert into public.tasks (title) values ('x') returning id, updated_at");
    await new Promise((r) => setTimeout(r, 10));
    const upd = await as(A, "update public.tasks set title = 'y' where id = $1 returning updated_at", [rows[0].id]);
    expect(new Date(upd.rows[0].updated_at as string).getTime()).toBeGreaterThan(new Date(rows[0].updated_at as string).getTime());
  });
});

describe("projects", () => {
  it("is private per user and validates dates and status", async () => {
    await as(A, "insert into public.projects (name) values ('milik A')");
    expect((await as(B, "select id from public.projects")).rows).toHaveLength(0);
    await expect(as(A, "insert into public.projects (name, starts_on, due_on) values ('x', '2026-10-10', '2026-10-01')")).rejects.toThrow(/check/);
    await expect(as(A, "insert into public.projects (name, status) values ('x', 'bogus')")).rejects.toThrow(/check/);
  });
});

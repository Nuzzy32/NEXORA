import { beforeEach, describe, expect, it } from "vitest";
import { A, B, createDb } from "./helpers";

let as: Awaited<ReturnType<typeof createDb>>["as"];

beforeEach(async () => {
  ({ as } = await createDb());
});

const addProject = async (user: string, name = "P") =>
  (await as(user, "insert into public.projects (name) values ($1) returning id", [name])).rows[0].id as string;
const addNote = (user: string, projectId: string, title: string, body = "", kind = "note") =>
  as(user, "insert into public.project_notes (project_id, title, body, kind) values ($1, $2, $3, $4) returning id, user_id", [
    projectId, title, body, kind,
  ]);

describe("project_notes", () => {
  it("fills user_id and is invisible to other users", async () => {
    const p = await addProject(A);
    const { rows } = await addNote(A, p, "Catatan A");
    expect(rows[0].user_id).toBe(A);
    expect((await as(B, "select id from public.project_notes")).rows).toHaveLength(0);
  });

  it("rejects a note on another user's project", async () => {
    const pB = await addProject(B);
    await expect(addNote(A, pB, "x")).rejects.toThrow(/foreign key/);
  });

  it("blocks cross-user update, delete and ownership transfer", async () => {
    const p = await addProject(A);
    const id = (await addNote(A, p, "milik A")).rows[0].id;
    expect((await as(B, "update public.project_notes set title = 'hack' where id = $1 returning id", [id])).rows).toHaveLength(0);
    expect((await as(B, "delete from public.project_notes where id = $1 returning id", [id])).rows).toHaveLength(0);
    await expect(as(A, "update public.project_notes set user_id = $2 where id = $1", [id, B])).rejects.toThrow(/row-level security/);
  });

  it("is deleted with its project, while tasks survive", async () => {
    const p = await addProject(A);
    await addNote(A, p, "n");
    await as(A, "insert into public.tasks (title, project_id) values ('t', $1)", [p]);
    await as(A, "delete from public.projects where id = $1", [p]);
    expect((await as(A, "select id from public.project_notes")).rows).toHaveLength(0);
    expect((await as(A, "select id from public.tasks")).rows).toHaveLength(1);
  });

  it("enforces kind, title and body limits", async () => {
    const p = await addProject(A);
    await expect(addNote(A, p, "x", "", "idea")).rejects.toThrow(/check/);
    await expect(addNote(A, p, "")).rejects.toThrow(/check/);
    await expect(addNote(A, p, "x", "y".repeat(20001))).rejects.toThrow(/check/);
  });

  it("search_text covers title and body, case-insensitively, with escaped wildcards", async () => {
    const p = await addProject(A);
    await addNote(A, p, "Arsitektur", "Pakai Supabase untuk auth");
    await addNote(A, p, "Diskon", "potongan 100% hari ini");
    await addNote(A, p, "Lain", "tanpa kata kunci");
    const search = (pattern: string) =>
      as(A, "select title from public.project_notes where search_text ilike $1 order by title", [pattern]);
    expect((await search("%supabase%")).rows).toEqual([{ title: "Arsitektur" }]);
    expect((await search("%arsitek%")).rows).toEqual([{ title: "Arsitektur" }]);
    expect((await search("%100\\%%")).rows).toEqual([{ title: "Diskon" }]); // escaped %: literal percent sign
    expect((await search("%\\_%")).rows).toHaveLength(0); // escaped _: literal underscore, not "any char"
  });
});

describe("project_task_counts", () => {
  it("counts open and done tasks per project and respects RLS", async () => {
    const p = await addProject(A);
    await as(A, "insert into public.tasks (title, project_id) values ('a', $1), ('b', $1)", [p]);
    await as(A, "insert into public.tasks (title, project_id, status, completed_at) values ('c', $1, 'done', now())", [p]);
    await as(A, "insert into public.tasks (title) values ('tanpa proyek')");

    expect((await as(A, "select project_id, open_count, done_count from public.project_task_counts")).rows).toEqual([
      { project_id: p, open_count: 2, done_count: 1 },
    ]);
    expect((await as(B, "select * from public.project_task_counts")).rows).toHaveLength(0);
  });
});

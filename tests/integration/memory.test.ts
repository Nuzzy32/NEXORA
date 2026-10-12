import { beforeEach, describe, expect, it } from "vitest";
import { A, B, createDb } from "./helpers";

let db: Awaited<ReturnType<typeof createDb>>["db"];
let as: Awaited<ReturnType<typeof createDb>>["as"];

beforeEach(async () => {
  ({ db, as } = await createDb());
});

const addProject = async (user: string) =>
  (await as(user, "insert into public.projects (name) values ('P') returning id")).rows[0].id as string;
const add = (
  user: string,
  o: { title?: string; content?: string; category?: string; tags?: string[]; project?: string | null } = {},
) =>
  as(
    user,
    "insert into public.memory_items (title, content, category, tags, project_id) values ($1, $2, $3, $4, $5) returning id, user_id, pinned",
    [o.title ?? "T", o.content ?? "isi", o.category ?? "decision", o.tags ?? [], o.project ?? null],
  );

describe("memory_items", () => {
  it("fills user_id, defaults to unpinned and is invisible to other users", async () => {
    const { rows } = await add(A, { title: "Milik A" });
    expect(rows[0]).toMatchObject({ user_id: A, pinned: false });
    expect((await as(B, "select id from public.memory_items")).rows).toHaveLength(0);
  });

  it("blocks cross-user update, delete and ownership transfer", async () => {
    const id = (await add(A)).rows[0].id;
    expect((await as(B, "update public.memory_items set title = 'hack' where id = $1 returning id", [id])).rows).toHaveLength(0);
    expect((await as(B, "delete from public.memory_items where id = $1 returning id", [id])).rows).toHaveLength(0);
    await expect(as(A, "update public.memory_items set user_id = $2 where id = $1", [id, B])).rejects.toThrow(/row-level security/);
    await expect(as(B, "insert into public.memory_items (user_id, title, content) values ($1, 'x', 'y')", [A])).rejects.toThrow(
      /row-level security/,
    );
    expect((await as(A, "select title from public.memory_items where id = $1", [id])).rows[0].title).toBe("T");
  });

  it("rejects anon: no grants, nothing readable or writable", async () => {
    await add(A);
    await expect(db.exec("set role anon; select * from public.memory_items")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
    await expect(db.exec("set role anon; insert into public.memory_items (title, content) values ('x', 'y')")).rejects.toThrow(
      /permission denied/,
    );
    await db.exec("reset role");
    await expect(db.exec("set role anon; select * from public.memory_category_counts")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });

  it("rejects a project that belongs to another user, and keeps the memory when its project is deleted", async () => {
    const pB = await addProject(B);
    await expect(add(A, { project: pB })).rejects.toThrow(/foreign key/);
    const pA = await addProject(A);
    const id = (await add(A, { project: pA })).rows[0].id;
    await as(A, "delete from public.projects where id = $1", [pA]);
    const { rows } = await as(A, "select project_id, user_id from public.memory_items where id = $1", [id]);
    expect(rows[0]).toEqual({ project_id: null, user_id: A });
  });

  it("enforces category, title, content and tag limits", async () => {
    await expect(add(A, { category: "secret" })).rejects.toThrow(/check/);
    await expect(add(A, { title: "" })).rejects.toThrow(/check/);
    await expect(add(A, { title: "x".repeat(201) })).rejects.toThrow(/check/);
    await expect(add(A, { content: "" })).rejects.toThrow(/check/);
    await expect(add(A, { content: "y".repeat(10001) })).rejects.toThrow(/check/);
    await expect(add(A, { tags: Array.from({ length: 11 }, (_, i) => `t${i}`) })).rejects.toThrow(/check/);
    await expect(add(A, { tags: ["ok", ""] })).rejects.toThrow(/check/);
    await expect(add(A, { tags: ["x".repeat(400)] })).rejects.toThrow(/check/);
    await add(A, { tags: ["supabase", "rls"], category: "code_pattern" });
  });

  it("search_text covers title and content, case-insensitively, with escaped wildcards", async () => {
    await add(A, { title: "Arsitektur", content: "Pakai Supabase untuk auth" });
    await add(A, { title: "Diskon", content: "potongan 100% hari ini" });
    await add(A, { title: "Lain", content: "tanpa kata kunci" });
    const search = (pattern: string) =>
      as(A, "select title from public.memory_items where search_text ilike $1 order by title", [pattern]);
    const { likePattern } = await import("@/lib/search");
    expect((await search(likePattern("supabase"))).rows.map((r) => r.title)).toEqual(["Arsitektur"]);
    expect((await search(likePattern("lain"))).rows.map((r) => r.title)).toEqual(["Lain"]);
    expect((await search(likePattern("100%"))).rows.map((r) => r.title)).toEqual(["Diskon"]);
    expect((await search(likePattern("%"))).rows.map((r) => r.title)).toEqual(["Diskon"]);
    expect((await search(likePattern("_"))).rows).toHaveLength(0);
  });

  it("pinning keeps updated_at; editing content moves it", async () => {
    const id = (await add(A)).rows[0].id;
    // back-date the row (the trigger would otherwise keep the current value)
    await db.exec("alter table public.memory_items disable trigger memory_items_touch_updated_at");
    await db.exec("update public.memory_items set updated_at = '2026-01-01T00:00:00Z'");
    await db.exec("alter table public.memory_items enable trigger memory_items_touch_updated_at");
    await as(A, "update public.memory_items set pinned = true where id = $1", [id]);
    const read = async () =>
      (await as(A, "select pinned, updated_at::text as u from public.memory_items where id = $1", [id])).rows[0];
    expect(await read()).toMatchObject({ pinned: true });
    expect((await read()).u).toMatch(/^2026-01-01/);
    await as(A, "update public.memory_items set content = 'baru' where id = $1", [id]);
    expect((await read()).u).not.toMatch(/^2026-01-01/);
  });

  it("memory_category_counts only counts the caller's items", async () => {
    await add(A, { category: "decision" });
    await add(A, { category: "decision" });
    await add(A, { category: "preference" });
    await add(B, { category: "decision" });
    const rows = (await as(A, "select category, item_count from public.memory_category_counts order by category")).rows;
    expect(rows).toEqual([
      { category: "decision", item_count: 2 },
      { category: "preference", item_count: 1 },
    ]);
  });
});

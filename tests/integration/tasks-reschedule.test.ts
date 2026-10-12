import { beforeEach, describe, expect, it } from "vitest";
import { A, B, createDb } from "./helpers";

let as: Awaited<ReturnType<typeof createDb>>["as"];

beforeEach(async () => {
  ({ as } = await createDb());
});

describe("rescheduling a task (UPDATE due_date)", () => {
  it("lets the owner move a task, finished or imported ones included", async () => {
    const open = (await as(A, "insert into public.tasks (title, due_date) values ('x', '2026-10-14') returning id")).rows[0].id;
    const synced = (
      await as(A, "insert into public.tasks (title, due_date, source, external_id, external_hash, status, completed_at) values ('y', '2026-10-14', 'elearning', 'u1', 'h', 'done', now()) returning id")
    ).rows[0].id;
    for (const id of [open, synced]) {
      const { rows } = await as(A, "update public.tasks set due_date = '2026-10-20' where id = $1 returning due_date::text as d", [id]);
      expect(rows).toEqual([{ d: "2026-10-20" }]);
    }
  });

  it("does not let another user change the due date of someone else's task", async () => {
    const id = (await as(A, "insert into public.tasks (title, due_date) values ('x', '2026-10-14') returning id")).rows[0].id;
    expect((await as(B, "update public.tasks set due_date = '2026-10-20' where id = $1 returning id", [id])).rows).toHaveLength(0);
    expect((await as(A, "select due_date::text as d from public.tasks where id = $1", [id])).rows).toEqual([{ d: "2026-10-14" }]);
  });
});

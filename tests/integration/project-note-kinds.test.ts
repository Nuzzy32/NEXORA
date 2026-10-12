import { beforeEach, describe, expect, it } from "vitest";
import { A, B, createDb } from "./helpers";

let as: Awaited<ReturnType<typeof createDb>>["as"];

beforeEach(async () => {
  ({ as } = await createDb());
});

const addProject = async (user: string) =>
  (await as(user, "insert into public.projects (name) values ('P') returning id")).rows[0].id as string;
const addNote = (user: string, projectId: string, kind: string, due: string | null = null, resolved: string | null = null) =>
  as(
    user,
    "insert into public.project_notes (project_id, title, kind, due_date, resolved_at) values ($1, 't', $2, $3, $4) returning id",
    [projectId, kind, due, resolved],
  );

describe("project_notes kinds (PROJ-04)", () => {
  it("accepts the new kinds and rejects unknown ones", async () => {
    const p = await addProject(A);
    for (const k of ["note", "decision", "milestone", "bug", "risk"]) await addNote(A, p, k);
    await expect(addNote(A, p, "idea")).rejects.toThrow(/project_notes_kind_check/);
  });

  it("allows a due date and a resolved mark on milestone, bug and risk", async () => {
    const p = await addProject(A);
    for (const k of ["milestone", "bug", "risk"]) {
      const { rows } = await addNote(A, p, k, "2026-12-01", "2026-11-01T00:00:00Z");
      expect(rows).toHaveLength(1);
    }
  });

  it("refuses a due date or resolved mark on a note or decision", async () => {
    const p = await addProject(A);
    for (const k of ["note", "decision"]) {
      await expect(addNote(A, p, k, "2026-12-01")).rejects.toThrow(/project_notes_tracking_check/);
      await expect(addNote(A, p, k, null, "2026-11-01T00:00:00Z")).rejects.toThrow(/project_notes_tracking_check/);
    }
  });

  it("refuses turning a dated milestone into a note without clearing the date", async () => {
    const p = await addProject(A);
    const id = (await addNote(A, p, "milestone", "2026-12-01", "2026-11-01T00:00:00Z")).rows[0].id;
    await expect(as(A, "update public.project_notes set kind = 'note' where id = $1", [id])).rejects.toThrow(/tracking_check/);
    await as(A, "update public.project_notes set kind = 'note', due_date = null, resolved_at = null where id = $1", [id]);
  });

  it("keeps rows written before the migration valid and lets a milestone be resolved and reopened", async () => {
    const p = await addProject(A);
    const id = (await addNote(A, p, "milestone")).rows[0].id;
    const done = await as(A, "update public.project_notes set resolved_at = now() where id = $1 returning resolved_at", [id]);
    expect(done.rows[0].resolved_at).not.toBeNull();
    const open = await as(A, "update public.project_notes set resolved_at = null where id = $1 returning resolved_at", [id]);
    expect(open.rows[0].resolved_at).toBeNull();
  });

  it("keeps RLS: another user cannot read, resolve or re-date an item", async () => {
    const p = await addProject(A);
    const id = (await addNote(A, p, "risk", "2026-12-01")).rows[0].id;
    expect((await as(B, "select id from public.project_notes")).rows).toHaveLength(0);
    expect((await as(B, "update public.project_notes set resolved_at = now() where id = $1 returning id", [id])).rows).toHaveLength(0);
    expect((await as(B, "update public.project_notes set due_date = null where id = $1 returning id", [id])).rows).toHaveLength(0);
    await expect(as(B, "insert into public.project_notes (project_id, title, kind, user_id) values ($1, 'x', 'risk', $2)", [p, A])).rejects.toThrow();
  });

  it("still finds the new kinds through search_text", async () => {
    const p = await addProject(A);
    await as(A, "insert into public.project_notes (project_id, title, body, kind) values ($1, 'Rilis beta', 'uji coba', 'milestone')", [p]);
    expect((await as(A, "select title from public.project_notes where search_text ilike '%uji%'")).rows).toEqual([{ title: "Rilis beta" }]);
  });
});

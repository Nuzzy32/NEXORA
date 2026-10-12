import { beforeEach, describe, expect, it } from "vitest";
import { A, B, createDb } from "./helpers";

let db: Awaited<ReturnType<typeof createDb>>["db"];
let as: Awaited<ReturnType<typeof createDb>>["as"];

beforeEach(async () => {
  ({ db, as } = await createDb());
});

const insertDoc = (user: string) =>
  as(user, "insert into public.documents (title, file_name, size_bytes) values ('Materi', 'materi.pdf', 1000) returning id, user_id, status");

describe("documents", () => {
  it("starts as uploading, fills user_id and is invisible to others", async () => {
    const row = (await insertDoc(A)).rows[0];
    expect(row).toMatchObject({ user_id: A, status: "uploading" });
    expect((await as(B, "select id from public.documents")).rows).toHaveLength(0);
    expect((await as(B, "update public.documents set title = 'x' returning id")).rows).toHaveLength(0);
    expect((await as(B, "delete from public.documents returning id")).rows).toHaveLength(0);
    await expect(as(B, "insert into public.documents (user_id, title, file_name, size_bytes) values ($1, 'x', 'x.pdf', 1)", [A])).rejects.toThrow(
      /row-level security/,
    );
  });

  it("enforces the size cap and keeps summaries off unconfirmed uploads", async () => {
    await expect(
      as(A, "insert into public.documents (title, file_name, size_bytes) values ('x', 'x.pdf', 20971521)"),
    ).rejects.toThrow(/check/);
    const { id } = (await insertDoc(A)).rows[0];
    await expect(as(A, "update public.documents set summary_draft = 'x' where id = $1", [id])).rejects.toThrow(/check/);
    await as(A, "update public.documents set status = 'ready', summary_draft = 'x' where id = $1", [id]);
  });

  it("cannot be moved to another owner", async () => {
    const { id } = (await insertDoc(A)).rows[0];
    await expect(as(A, "update public.documents set user_id = $1 where id = $2", [B, id])).rejects.toThrow(/row-level security/);
  });
});

describe("documents bucket", () => {
  it("is private with a 20 MB PDF-only limit", async () => {
    const { rows } = await db.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'documents'");
    expect(rows[0]).toEqual({ public: false, file_size_limit: 20971520, allowed_mime_types: ["application/pdf"] });
  });

  it("lets a user touch only their own folder", async () => {
    await as(A, "insert into storage.objects (bucket_id, name) values ('documents', $1)", [`${A}/doc.pdf`]);
    await expect(as(A, "insert into storage.objects (bucket_id, name) values ('documents', $1)", [`${B}/doc.pdf`])).rejects.toThrow(
      /row-level security/,
    );
    expect((await as(B, "select name from storage.objects")).rows).toHaveLength(0);
    expect((await as(B, "delete from storage.objects returning name")).rows).toHaveLength(0);
    expect((await as(A, "delete from storage.objects returning name")).rows).toHaveLength(1);
  });
});

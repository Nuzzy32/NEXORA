import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

// Runs the real migrations on in-process Postgres with a minimal stand-in for Supabase's auth and storage schemas.
export const A = "00000000-0000-0000-0000-00000000000a";
export const B = "00000000-0000-0000-0000-00000000000b";

const AUTH_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, public to anon, authenticated;
  insert into auth.users values ('${A}'), ('${B}');
  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text not null,
    owner uuid default auth.uid(), unique (bucket_id, name)
  );
  create function storage.foldername(name text) returns text[] language sql immutable
    as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
`;

export async function createDb() {
  const db = new PGlite();
  await db.exec(AUTH_STUB);
  const dir = join(process.cwd(), "supabase/migrations");
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, f), "utf8"));
  }

  /** Runs one statement as an authenticated Supabase user (RLS applies). */
  const as = (user: string, sql: string, params: unknown[] = []) =>
    db.transaction(async (tx) => {
      await tx.query("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [user]);
      return tx.query<Record<string, unknown>>(sql, params);
    });

  return { db, as };
}

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

// Runs the real migrations on in-process Postgres with a minimal stand-in for Supabase's auth schema.
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

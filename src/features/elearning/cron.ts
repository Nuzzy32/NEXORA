import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/** `Authorization: Bearer <secret>`, compared in constant time. Vercel Cron sends this header when CRON_SECRET is set. */
export function authorizeCron(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const digest = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(digest(header.slice("Bearer ".length)), digest(secret));
}

export type CronEnv = { CRON_SECRET?: string; OWNER_USER_ID?: string; SUPABASE_SERVICE_ROLE_KEY?: string };
export type CronReply = { status: number; body: Record<string, unknown> };

/**
 * A daily cron job, minus the framework (the e-learning sync and the brief share it): checks the caller, then runs `run(ownerId)`.
 * Bodies carry counts and fixed sentences only: never the calendar URL, the secrets or an error from a library.
 */
export async function handleCron<T extends { status: string }>(
  header: string | null,
  env: CronEnv,
  run: (ownerId: string) => Promise<T>,
): Promise<CronReply> {
  const owner = z.uuid().safeParse(env.OWNER_USER_ID);
  if (!env.CRON_SECRET || !owner.success || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: 503, body: { error: "Cron belum dikonfigurasi" } };
  }
  if (!authorizeCron(header, env.CRON_SECRET)) return { status: 401, body: { error: "Tidak diizinkan" } };

  const result = await run(owner.data);
  if (result.status === "error") return { status: 502, body: { status: "error", message: (result as { message?: string }).message } };
  return { status: 200, body: result };
}

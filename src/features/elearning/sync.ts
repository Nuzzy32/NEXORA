import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ElearningError, checkIcalUrl, fetchCalendar } from "./fetch";
import { parseIcal } from "./ical";
import { planSync, type ExistingTask } from "./plan";

export const SYNC_MIN_INTERVAL_MS = 2 * 60_000;

export type SyncResult =
  | { status: "ok"; created: number; updated: number; unchanged: number; skipped: number }
  | { status: "throttled" }
  | { status: "error"; message: string };

const DB_ERROR = "Gagal menyimpan task e-learning. Coba lagi.";

/**
 * Takes the "one sync per 2 minutes" slot for this user. The conditional UPDATE is the lock: only one of two
 * simultaneous calls matches a row older than the window; the first sync ever races on the primary key instead.
 */
async function claimSlot(supabase: SupabaseClient, userId: string, now: Date): Promise<boolean> {
  const cutoff = new Date(now.getTime() - SYNC_MIN_INTERVAL_MS).toISOString();
  const upd = await supabase
    .from("integration_syncs")
    .update({ last_synced_at: now.toISOString() })
    .eq("user_id", userId)
    .eq("source", "elearning")
    .lt("last_synced_at", cutoff)
    .select("source");
  if (upd.error) throw new ElearningError(DB_ERROR);
  if (upd.data.length > 0) return true;
  const ins = await supabase
    .from("integration_syncs")
    .insert({ user_id: userId, source: "elearning", last_synced_at: now.toISOString(), last_status: "ok" });
  if (!ins.error) return true;
  if (ins.error.code === "23505") return false; // a recent row exists
  throw new ElearningError(DB_ERROR);
}

async function importTasks(supabase: SupabaseClient, userId: string, now: Date) {
  const text = await fetchCalendar(process.env.ELEARNING_ICAL_URL);
  const { tasks, skipped } = parseIcal(text, now, process.env.APP_TIMEZONE || "Asia/Jakarta");

  // ponytail: PostgREST max-rows (1000) caps this; page with range() if one owner ever has more synced tasks.
  const { data, error } = await supabase
    .from("tasks")
    .select("id,external_id,external_hash,status")
    .eq("source", "elearning")
    .limit(1000)
    .overrideTypes<ExistingTask[]>();
  if (error) throw new ElearningError(DB_ERROR);

  const { inserts, updates, unchanged } = planSync(tasks, data);
  if (inserts.length > 0) {
    const rows = inserts.map((t) => ({ ...t, user_id: userId, source: "elearning", status: "todo", priority: "medium" }));
    const res = await supabase.from("tasks").insert(rows);
    if (res.error) throw new ElearningError(DB_ERROR);
  }
  let updated = 0;
  for (let i = 0; i < updates.length; i += 10) {
    const results = await Promise.all(
      updates.slice(i, i + 10).map(({ id, ...fields }) =>
        // a task finished in the meantime is left alone
        supabase.from("tasks").update(fields).eq("id", id).neq("status", "done").select("id"),
      ),
    );
    for (const r of results) {
      if (r.error) throw new ElearningError(DB_ERROR);
      updated += r.data.length;
    }
  }
  return { created: inserts.length, updated, unchanged, skipped };
}

/** Pulls the e-learning calendar into `tasks` (idempotent) and records the outcome. Never throws a message with the URL in it. */
export async function runSync(supabase: SupabaseClient, userId: string, now: Date): Promise<SyncResult> {
  try {
    checkIcalUrl(process.env.ELEARNING_ICAL_URL); // not configured / invalid: nothing to record
  } catch (e) {
    return { status: "error", message: e instanceof ElearningError ? e.message : "URL e-learning tidak valid" };
  }
  try {
    if (!(await claimSlot(supabase, userId, now))) return { status: "throttled" };
  } catch {
    return { status: "error", message: DB_ERROR };
  }

  const record = (fields: Record<string, unknown>) =>
    supabase.from("integration_syncs").update(fields).eq("user_id", userId).eq("source", "elearning");
  try {
    const counts = await importTasks(supabase, userId, now);
    await record({ last_status: "ok", created_count: counts.created, updated_count: counts.updated, last_error: null });
    return { status: "ok", ...counts };
  } catch (e) {
    const message = e instanceof ElearningError ? e.message : "Sinkronisasi e-learning gagal. Coba lagi.";
    await record({ last_status: "error", created_count: 0, updated_count: 0, last_error: message });
    return { status: "error", message };
  }
}

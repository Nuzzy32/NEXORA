"use server";

import { requireUser } from "@/lib/auth/session";
import { refreshApp } from "@/lib/revalidate";
import { runSync, type SyncResult } from "./sync";

/** Pulls the personal e-learning calendar into the task list. The feed URL stays in server env and is never returned. */
export async function syncElearning(): Promise<SyncResult> {
  const { supabase, user } = await requireUser();
  const result = await runSync(supabase, user.id, new Date());
  if (result.status !== "throttled") refreshApp(); // the panel shows the new status or error
  return result;
}

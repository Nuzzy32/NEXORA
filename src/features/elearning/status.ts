import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth/session";

export type ElearningStatus = {
  /** Whether ELEARNING_ICAL_URL is set. The URL itself never leaves the server. */
  connected: boolean;
  lastSyncedAt: string | null;
  lastStatus: "ok" | "error" | null;
  created: number;
  updated: number;
  lastError: string | null;
};

type SyncRow = {
  last_synced_at: string;
  last_status: "ok" | "error";
  created_count: number;
  updated_count: number;
  last_error: string | null;
};

/** Memoized per request: the tasks panel and the auto-sync runner can both ask. */
export const getElearningStatus = cache(async (): Promise<ElearningStatus> => {
  const { supabase } = await requireUser();
  const connected = Boolean(process.env.ELEARNING_ICAL_URL?.trim());
  const { data } = await supabase
    .from("integration_syncs")
    .select("last_synced_at,last_status,created_count,updated_count,last_error")
    .eq("source", "elearning")
    .maybeSingle<SyncRow>();
  return {
    connected,
    lastSyncedAt: data?.last_synced_at ?? null,
    lastStatus: data?.last_status ?? null,
    created: data?.created_count ?? 0,
    updated: data?.updated_count ?? 0,
    lastError: data?.last_error ?? null,
  };
});

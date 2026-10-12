"use server";

import { failed, invalid, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { refreshApp } from "@/lib/revalidate";
import { DOCUMENTS_BUCKET } from "@/features/learning/schema";
import { DELETE_PLANS, describeCounts, removesFiles, SETTINGS_RESET, type DataTable } from "./delete";
import { parseDeleteRequest, parsePrefsForm, PREFS_FIELDS } from "./schema";

/** Preference columns only: the upsert never names the brief columns, so consent is left exactly as it was. */
export async function savePrefs(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, supabase } = await requireUser();
  const parsed = parsePrefsForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, PREFS_FIELDS);
  const { error } = await supabase.from("owner_settings").upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id" });
  if (error) return failed("Preferensi gagal disimpan. Coba lagi.", formData, PREFS_FIELDS);
  refreshApp();
  return { status: "ok", message: "Preferensi disimpan." };
}

/**
 * Permanent delete of one category through RLS (only the caller's rows can match). Bound as
 * `deleteData.bind(null, category)`; "all" also needs the typed confirmation word. The account itself is untouched.
 */
export async function deleteData(category: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, supabase } = await requireUser();
  const parsed = parseDeleteRequest(category, formData.get("confirm"));
  if (!parsed.success) return invalid(parsed.error, formData, ["confirm"]);

  // Files first: a row is the only handle to its file, so rows must never go while their files stay.
  if (removesFiles(parsed.data.category)) {
    const bucket = supabase.storage.from(DOCUMENTS_BUCKET);
    const { data: files, error } = await bucket.list(user.id, { limit: 1000 });
    const removed = error ? { error } : files.length ? await bucket.remove(files.map((f) => `${user.id}/${f.name}`)) : { error: null };
    if (removed.error) return failed("Berkas PDF gagal dihapus dari penyimpanan. Tidak ada data yang dihapus; coba lagi.");
  }

  const deleted: Partial<Record<DataTable, number>> = {};
  for (const step of DELETE_PLANS[parsed.data.category]) {
    const base = supabase.from(step.table).delete({ count: "exact" });
    const { error, count } = await (step.eq ? base.eq(step.eq[0], step.eq[1]) : base.not(step.key, "is", null));
    if (error) {
      refreshApp();
      return failed("Penghapusan gagal. Sebagian data mungkin sudah terhapus; muat ulang halaman lalu coba lagi.");
    }
    deleted[step.table] = count ?? 0;
  }
  if (parsed.data.category === "all") {
    const { error } = await supabase.from("owner_settings").update(SETTINGS_RESET).eq("user_id", user.id);
    if (error) {
      refreshApp();
      return failed("Data terhapus, tetapi pengaturan gagal direset. Matikan brief harian dan chat Claude secara manual bila perlu.");
    }
  }
  refreshApp();
  return { status: "ok", message: describeCounts(deleted) ? `Terhapus: ${describeCounts(deleted)}.` : "Tidak ada data yang perlu dihapus." };
}

import "server-only";
import { requireUser } from "@/lib/auth/session";

/** Notes of kind `decision` across all projects (RLS limits it to the owner). */
export async function countDecisions(): Promise<number> {
  const { supabase } = await requireUser();
  const { count, error } = await supabase
    .from("project_notes")
    .select("id", { count: "exact", head: true })
    .eq("kind", "decision");
  if (error) throw new Error("Gagal memuat keputusan.");
  return count ?? 0;
}

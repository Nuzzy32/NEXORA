import "server-only";
import { requireUser } from "@/lib/auth/session";
import {
  likePattern,
  MEMORY_CATEGORIES,
  MEMORY_COLUMNS,
  type MemoryCategory,
  type MemoryFilters,
  type MemoryItem,
} from "./schema";

export async function listMemory(filters: MemoryFilters): Promise<MemoryItem[]> {
  const { supabase } = await requireUser();
  let q = supabase.from("memory_items").select(MEMORY_COLUMNS);
  if (filters.category !== "all") q = q.eq("category", filters.category);
  if (filters.q) q = q.ilike("search_text", likePattern(filters.q));
  if (filters.sort === "pinned") q = q.order("pinned", { ascending: false });
  q = q.order(filters.sort === "created" ? "created_at" : "updated_at", { ascending: false });
  const { data, error } = await q.limit(200).overrideTypes<MemoryItem[], { merge: false }>();
  if (error) throw new Error("Gagal memuat memory.");
  return data;
}

/** Items per category (all items, not just the current search) plus the grand total. */
export async function memoryCategoryCounts(): Promise<{ total: number; byCategory: Record<MemoryCategory, number> }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("memory_category_counts")
    .select("category,item_count")
    .overrideTypes<{ category: MemoryCategory; item_count: number }[]>();
  if (error) throw new Error("Gagal memuat jumlah memory.");
  const byCategory = Object.fromEntries(MEMORY_CATEGORIES.map((c) => [c, 0])) as Record<MemoryCategory, number>;
  for (const r of data) byCategory[r.category] = r.item_count;
  return { total: Object.values(byCategory).reduce((a, b) => a + b, 0), byCategory };
}

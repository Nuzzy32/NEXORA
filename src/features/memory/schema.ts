import { z } from "zod";
import { searchTerm } from "@/lib/search";

export const MEMORY_CATEGORIES = ["architecture", "preference", "decision", "code_pattern", "project_note"] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
export const MEMORY_CATEGORY_LABEL: Record<MemoryCategory, string> = {
  architecture: "Arsitektur",
  preference: "Preferensi",
  decision: "Keputusan",
  code_pattern: "Pola kode",
  project_note: "Catatan proyek",
};

export type MemoryItem = {
  id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  pinned: boolean;
  project_id: string | null;
  created_at: string;
  updated_at: string;
};
export const MEMORY_COLUMNS = "id,title,content,category,tags,pinned,project_id,created_at,updated_at";

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

/** "#API, rls  Supabase" -> ["api", "rls", "supabase"]: lowercase, no "#", spaces inside a tag become "-", no duplicates. */
export function parseTags(raw: string): string[] {
  const tags = raw
    .split(/[,\n]/)
    .map((t) => t.trim().replace(/^#+/, "").trim().replace(/\s+/g, "-").toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}

export const memoryInputSchema = z.object({
  title: z.string("Judul wajib diisi").trim().min(1, "Judul wajib diisi").max(200, "Judul maksimal 200 karakter"),
  content: z.string("Isi wajib diisi").trim().min(1, "Isi wajib diisi").max(10000, "Isi maksimal 10.000 karakter"),
  category: z.enum(MEMORY_CATEGORIES, "Kategori tidak valid"),
  tags: z.preprocess(
    (v) => (typeof v === "string" ? parseTags(v) : []),
    z.array(z.string().max(30, "Tag maksimal 30 karakter")).max(10, "Maksimal 10 tag"),
  ),
  project_id: z.preprocess(blankToNull, z.uuid("Proyek tidak valid").nullable()),
});

export const MEMORY_FIELDS = ["title", "content", "category", "tags", "project_id"] as const;

export function parseMemoryForm(formData: FormData) {
  return memoryInputSchema.safeParse(Object.fromEntries(MEMORY_FIELDS.map((f) => [f, formData.get(f) ?? ""])));
}

export const MEMORY_SORTS = ["updated", "created", "pinned"] as const;
export type MemorySort = (typeof MEMORY_SORTS)[number];
export const MEMORY_SORT_LABEL: Record<MemorySort, string> = {
  updated: "Terbaru diperbarui",
  created: "Dibuat",
  pinned: "Disematkan dulu",
};

export type MemoryFilters = { q: string; category: MemoryCategory | "all"; sort: MemorySort };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseMemoryFilters(sp: Record<string, string | string[] | undefined>): MemoryFilters {
  return {
    q: searchTerm(sp.q),
    category: MEMORY_CATEGORIES.find((c) => c === first(sp.category)) ?? "all",
    sort: MEMORY_SORTS.find((s) => s === first(sp.sort)) ?? "updated",
  };
}

/** Query string for /memory that keeps only non-default filters. */
export function memoryHref(f: MemoryFilters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.category !== "all") p.set("category", f.category);
  if (f.sort !== "updated") p.set("sort", f.sort);
  const qs = p.toString();
  return qs ? `/memory?${qs}` : "/memory";
}

/** Plain text to paste into a chat as context. Runs in the browser, nothing is sent anywhere. */
export function memoryAsContext(m: Pick<MemoryItem, "title" | "content" | "category" | "tags">): string {
  const meta = [MEMORY_CATEGORY_LABEL[m.category], ...m.tags.map((t) => `#${t}`)].join(" ");
  return `${m.title}\n${meta}\n\n${m.content}`;
}

export { likePattern } from "@/lib/search";

import { z } from "zod";

// ---- projects --------------------------------------------------------------

export const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Aktif",
  on_hold: "Ditunda",
  completed: "Selesai",
  archived: "Diarsipkan",
};

export type Project = {
  id: string;
  name: string;
  summary: string | null;
  status: ProjectStatus;
  starts_on: string | null;
  due_on: string | null;
  /** "owner/repo" on GitHub (PROJ-05); read with the server's optional token. */
  github_repo: string | null;
  updated_at: string;
};
export const PROJECT_COLUMNS = "id,name,summary,status,starts_on,due_on,github_repo,updated_at";

/** Same rule as the column CHECK. A pasted github.com URL is reduced to "owner/repo" first. */
export const GITHUB_REPO_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;
export function normalizeRepo(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const s = v.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/+$/, "").replace(/\.git$/i, "");
  return s === "" ? null : s;
}
export type TaskCounts = { open_count: number; done_count: number };
export type ProjectWithCounts = Project & TaskCounts;

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const projectInputSchema = z
  .object({
    name: z.string("Nama wajib diisi").trim().min(1, "Nama wajib diisi").max(120, "Nama maksimal 120 karakter"),
    summary: z.preprocess(blankToNull, z.string().trim().max(2000, "Ringkasan maksimal 2000 karakter").nullable()),
    status: z.enum(PROJECT_STATUSES, "Status tidak valid"),
    starts_on: z.preprocess(blankToNull, z.iso.date("Tanggal tidak valid").nullable()),
    due_on: z.preprocess(blankToNull, z.iso.date("Tanggal tidak valid").nullable()),
    github_repo: z.preprocess(
      normalizeRepo,
      z.string().regex(GITHUB_REPO_PATTERN, "Tulis sebagai pemilik/nama-repo, misalnya vercel/next.js").nullable(),
    ),
  })
  .refine((d) => !d.starts_on || !d.due_on || d.due_on >= d.starts_on, {
    path: ["due_on"],
    message: "Target selesai tidak boleh sebelum tanggal mulai",
  });

export const PROJECT_FIELDS = ["name", "summary", "status", "starts_on", "due_on", "github_repo"] as const;

export function parseProjectForm(formData: FormData) {
  return projectInputSchema.safeParse(Object.fromEntries(PROJECT_FIELDS.map((f) => [f, formData.get(f)])));
}

/** "open" = running projects (active + on hold). */
export const PROJECT_FILTERS = ["open", "completed", "archived", "all"] as const;
export type ProjectFilter = (typeof PROJECT_FILTERS)[number];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseProjectFilter(sp: Record<string, string | string[] | undefined>): ProjectFilter {
  return PROJECT_FILTERS.find((f) => f === first(sp.status)) ?? "open";
}

// ---- notes -----------------------------------------------------------------

export const NOTE_KINDS = ["note", "decision", "milestone", "bug", "risk"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];
export const NOTE_KIND_LABEL: Record<NoteKind, string> = {
  note: "Catatan",
  decision: "Keputusan",
  milestone: "Milestone",
  bug: "Bug",
  risk: "Risiko",
};

/** Kinds that can have a due date and be marked done (the DB enforces the same set). */
export const TRACKED_KINDS = ["milestone", "bug", "risk"] as const;
export type TrackedKind = (typeof TRACKED_KINDS)[number];
export const isTrackedKind = (kind: string): kind is TrackedKind => (TRACKED_KINDS as readonly string[]).includes(kind);
export const NOTE_DUE_LABEL: Record<TrackedKind, string> = {
  milestone: "Target",
  bug: "Tenggat",
  risk: "Tenggat mitigasi",
};
/** Verb on the "mark done" button. */
export const NOTE_RESOLVE_LABEL: Record<TrackedKind, string> = { milestone: "Selesai", bug: "Teratasi", risk: "Teratasi" };

export type Note = {
  id: string;
  kind: NoteKind;
  title: string;
  body: string;
  updated_at: string;
  due_date: string | null;
  resolved_at: string | null;
};
export const NOTE_COLUMNS = "id,kind,title,body,updated_at,due_date,resolved_at";

export const noteInputSchema = z.object({
  title: z.string("Judul wajib diisi").trim().min(1, "Judul wajib diisi").max(200, "Judul maksimal 200 karakter"),
  kind: z.enum(NOTE_KINDS, "Jenis tidak valid"),
  body: z.string().trim().max(20000, "Isi maksimal 20.000 karakter").default(""),
  due_date: z.preprocess(blankToNull, z.iso.date("Tanggal tidak valid").nullable().optional()),
});

export const NOTE_FIELDS = ["title", "kind", "body", "due_date"] as const;

export function parseNoteForm(formData: FormData) {
  // A missing textarea arrives as null; treat it as empty.
  return noteInputSchema.safeParse({
    title: formData.get("title"),
    kind: formData.get("kind"),
    body: formData.get("body") ?? "",
    due_date: formData.get("due_date") ?? undefined,
  });
}

/**
 * Row values for a parsed note. Plain notes and decisions never keep a due date or a resolved mark
 * (the DB check would refuse them), so switching an item to such a kind clears both.
 */
export function noteRow(data: z.infer<typeof noteInputSchema>) {
  const { due_date, ...rest } = data;
  return isTrackedKind(data.kind) ? { ...rest, due_date: due_date ?? null } : { ...rest, due_date: null, resolved_at: null };
}

export const NOTE_KIND_FILTERS = ["all", ...NOTE_KINDS] as const;
export type NoteKindFilter = (typeof NOTE_KIND_FILTERS)[number];

export { likePattern, searchTerm } from "@/lib/search";
import { searchTerm } from "@/lib/search";

export function parseNoteFilters(sp: Record<string, string | string[] | undefined>) {
  return {
    q: searchTerm(sp.q),
    kind: NOTE_KIND_FILTERS.find((k) => k === first(sp.kind)) ?? "all",
  } satisfies { q: string; kind: NoteKindFilter };
}

export const PROJECT_TABS = ["overview", "tasks", "notes", "timeline"] as const;
export type ProjectTab = (typeof PROJECT_TABS)[number];
export const parseProjectTab = (sp: Record<string, string | string[] | undefined>): ProjectTab =>
  PROJECT_TABS.find((t) => t === first(sp.tab)) ?? "tasks";

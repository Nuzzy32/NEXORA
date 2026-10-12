import { z } from "zod";
import type { MemoryCategory } from "@/features/memory/schema";
import type { ProjectStatus } from "@/features/projects/schema";

export const MESSAGE_ROLES = ["user", "assistant", "system"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];
export const MESSAGE_STATUSES = ["complete", "error"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

/** A user message is capped well below the column limit (32.000) so a reply plus history stays reasonable. */
export const MAX_USER_MESSAGE = 8000;
export const MAX_TITLE = 200;
export const DEFAULT_TITLE = "Percakapan baru";

export type Conversation = { id: string; title: string; updated_at: string };
export const CONVERSATION_COLUMNS = "id,title,updated_at";

/** Memory and project items a conversation can carry (AI-09/10), chosen by hand and never attached automatically. */
export const CONTEXT_KINDS = ["memory", "project"] as const;
export type ContextKind = (typeof CONTEXT_KINDS)[number];
export const CONTEXT_KIND_LABEL: Record<ContextKind, string> = { memory: "Memory", project: "Proyek" };
export const MAX_CONTEXT_ITEMS = 10;

export const contextRefSchema = z.object({ kind: z.enum(CONTEXT_KINDS, "Jenis konteks tidak valid"), id: z.uuid("Item tidak valid") });
export type ContextRef = z.infer<typeof contextRefSchema>;

export const setContextInputSchema = z.object({
  conversationId: z.uuid("Percakapan tidak valid"),
  items: z.array(contextRefSchema, "Daftar konteks tidak valid").max(MAX_CONTEXT_ITEMS, `Maksimal ${MAX_CONTEXT_ITEMS} item konteks`),
});

/** What the picker can offer: titles only. */
export type ContextCandidates = {
  memory: { id: string; title: string; category: MemoryCategory; pinned: boolean }[];
  projects: { id: string; name: string; status: ProjectStatus }[];
};

/** What rode along with a user message: titles and a size, never the text (the source may be edited later). */
export const messageContextSchema = z.object({
  items: z.array(z.object({ kind: z.enum(CONTEXT_KINDS), title: z.string() })).min(1).max(MAX_CONTEXT_ITEMS),
  chars: z.number().int().nonnegative(),
  truncated: z.boolean().optional(),
});
export type MessageContext = z.infer<typeof messageContextSchema>;

/** Reads the jsonb column defensively: anything that is not the expected shape is treated as "no context". */
export const parseMessageContext = (value: unknown): MessageContext | null => {
  const r = messageContextSchema.safeParse(value);
  return r.success ? r.data : null;
};

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  provider_id: string | null;
  model: string | null;
  status: MessageStatus;
  error: string | null;
  created_at: string;
  /** Snapshot of the attached context (user messages only). */
  context: MessageContext | null;
};
export const MESSAGE_COLUMNS = "id,role,content,provider_id,model,status,error,created_at,context";

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const titleSchema = z.preprocess(
  blankToUndefined,
  z.string("Judul wajib diisi").trim().min(1, "Judul wajib diisi").max(MAX_TITLE, `Judul maksimal ${MAX_TITLE} karakter`),
);

export const messageInputSchema = z.object({
  conversationId: z.uuid("Percakapan tidak valid"),
  providerId: z.string("Pilih provider").trim().min(1, "Pilih provider").max(64, "Provider tidak valid"),
  content: z
    .string("Pesan wajib diisi")
    .trim()
    .min(1, "Pesan wajib diisi")
    .max(MAX_USER_MESSAGE, `Pesan maksimal ${MAX_USER_MESSAGE.toLocaleString("id-ID")} karakter`),
});

export const TITLE_FIELDS = ["title"] as const;

export function parseTitleForm(formData: FormData) {
  return z.object({ title: titleSchema }).safeParse({ title: formData.get("title") });
}

/** First line of a message as a conversation title, cut at a word boundary where it can be. */
export function titleFromMessage(content: string, max = 60): string {
  const line = content.trim().split("\n", 1)[0].replace(/\s+/g, " ");
  if (line.length <= max) return line || DEFAULT_TITLE;
  const cut = line.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export const NO_PROVIDER_TITLE = "Belum ada provider AI yang terhubung";
export const NO_PROVIDER_HINT =
  "Integrasi menunggu hasil verifikasi Phase 0 (lihat docs/PRD.md §6). Riwayat percakapan tetap bisa dibaca.";

import { createHash } from "node:crypto";
import type { SourceTask } from "./ical";

export type ExistingTask = { id: string; external_id: string; external_hash: string | null; status: string };
export type NewRow = SourceTask & { external_hash: string };
export type UpdateRow = { id: string; title: string; due_date: string; description: string; external_hash: string };

/** Fingerprint of the fields the source owns. Equal hash = the source did not change since the last import. */
export const sourceHash = (t: Pick<SourceTask, "title" | "due_date" | "description">) =>
  createHash("sha256").update(JSON.stringify([t.title, t.due_date, t.description])).digest("hex");

/**
 * Decides what a sync does, per source item:
 * new -> insert; known and the source changed and the task is not done -> update the source-owned fields;
 * otherwise leave it alone (a local edit survives while the source stays the same; a done task is never reopened
 * or rewritten). Nothing is ever deleted because it left the feed.
 */
export function planSync(incoming: SourceTask[], existing: ExistingTask[]) {
  const known = new Map(existing.map((e) => [e.external_id, e]));
  const inserts: NewRow[] = [];
  const updates: UpdateRow[] = [];
  let unchanged = 0;
  for (const t of incoming) {
    const external_hash = sourceHash(t);
    const have = known.get(t.external_id);
    if (!have) inserts.push({ ...t, external_hash });
    else if (have.external_hash !== external_hash && have.status !== "done") {
      updates.push({ id: have.id, title: t.title, due_date: t.due_date, description: t.description, external_hash });
    } else unchanged++;
  }
  return { inserts, updates, unchanged };
}

/** "baru saja", "5 menit lalu", "3 jam lalu", "2 hari lalu". */
export function agoLabel(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60_000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hours = Math.floor(min / 60);
  return hours < 24 ? `${hours} jam lalu` : `${Math.floor(hours / 24)} hari lalu`;
}

/** `agoLabel` for an ISO timestamp, measured against `now`. */
export const agoSince = (iso: string, now: Date = new Date()) => agoLabel(now.getTime() - Date.parse(iso));

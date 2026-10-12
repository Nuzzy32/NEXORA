// Pure builder for the JSON export (SET-04, MEM-08). No server-only imports: it is unit-tested directly.

export const EXPORT_VERSION = 1;
export const EXPORT_TABLES = [
  "projects",
  "tasks",
  "project_notes",
  "memory_items",
  "conversations",
  "messages",
  "daily_briefs",
  "owner_settings",
  "integration_syncs",
  "documents",
] as const;
export type ExportTable = (typeof EXPORT_TABLES)[number];

/** A stable sort key per table, so paging with ranges never skips or repeats a row. */
export const EXPORT_ORDER: Record<ExportTable, string> = {
  projects: "id",
  tasks: "id",
  project_notes: "id",
  memory_items: "id",
  conversations: "id",
  messages: "id",
  daily_briefs: "id",
  owner_settings: "user_id",
  integration_syncs: "source",
  documents: "id",
};

/** PostgREST caps one response (1000 rows by default), so tables are read page by page. */
export const PAGE_SIZE = 1000;
export const MAX_ROWS = 50_000;

export type Row = Record<string, unknown>;
export type TableRead = { rows: Row[]; truncated: boolean };

/**
 * Reads pages (`from`..`to`, inclusive) until one comes back short. Asks for one row past `max` to tell
 * "exactly max" from "more than max"; the extra row is dropped and `truncated` is set.
 */
export async function readAll(
  fetchPage: (from: number, to: number) => Promise<Row[]>,
  { pageSize = PAGE_SIZE, max = MAX_ROWS }: { pageSize?: number; max?: number } = {},
): Promise<TableRead> {
  const rows: Row[] = [];
  while (rows.length <= max) {
    const from = rows.length;
    const to = Math.min(from + pageSize, max + 1) - 1;
    const page = await fetchPage(from, to);
    rows.push(...page);
    if (page.length < to - from + 1) break;
  }
  return rows.length > max ? { rows: rows.slice(0, max), truncated: true } : { rows, truncated: false };
}

/** The owner id is the same on every row and means nothing outside this database. */
function withoutOwner(row: Row): Row {
  const copy = { ...row };
  delete copy.user_id;
  return copy;
}

export type ExportFile = {
  version: typeof EXPORT_VERSION;
  exported_at: string;
  /** True when at least one table hit the row limit; `truncated_tables` names them. */
  truncated: boolean;
  truncated_tables: ExportTable[];
  counts: Record<ExportTable, number>;
  data: Record<ExportTable, Row[]>;
};

/** Only rows the owner can read are passed in; no env value, key or URL is ever part of the input. */
export function buildExport(now: Date, reads: Record<ExportTable, TableRead>): ExportFile {
  const data = {} as Record<ExportTable, Row[]>;
  const counts = {} as Record<ExportTable, number>;
  const truncatedTables: ExportTable[] = [];
  for (const table of EXPORT_TABLES) {
    const read = reads[table];
    data[table] = read.rows.map(withoutOwner);
    counts[table] = read.rows.length;
    if (read.truncated) truncatedTables.push(table);
  }
  return {
    version: EXPORT_VERSION,
    exported_at: now.toISOString(),
    truncated: truncatedTables.length > 0,
    truncated_tables: truncatedTables,
    counts,
    data,
  };
}

export const exportFilename = (day: string) => `nexora-export-${day}.json`;

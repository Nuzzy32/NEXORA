import { addDays, daysBetween, localDate } from "@/lib/date";
import type { ProjectStatus, ProjectWithCounts } from "@/features/projects/schema";
import { PRIORITY_RANK, type TaskPriority, type TaskStatus } from "@/features/tasks/schema";
import { estimateCostUSD, MAX_OUTPUT_TOKENS } from "./schema";

// What leaves the app for the Anthropic API (D-003, CLAUDE.md rule 10): titles, status, dates and counts only.
// Never: note or memory bodies, descriptions, email or account identity, row ids. Everything below is built from
// an explicit allow-list of fields, so a new column cannot leak by accident.

export const MAX_PROJECTS = 10;
export const COURSEWORK_DAYS = 14;
/** Hard cap on the serialized input; larger data is cut down in steps and the input says so. */
export const MAX_INPUT_CHARS = 16_000;

export type RawTask = {
  project_id: string | null;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  updated_at: string;
};
/** A task finished in a project, only to know when the project last moved. */
export type RawDone = { project_id: string | null; completed_at: string };
export type RawDecision = { project_id: string; title: string; updated_at: string };
export type RawCoursework = { title: string; due_date: string };

export type BriefSource = {
  today: string;
  projects: readonly ProjectWithCounts[];
  openTasks: readonly RawTask[];
  recentDone: readonly RawDone[];
  decisions: readonly RawDecision[];
  coursework: readonly RawCoursework[];
};

export type BriefInput = {
  today: string;
  projects: {
    name: string;
    status: ProjectStatus;
    starts_on: string | null;
    due_on: string | null;
    tasks_open: number;
    tasks_done: number;
    tasks_overdue: number;
    last_activity: string;
    days_since_activity: number;
    top_open_tasks: { title: string; status: TaskStatus; priority: TaskPriority; due: string | null; due_in_days: number | null }[];
    recent_decision_titles: string[];
  }[];
  coursework_due_soon: { title: string; due: string; due_in_days: number }[];
  /** Present only when something was cut; the model is told to mention it. */
  note?: string;
};

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** One line of plain text: no control characters, no email or uuid that a title happens to contain, length capped. */
export function clean(text: string, max: number): { text: string; clipped: boolean } {
  const t = text.replace(EMAIL, "[email]").replace(UUID, "[id]").replace(/\p{Cc}+/gu, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? { text: `${t.slice(0, max - 1)}…`, clipped: true } : { text: t, clipped: false };
}

// Progressively smaller shapes, tried in order until the input fits MAX_INPUT_CHARS.
const LEVELS = [
  { projects: MAX_PROJECTS, tasks: 6, decisions: 3, coursework: 20 },
  { projects: MAX_PROJECTS, tasks: 4, decisions: 2, coursework: 10 },
  { projects: 8, tasks: 3, decisions: 1, coursework: 8 },
  { projects: 6, tasks: 2, decisions: 0, coursework: 5 },
] as const;

const latest = (...dates: (string | undefined)[]) => dates.filter((d): d is string => !!d).sort().at(-1)!;

const byImportance = (a: RawTask, b: RawTask) =>
  Number(b.status === "in_progress") - Number(a.status === "in_progress") ||
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
  (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31");

function build(src: BriefSource, level: (typeof LEVELS)[number]): { input: BriefInput; clipped: boolean; omitted: boolean } {
  const { today } = src;
  let clipped = false;
  const c = (s: string, max: number) => {
    const r = clean(s, max);
    clipped ||= r.clipped;
    return r.text;
  };
  const inDays = (d: string) => daysBetween(today, d);

  const shown = src.projects.slice(0, level.projects);
  const projects = shown.map((p) => {
    const open = src.openTasks.filter((t) => t.project_id === p.id);
    const lastDone = src.recentDone.filter((t) => t.project_id === p.id).map((t) => localDate(t.completed_at));
    const last = latest(localDate(p.updated_at), ...open.map((t) => localDate(t.updated_at)), ...lastDone);
    return {
      name: c(p.name, 80),
      status: p.status,
      starts_on: p.starts_on,
      due_on: p.due_on,
      tasks_open: p.open_count,
      tasks_done: p.done_count,
      tasks_overdue: open.filter((t) => t.due_date !== null && t.due_date < today).length,
      last_activity: last,
      days_since_activity: Math.max(0, daysBetween(last, today)),
      top_open_tasks: open
        .toSorted(byImportance)
        .slice(0, level.tasks)
        .map((t) => ({
          title: c(t.title, 100),
          status: t.status,
          priority: t.priority,
          due: t.due_date,
          due_in_days: t.due_date ? inDays(t.due_date) : null,
        })),
      recent_decision_titles: src.decisions
        .filter((d) => d.project_id === p.id)
        .toSorted((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, level.decisions)
        .map((d) => c(d.title, 100)),
    };
  });

  const horizon = addDays(today, COURSEWORK_DAYS);
  const coursework = src.coursework
    .filter((t) => t.due_date <= horizon)
    .toSorted((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, level.coursework)
    .map((t) => ({ title: c(t.title, 100), due: t.due_date, due_in_days: inDays(t.due_date) }));

  return {
    input: { today, projects, coursework_due_soon: coursework },
    clipped,
    omitted: shown.length < src.projects.length,
  };
}

/**
 * Builds the payload for the model from already-loaded rows. Pure: same rows in, same input out.
 * If it does not fit MAX_INPUT_CHARS it is shrunk in steps and `note` says "dipotong".
 */
export function buildBriefInput(src: BriefSource): BriefInput {
  let result = build(src, LEVELS[0]);
  let level = 0;
  while (JSON.stringify(result.input).length > MAX_INPUT_CHARS && level < LEVELS.length - 1) {
    result = build(src, LEVELS[++level]);
  }
  if (level > 0 || result.omitted || result.clipped) {
    result.input.note =
      "Sebagian data dipotong agar muat (proyek, task, atau judul panjang); sebutkan bahwa ringkasan ini berdasarkan data yang dipotong.";
  }
  return result.input;
}

/** The exact text sent as the user message. */
export const serializeBriefInput = (input: BriefInput): string => JSON.stringify(input);

/** The brief has nothing to say when there is no running project and no coursework due soon. */
export const isInputEmpty = (input: BriefInput): boolean => input.projects.length === 0 && input.coursework_due_soon.length === 0;

/** Rough ceiling for the cost line shown before opt-in: 3 chars per token is conservative for Indonesian text. */
export const PROMPT_OVERHEAD_TOKENS = 600;
export const MAX_INPUT_TOKENS_ESTIMATE = Math.ceil(MAX_INPUT_CHARS / 3) + PROMPT_OVERHEAD_TOKENS;
export const maxCostEstimateUSD = (): number => estimateCostUSD(MAX_INPUT_TOKENS_ESTIMATE, MAX_OUTPUT_TOKENS);

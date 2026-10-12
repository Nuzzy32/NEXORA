import { searchTerm } from "@/lib/search";

// Pure model of the command palette, shared by the server action and the client component.
// Keep it free of server-only imports (and zod): it ships to the browser.

export const MIN_QUERY_LENGTH = 2;
/** Rows per category (tasks, projects, notes). */
export const RESULT_LIMIT = 5;

export type SearchHit = {
  id: string;
  kind: "task" | "project" | "note";
  title: string;
  /** Project name (task, note) or the project's status label. */
  hint?: string;
  href: string;
};
export type SearchResults = { tasks: SearchHit[]; projects: SearchHit[]; notes: SearchHit[] };
export const EMPTY_RESULTS: SearchResults = { tasks: [], projects: [], notes: [] };

// ---- links -----------------------------------------------------------------

/** `status=all` so a finished task is still listed; /tasks filters by `q`. */
export const taskHref = (title: string) => `/tasks?status=all&q=${encodeURIComponent(title)}`;
export const projectHref = (id: string) => `/projects/${encodeURIComponent(id)}`;
/** The project's notes tab, filtered by the term that matched. */
export const noteHref = (projectId: string, term: string) =>
  `${projectHref(projectId)}?tab=notes&q=${encodeURIComponent(term)}`;

// ---- palette layout --------------------------------------------------------

type LinkOption = { key: string; kind: "go" | SearchHit["kind"]; title: string; hint?: string; href: string };
type CreateOption = {
  key: "create";
  kind: "create";
  title: string;
  /** Submitted as the new task's title. */
  taskTitle: string;
};
export type PaletteOption = LinkOption | CreateOption;
/** `start` is the index of the section's first option in the flat list the keyboard walks. */
export type PaletteSection = { id: string; label: string; start: number; options: PaletteOption[] };
export type Palette = { sections: PaletteSection[]; options: PaletteOption[] };

const GO_TO = [
  { id: "dashboard", title: "Dashboard", href: "/dashboard" },
  { id: "tasks", title: "Tasks", href: "/tasks" },
  { id: "overdue", title: "Task terlambat", href: "/tasks?status=overdue" },
  { id: "projects", title: "Projects", href: "/projects" },
  { id: "ai", title: "AI Workspace", href: "/ai" },
  { id: "memory", title: "Memory", href: "/memory" },
  { id: "learning", title: "Learning", href: "/learning" },
  { id: "settings", title: "Settings", href: "/settings" },
];

const hitOption = (h: SearchHit): LinkOption => ({
  key: `${h.kind}:${h.id}`,
  kind: h.kind,
  title: h.title,
  hint: h.hint,
  href: h.href,
});

/**
 * Sections in a fixed order (Tasks, Proyek, Catatan, Aksi); empty ones are dropped, but "Aksi" always has
 * "Buat task". Below MIN_QUERY_LENGTH there is nothing to search yet, so it offers the "Pergi ke" shortcuts.
 */
export function buildPalette(query: string, results: SearchResults | null): Palette {
  let groups: { id: string; label: string; options: PaletteOption[] }[];
  if (searchTerm(query).length < MIN_QUERY_LENGTH) {
    groups = [
      {
        id: "go",
        label: "Pergi ke",
        options: GO_TO.map((g) => ({ key: `go:${g.id}`, kind: "go", title: g.title, href: g.href })),
      },
    ];
  } else {
    const r = results ?? EMPTY_RESULTS;
    const taskTitle = query.trim();
    groups = [
      { id: "tasks", label: "Tasks", options: r.tasks.map(hitOption) },
      { id: "projects", label: "Proyek", options: r.projects.map(hitOption) },
      { id: "notes", label: "Catatan", options: r.notes.map(hitOption) },
      {
        id: "actions",
        label: "Aksi",
        options: [{ key: "create", kind: "create", title: `Buat task “${taskTitle}”`, taskTitle }],
      },
    ];
  }

  const sections: PaletteSection[] = [];
  let start = 0;
  for (const g of groups) {
    if (g.options.length === 0) continue;
    sections.push({ ...g, start });
    start += g.options.length;
  }
  return { sections, options: sections.flatMap((s) => s.options) };
}

/**
 * Next active option for a list of `count` options. Arrows wrap around; -1 means "none yet" and
 * is also returned for an empty list. `current` may be stale (the list can shrink under it).
 */
export function moveActive(current: number, key: "ArrowDown" | "ArrowUp" | "Home" | "End", count: number): number {
  if (count <= 0) return -1;
  const at = Math.min(current, count - 1);
  switch (key) {
    case "ArrowDown":
      return (at + 1) % count;
    case "ArrowUp":
      return at <= 0 ? count - 1 : at - 1;
    case "Home":
      return 0;
    case "End":
      return count - 1;
  }
}

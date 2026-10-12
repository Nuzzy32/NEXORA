import { TASKS_VIEWS, type TasksView } from "./schema";

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const isView = (v: unknown): v is TasksView => TASKS_VIEWS.some((x) => x === v);

/** Whether the URL alone decides the view, so the saved preference does not need to be read (D-019). */
export function urlDecidesView(sp: Params): boolean {
  return isView(one(sp.view)) || one(sp.status) !== undefined || one(sp.due) !== undefined;
}

/**
 * `view` in the URL wins; a link that carries a status or a day (palette, dashboard) still opens the list (D-019);
 * otherwise the saved preference decides.
 */
export function resolveTasksView(sp: Params, preferred: TasksView): TasksView {
  const view = one(sp.view);
  if (isView(view)) return view;
  return one(sp.status) !== undefined || one(sp.due) !== undefined ? "list" : preferred;
}

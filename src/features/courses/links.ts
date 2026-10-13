import type { SupabaseClient } from "@supabase/supabase-js";
import { GRADE_POINTS, GRADES, type Course, type Grade } from "./schema";

// D-033: tying imported e-learning tasks to a course, the IPK target, and study minutes. Pure except linkElearningTasks.

type CourseKey = Pick<Course, "id" | "name" | "code">;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The course an imported e-learning task belongs to, or null. The Moodle course code (e.g. "SIA302") in the task's
 * "Mata kuliah: ..." line wins; otherwise the title must start with the course name followed by " · " (case-insensitive).
 * Ambiguous matches (two courses) link nothing.
 */
export function matchCourse(task: { title: string; description: string | null }, courses: CourseKey[]): string | null {
  const byCode = courses.filter((c) => c.code && new RegExp(`(^|[^A-Za-z0-9])${escape(c.code.trim())}([^A-Za-z0-9]|$)`, "i").test(task.description ?? ""));
  if (byCode.length === 1) return byCode[0].id;
  if (byCode.length > 1) return null;
  const title = task.title.toLowerCase();
  const byName = courses.filter((c) => title.startsWith(`${c.name.trim().toLowerCase()} · `));
  return byName.length === 1 ? byName[0].id : null;
}

/**
 * Links the owner's unlinked e-learning tasks to matching courses. Runs after a sync and after a course is saved.
 * Every query names `userId`, so the cron's service-role client stays within one owner. Returns how many were linked.
 */
export async function linkElearningTasks(supabase: SupabaseClient, userId: string): Promise<number> {
  const [courses, tasks] = await Promise.all([
    supabase.from("courses").select("id,name,code").eq("user_id", userId).limit(500),
    supabase.from("tasks").select("id,title,description").eq("user_id", userId).eq("source", "elearning").is("course_id", null).limit(1000),
  ]);
  if (courses.error || tasks.error || courses.data.length === 0) return 0;
  const groups = new Map<string, string[]>();
  for (const t of tasks.data as { id: string; title: string; description: string | null }[]) {
    const id = matchCourse(t, courses.data as CourseKey[]);
    if (id) groups.set(id, [...(groups.get(id) ?? []), t.id]);
  }
  let linked = 0;
  for (const [courseId, ids] of groups) {
    const { data } = await supabase.from("tasks").update({ course_id: courseId }).eq("user_id", userId).is("course_id", null).in("id", ids).select("id");
    linked += data?.length ?? 0;
  }
  return linked;
}

export type TargetPlan =
  | { kind: "none" } // nothing ungraded left to plan for
  | { kind: "reached"; needed: number; remaining: number } // even E keeps the target
  | { kind: "impossible"; needed: number; remaining: number } // more than A on every remaining course
  | { kind: "plan"; needed: number; remaining: number; letter: Grade };

/** Average grade points the ungraded courses need so the IPK reaches `target`, and the lowest letter at or above it. */
export function targetPlan(courses: Pick<Course, "credits" | "grade">[], target: number): TargetPlan {
  const graded = courses.filter((c) => c.grade !== null);
  const remaining = courses.filter((c) => c.grade === null).reduce((n, c) => n + c.credits, 0);
  if (remaining === 0) return { kind: "none" };
  const credits = graded.reduce((n, c) => n + c.credits, 0);
  const points = graded.reduce((n, c) => n + GRADE_POINTS[c.grade as Grade] * c.credits, 0);
  const needed = Math.round(((target * (credits + remaining) - points) / remaining) * 100) / 100;
  if (needed <= 0) return { kind: "reached", needed, remaining };
  if (needed > 4) return { kind: "impossible", needed, remaining };
  const letter = [...GRADES].reverse().find((g) => GRADE_POINTS[g] >= needed) ?? "A";
  return { kind: "plan", needed, remaining, letter };
}

/** Minutes per course (null = no course) for sessions whose local end date (`dayOf`) is on or after `sinceISO`. */
export function minutesByCourse(
  sessions: { course_id: string | null; minutes: number; ended_at: string }[],
  sinceISO: string,
  dayOf: (timestamp: string) => string,
) {
  const out = new Map<string | null, number>();
  for (const s of sessions) if (dayOf(s.ended_at) >= sinceISO) out.set(s.course_id, (out.get(s.course_id) ?? 0) + s.minutes);
  return out;
}

/** "1 j 25 m" / "40 m". */
export const formatMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} j ${m % 60} m` : `${m} m`);

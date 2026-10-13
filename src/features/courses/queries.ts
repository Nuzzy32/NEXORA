import "server-only";
import { requireUser } from "@/lib/auth/session";
import { COURSE_COLUMNS, SESSION_COLUMNS, type Course, type CourseSession } from "./schema";

/** All courses and their weekly sessions (RLS). Personal scale: capped, no paging. */
export async function listCourses(): Promise<{ courses: Course[]; sessions: CourseSession[] }> {
  const { supabase } = await requireUser();
  const [courses, sessions] = await Promise.all([
    supabase.from("courses").select(COURSE_COLUMNS).order("semester", { ascending: false }).order("name").limit(500).overrideTypes<Course[]>(),
    supabase.from("course_sessions").select(SESSION_COLUMNS).order("weekday").order("starts_at").limit(1000).overrideTypes<CourseSession[]>(),
  ]);
  if (courses.error || sessions.error) throw new Error("Gagal memuat mata kuliah.");
  return { courses: courses.data, sessions: sessions.data };
}

export type StudySession = { course_id: string | null; minutes: number; ended_at: string };

/** Focus sessions of the last 60 days (enough for "this week" and a little history). */
export async function listStudySessions(): Promise<StudySession[]> {
  const { supabase } = await requireUser();
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("study_sessions")
    .select("course_id,minutes,ended_at")
    .gte("ended_at", since)
    .order("ended_at", { ascending: false })
    .limit(2000)
    .overrideTypes<StudySession[]>();
  if (error) throw new Error("Gagal memuat sesi belajar.");
  return data;
}

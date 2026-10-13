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

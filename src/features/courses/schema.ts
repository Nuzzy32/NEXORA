import { z } from "zod";

// Kuliah (D-032): courses with credits and a grade, weekly sessions, and IPS/IPK on the UNAIR letter scale.

export const GRADES = ["A", "AB", "B", "BC", "C", "D", "E"] as const;
export type Grade = (typeof GRADES)[number];
export const GRADE_POINTS: Record<Grade, number> = { A: 4, AB: 3.5, B: 3, BC: 2.5, C: 2, D: 1, E: 0 };

export const WEEKDAY_LABEL = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;

export type Course = {
  id: string;
  name: string;
  code: string | null;
  credits: number;
  semester: number;
  lecturer: string | null;
  grade: Grade | null;
};
export const COURSE_COLUMNS = "id,name,code,credits,semester,lecturer,grade";

export type CourseSession = { id: string; course_id: string; weekday: number; starts_at: string; ends_at: string; room: string | null };
export const SESSION_COLUMNS = "id,course_id,weekday,starts_at,ends_at,room";

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const optionalText = (max: number, label: string) =>
  z.preprocess(blankToNull, z.string().trim().max(max, `${label} maksimal ${max} karakter`).nullable());

export const COURSE_FIELDS = ["name", "code", "credits", "semester", "lecturer", "grade"] as const;
export const courseInputSchema = z.object({
  name: z.string("Nama wajib diisi").trim().min(1, "Nama wajib diisi").max(160, "Nama maksimal 160 karakter"),
  code: optionalText(40, "Kode"),
  credits: z.coerce.number("SKS tidak valid").int("SKS harus bilangan bulat").min(1, "SKS minimal 1").max(24, "SKS maksimal 24"),
  semester: z.coerce.number("Semester tidak valid").int("Semester harus bilangan bulat").min(1, "Semester minimal 1").max(14, "Semester maksimal 14"),
  lecturer: optionalText(160, "Nama dosen"),
  grade: z.preprocess(blankToNull, z.enum(GRADES, "Nilai tidak valid").nullable()),
});
export const parseCourseForm = (formData: FormData) =>
  courseInputSchema.safeParse(Object.fromEntries(COURSE_FIELDS.map((f) => [f, formData.get(f) ?? ""])));

const time = z.string("Jam tidak valid").regex(/^([01]\d|2[0-3]):[0-5]\d(:00)?$/, "Jam tidak valid").transform((t) => t.slice(0, 5));
export const SESSION_FIELDS = ["weekday", "starts_at", "ends_at", "room"] as const;
export const sessionInputSchema = z
  .object({
    weekday: z.coerce.number("Hari tidak valid").int().min(1, "Hari tidak valid").max(7, "Hari tidak valid"),
    starts_at: time,
    ends_at: time,
    room: optionalText(80, "Ruang"),
  })
  .refine((s) => s.ends_at > s.starts_at, { path: ["ends_at"], message: "Jam selesai harus setelah jam mulai" });
export const parseSessionForm = (formData: FormData) =>
  sessionInputSchema.safeParse(Object.fromEntries(SESSION_FIELDS.map((f) => [f, formData.get(f) ?? ""])));

export type GpaSummary = {
  /** Cumulative over every graded course; null when nothing is graded yet. */
  ipk: number | null;
  gradedCredits: number;
  totalCredits: number;
  /** Per semester, newest first. */
  semesters: { semester: number; ips: number | null; credits: number; gradedCredits: number }[];
};

const weighted = (cs: Pick<Course, "credits" | "grade">[]) => {
  const graded = cs.filter((c) => c.grade !== null);
  const credits = graded.reduce((n, c) => n + c.credits, 0);
  const points = graded.reduce((n, c) => n + GRADE_POINTS[c.grade as Grade] * c.credits, 0);
  return { value: credits === 0 ? null : Math.round((points / credits) * 100) / 100, credits };
};

/** IPS = sum(points x SKS) / sum(SKS) over graded courses of a semester; IPK the same over all of them. Rounded to 2 decimals. */
export function gpaSummary(courses: Pick<Course, "credits" | "grade" | "semester">[]): GpaSummary {
  const all = weighted(courses);
  const semesters = [...new Set(courses.map((c) => c.semester))]
    .sort((a, b) => b - a)
    .map((semester) => {
      const cs = courses.filter((c) => c.semester === semester);
      const w = weighted(cs);
      return { semester, ips: w.value, credits: cs.reduce((n, c) => n + c.credits, 0), gradedCredits: w.credits };
    });
  return { ipk: all.value, gradedCredits: all.credits, totalCredits: courses.reduce((n, c) => n + c.credits, 0), semesters };
}

/** "3,75" */
export const formatGpa = (v: number | null) => (v === null ? "–" : v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/** ISO weekday (1 = Senin) of a YYYY-MM-DD date. */
export function isoWeekday(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** "08:00" from Postgres "08:00:00". */
export const hhmm = (t: string) => t.slice(0, 5);

import type { Metadata } from "next";
import { Suspense } from "react";
import { CourseForm } from "@/components/courses/course-form";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClass } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icons";
import { ListSkeleton } from "@/components/ui/skeleton";
import { listCourses } from "@/features/courses/queries";
import { formatGpa, gpaSummary, hhmm, WEEKDAY_LABEL, type Course, type CourseSession } from "@/features/courses/schema";

export const metadata: Metadata = { title: "Kuliah" };

export default function CoursesPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <CoursesContent />
    </Suspense>
  );
}

const addButton = buttonClass("primary", "gap-2");

async function CoursesContent() {
  const { courses, sessions } = await listCourses();
  const gpa = gpaSummary(courses);
  const current = gpa.semesters[0]?.semester ?? 1;
  const byCourse = new Map(courses.map((c) => [c.id, c]));
  const week = [1, 2, 3, 4, 5, 6, 7]
    .map((d) => ({ day: d, items: sessions.filter((s) => s.weekday === d && byCourse.get(s.course_id)?.semester === current) }))
    .filter((d) => d.items.length > 0);

  const add = (
    <FormDialog title="Tambah mata kuliah" triggerClassName={addButton} trigger={<><Icon name="plus" className="size-4" /> Mata kuliah</>} draftKey="course:new">
      <CourseForm defaultSemester={current} />
    </FormDialog>
  );

  return (
    <>
      <PageHeader
        title="Kuliah"
        eyebrow="Akademik"
        description="Mata kuliah per semester, nilai dengan IPS dan IPK otomatis (skala A–E UNAIR), dan jadwal mingguan."
        actions={add}
      />
      {courses.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon="book" title="Belum ada mata kuliah" hint="Tambahkan mata kuliah semester ini beserta SKS dan jadwalnya. Nilai bisa diisi belakangan.">
            {add}
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
            {[
              ["IPK", formatGpa(gpa.ipk)],
              [`IPS semester ${current}`, formatGpa(gpa.semesters[0]?.ips ?? null)],
              ["SKS bernilai", `${gpa.gradedCredits}/${gpa.totalCredits}`],
            ].map(([label, value]) => (
              <div key={label} className="bg-surface px-4 py-3">
                <dt className="font-mono text-[11px] text-muted">{label}</dt>
                <dd className="mt-1 font-mono text-xl text-fg">{value}</dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="week">
            <h2 id="week" className="mb-2 text-[15px] font-medium tracking-[-0.01em]">Jadwal semester {current}</h2>
            {week.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface px-4 py-3 text-[13px] text-muted">
                Belum ada jadwal. Buka mata kuliah lalu tambahkan hari dan jamnya.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {week.map(({ day, items }) => (
                  <div key={day} className="rounded-lg border border-line bg-surface p-3">
                    <h3 className="mb-1.5 font-mono text-[11px] tracking-[0.04em] text-muted uppercase">{WEEKDAY_LABEL[day]}</h3>
                    <ul className="space-y-1.5">
                      {items.map((s) => (
                        <li key={s.id} className="flex gap-3 text-[13px]">
                          <span className="shrink-0 font-mono text-[12px] text-accent">{hhmm(s.starts_at)}–{hhmm(s.ends_at)}</span>
                          <span className="min-w-0">
                            <span className="block truncate">{byCourse.get(s.course_id)?.name}</span>
                            {s.room && <span className="block truncate font-mono text-[11px] text-muted">{s.room}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {gpa.semesters.map((sem) => (
            <section key={sem.semester} aria-labelledby={`sem-${sem.semester}`}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4">
                <h2 id={`sem-${sem.semester}`} className="text-[15px] font-medium tracking-[-0.01em]">Semester {sem.semester}</h2>
                <p className="font-mono text-[11px] text-muted">
                  {sem.credits} SKS · IPS {formatGpa(sem.ips)}
                  {sem.gradedCredits < sem.credits && ` (${sem.gradedCredits} SKS sudah bernilai)`}
                </p>
              </div>
              <CourseList courses={courses.filter((c) => c.semester === sem.semester)} sessions={sessions} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function CourseList({ courses, sessions }: { courses: Course[]; sessions: CourseSession[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {courses.map((c) => {
        const own = sessions.filter((s) => s.course_id === c.id);
        return (
          <li key={c.id}>
            <FormDialog
              title="Ubah mata kuliah"
              triggerLabel={`Ubah mata kuliah: ${c.name}`}
              triggerClassName="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-raised/50"
              trigger={
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px]">{c.name}</span>
                    <span className="block truncate font-mono text-[11px] text-muted">
                      {[c.code, `${c.credits} SKS`, c.lecturer, own.map((s) => `${WEEKDAY_LABEL[s.weekday]} ${hhmm(s.starts_at)}`).join(", ")].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span
                    className={
                      "grid h-7 min-w-9 shrink-0 place-items-center rounded-md border px-1.5 font-mono text-[12px] font-semibold " +
                      (c.grade ? "border-line-strong text-fg" : "border-dashed border-line text-faint")
                    }
                  >
                    {c.grade ?? "–"}
                  </span>
                </>
              }
            >
              <CourseForm course={c} sessions={own} />
            </FormDialog>
          </li>
        );
      })}
    </ul>
  );
}

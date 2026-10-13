import type { Metadata } from "next";
import { io } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CourseForm } from "@/components/courses/course-form";
import { FocusTimer } from "@/components/courses/focus-timer";
import { PageHeader } from "@/components/layout/page-header";
import { TaskList } from "@/components/tasks/task-row";
import { buttonClass } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";
import { ListSkeleton } from "@/components/ui/skeleton";
import { formatMinutes, minutesByCourse } from "@/features/courses/links";
import { listCourses, listStudySessions } from "@/features/courses/queries";
import { hhmm, isoWeekday, WEEKDAY_LABEL } from "@/features/courses/schema";
import { cardStats } from "@/features/learning/flashcards";
import { listDocuments, listFlashcards } from "@/features/learning/queries";
import { listProjectOptions, listTasks } from "@/features/tasks/queries";
import { addDays, localDate, todayISO } from "@/lib/date";

export const metadata: Metadata = { title: "Mata kuliah" };

type Props = PageProps<"/courses/[id]">;

export default function CoursePage({ params }: Props) {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <CourseContent params={params} />
    </Suspense>
  );
}

const h2 = "mb-2 text-[15px] font-medium tracking-[-0.01em]";

async function CourseContent({ params }: Pick<Props, "params">) {
  const { id } = await params;
  await io(); // "today", "this week" and due cards depend on the clock
  const { courses, sessions } = await listCourses();
  const course = courses.find((c) => c.id === id);
  if (!course) notFound();
  const [tasks, projects, docs, cards, study] = await Promise.all([
    listTasks({ status: "open", priority: "all", courseId: course.id }),
    listProjectOptions(),
    listDocuments(course.id),
    listFlashcards(),
    listStudySessions(),
  ]);
  const today = todayISO();
  const monday = addDays(today, 1 - isoWeekday(today));
  const weekMinutes = minutesByCourse(study, monday, localDate).get(course.id) ?? 0;
  const own = sessions.filter((s) => s.course_id === course.id);
  const docIds = new Set(docs.map((d) => d.id));
  const stats = cardStats(cards.filter((c) => docIds.has(c.document_id)), today);

  return (
    <>
      <Link href="/courses" className="mb-4 inline-flex min-h-9 items-center gap-1.5 text-[13px] text-muted hover:text-fg pointer-coarse:min-h-11">
        <Icon name="arrowRight" className="size-4 rotate-180" /> Kuliah
      </Link>
      <PageHeader
        title={<span className="[overflow-wrap:anywhere]">{course.name}</span>}
        eyebrow={[course.code, `Semester ${course.semester}`, `${course.credits} SKS`, course.grade ? `Nilai ${course.grade}` : null].filter(Boolean).join(" · ")}
        description={course.lecturer ?? undefined}
        actions={
          <FormDialog title="Ubah mata kuliah" triggerClassName={buttonClass("ghost", "gap-2")} trigger={<><Icon name="edit" className="size-4" /> Ubah</>}>
            <CourseForm course={course} sessions={own} />
          </FormDialog>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-6 lg:col-span-3">
          <section aria-labelledby="c-tasks">
            <h2 id="c-tasks" className={h2}>Tugas terbuka ({tasks.length})</h2>
            {tasks.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface px-4 py-3 text-[13px] text-muted">
                Tidak ada tugas terbuka. Tugas e-learning terhubung otomatis bila kode atau nama mata kuliah ini cocok dengan Moodle.
              </p>
            ) : (
              <TaskList tasks={tasks} today={today} projects={projects} />
            )}
          </section>

          <section aria-labelledby="c-docs">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="c-docs" className={h2 + " mb-0"}>Materi ({docs.length})</h2>
              {stats.due > 0 && (
                <Link href={`/learning/review?c=${course.id}`} className={buttonClass("primary")}>
                  Latihan flashcard ({stats.due})
                </Link>
              )}
            </div>
            {docs.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface px-4 py-3 text-[13px] text-muted">
                Belum ada PDF. Unggah di Learning lalu pilih mata kuliah ini pada kartunya.
              </p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {docs.map((d) => (
                  <li key={d.id}>
                    <Link href={`/learning/${d.id}`} className="flex min-h-11 items-center gap-3 px-4 py-2 hover:bg-raised/50">
                      <Icon name="book" className="size-4 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate text-[14px]">{d.title}</span>
                      <span className="shrink-0 font-mono text-[11px] text-muted">{d.summary ? "diringkas" : d.status === "ready" ? "PDF" : "tertunda"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {stats.total > 0 && (
              <p className="mt-2 font-mono text-[11px] text-muted">
                {stats.total} flashcard · {stats.due} jatuh tempo · {stats.mastered} dikuasai
              </p>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-6 lg:col-span-2">
          <FocusTimer courses={[{ id: course.id, name: course.name }]} defaultCourseId={course.id} />
          <p className="-mt-4 font-mono text-[11px] text-muted">Belajar minggu ini: {formatMinutes(weekMinutes)}</p>
          <section aria-labelledby="c-sched" className="rounded-lg border border-line bg-surface p-4">
            <h2 id="c-sched" className={h2}>Jadwal</h2>
            {own.length === 0 ? (
              <p className="text-[13px] text-muted">Belum ada jadwal. Tambahkan lewat tombol Ubah.</p>
            ) : (
              <ul className="space-y-1.5">
                {own.map((s) => (
                  <li key={s.id} className="flex gap-3 text-[13px]">
                    <span className="w-14 shrink-0">{WEEKDAY_LABEL[s.weekday]}</span>
                    <span className="font-mono text-[12px] text-accent">{hhmm(s.starts_at)}–{hhmm(s.ends_at)}</span>
                    <span className="min-w-0 truncate text-muted">{s.room}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

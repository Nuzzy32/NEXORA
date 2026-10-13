"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Button, inputClass } from "@/components/ui/button";
import { useCloseOnSuccess } from "@/components/ui/dialog";
import { ConfirmDelete, Field, FormActions, useFieldHelpers } from "@/components/ui/form";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { addSession, createCourse, deleteCourse, deleteSession, updateCourse } from "@/features/courses/actions";
import { GRADES, hhmm, WEEKDAY_LABEL, type Course, type CourseSession } from "@/features/courses/schema";
import { IDLE } from "@/lib/action-state";

/** Add or edit a course; when editing, its weekly sessions are managed below the form. */
export function CourseForm({ course, sessions = [], defaultSemester }: { course?: Course; sessions?: CourseSession[]; defaultSemester?: number }) {
  const [state, formAction, pending] = useActionState(course ? updateCourse.bind(null, course.id) : createCourse, IDLE);
  useCloseOnSuccess(state, course ? "Mata kuliah diperbarui" : "Mata kuliah ditambahkan");
  const { v, err, onInput } = useFieldHelpers(state);
  const described = (f: string) => ({ "aria-invalid": Boolean(err(f)), "aria-describedby": err(f) ? `${f}-error` : undefined });

  return (
    <div className="space-y-5">
      <form action={formAction} onInput={onInput} className="space-y-4" noValidate>
        <Field label="Nama mata kuliah" htmlFor="name" error={err("name")}>
          <input id="name" name="name" required maxLength={160} autoFocus defaultValue={v("name", course?.name)} className={inputClass} {...described("name")} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Kode" htmlFor="code" error={err("code")}>
            <input id="code" name="code" maxLength={40} defaultValue={v("code", course?.code)} className={inputClass + " font-mono"} {...described("code")} />
          </Field>
          <Field label="SKS" htmlFor="credits" error={err("credits")}>
            <input id="credits" name="credits" type="number" inputMode="numeric" min={1} max={24} required defaultValue={v("credits", course ? String(course.credits) : "3")} className={inputClass + " font-mono"} {...described("credits")} />
          </Field>
          <Field label="Semester" htmlFor="semester" error={err("semester")}>
            <input id="semester" name="semester" type="number" inputMode="numeric" min={1} max={14} required defaultValue={v("semester", String(course?.semester ?? defaultSemester ?? 1))} className={inputClass + " font-mono"} {...described("semester")} />
          </Field>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Dosen (opsional)" htmlFor="lecturer" error={err("lecturer")}>
            <input id="lecturer" name="lecturer" maxLength={160} defaultValue={v("lecturer", course?.lecturer)} className={inputClass} {...described("lecturer")} />
          </Field>
          <Field label="Nilai" htmlFor="grade" error={err("grade")}>
            <select id="grade" name="grade" defaultValue={v("grade", course?.grade)} className={inputClass + " font-mono"}>
              <option value="">Belum</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>
        </div>
        <FormActions pending={pending} message={state.message} saveLabel={course ? "Simpan" : "Tambah mata kuliah"} />
      </form>
      {course && <SessionsEditor courseId={course.id} sessions={sessions} />}
      {course && (
        <ConfirmDelete action={deleteCourse.bind(null, course.id)} label="Hapus mata kuliah" message="Hapus beserta jadwalnya?" doneMessage="Mata kuliah dihapus" />
      )}
    </div>
  );
}

function SessionsEditor({ courseId, sessions }: { courseId: string; sessions: CourseSession[] }) {
  const [state, formAction, pending] = useActionState(addSession.bind(null, courseId), IDLE);
  const { v, err, onInput } = useFieldHelpers(state);
  const [removing, startRemove] = useTransition();
  const { notify } = useToast();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "ok") form.current?.reset();
  }, [state]);

  return (
    <section aria-labelledby="sessions" className="border-t border-line-strong pt-4">
      <h3 id="sessions" className="mb-2 font-mono text-[11px] tracking-[0.04em] text-muted uppercase">Jadwal mingguan</h3>
      {sessions.length > 0 && (
        <ul className="mb-3 divide-y divide-line rounded-md border border-line">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-3 py-1.5 text-[13px]">
              <span className="w-14 shrink-0">{WEEKDAY_LABEL[s.weekday]}</span>
              <span className="font-mono text-[12px]">{hhmm(s.starts_at)}–{hhmm(s.ends_at)}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{s.room}</span>
              <button
                type="button"
                aria-label={`Hapus jadwal ${WEEKDAY_LABEL[s.weekday]} ${hhmm(s.starts_at)}`}
                disabled={removing}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-raised hover:text-danger pointer-coarse:size-11"
                onClick={() =>
                  startRemove(async () => {
                    const r = await deleteSession(s.id).catch(() => null);
                    if (!r || r.status === "error") notify(r?.message ?? "Jadwal gagal dihapus.", { tone: "error" });
                  })
                }
              >
                <Icon name="trash" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form ref={form} action={formAction} onInput={onInput} className="grid grid-cols-2 gap-x-3 gap-y-3" noValidate>
        <Field label="Hari" htmlFor="weekday" error={err("weekday")}>
          <select id="weekday" name="weekday" defaultValue={v("weekday", "1")} className={inputClass}>
            {WEEKDAY_LABEL.slice(1).map((d, i) => (
              <option key={d} value={i + 1}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Ruang" htmlFor="room" error={err("room")}>
          <input id="room" name="room" maxLength={80} defaultValue={v("room")} className={inputClass} />
        </Field>
        <Field label="Mulai" htmlFor="starts_at" error={err("starts_at")}>
          <input id="starts_at" name="starts_at" type="time" required defaultValue={v("starts_at", "08:00")} className={inputClass + " font-mono"} />
        </Field>
        <Field label="Selesai" htmlFor="ends_at" error={err("ends_at")}>
          <input id="ends_at" name="ends_at" type="time" required defaultValue={v("ends_at", "09:40")} className={inputClass + " font-mono"} aria-invalid={Boolean(err("ends_at"))} aria-describedby={err("ends_at") ? "ends_at-error" : undefined} />
        </Field>
        <Button type="submit" variant="ghost" disabled={pending} className="col-span-2">
          {pending ? "Menyimpan…" : "Tambah jadwal"}
        </Button>
      </form>
      {state.status === "error" && state.message && <p role="alert" className="mt-2 text-sm text-danger">{state.message}</p>}
    </section>
  );
}

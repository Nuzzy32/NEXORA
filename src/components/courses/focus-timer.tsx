"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button, inputClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { logStudySession } from "@/features/courses/actions";

const LENGTHS = [25, 50] as const;
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/**
 * Pomodoro-style focus timer (D-033). Time is measured from timestamps, so a throttled background tab still ends on time.
 * A finished session, or one stopped after at least a minute, is recorded for the chosen course.
 */
export function FocusTimer({ courses, defaultCourseId = null }: { courses: { id: string; name: string }[]; defaultCourseId?: string | null }) {
  const [courseId, setCourseId] = useState<string>(defaultCourseId ?? "");
  const [length, setLength] = useState<number>(25);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [saving, start] = useTransition();
  const { notify } = useToast();
  const title = useRef<string>("");

  const running = endsAt !== null;
  const left = running ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : length * 60;

  const record = useCallback(
    (minutes: number) => {
      if (minutes < 1) return notify("Sesi kurang dari 1 menit tidak dicatat.");
      start(async () => {
        try {
          const r = await logStudySession(courseId || null, Math.min(minutes, 240));
          notify(r.status === "ok" ? `Sesi ${minutes} menit dicatat.` : (r.message ?? "Sesi gagal dicatat."), { tone: r.status === "ok" ? "default" : "error" });
        } catch {
          notify("Sesi gagal dicatat. Periksa koneksi.", { tone: "error" });
        }
      });
    },
    [courseId, notify],
  );

  function reset() {
    setEndsAt(null);
    setStartedAt(null);
    if (title.current) document.title = title.current;
  }

  // Ticks from timestamps; the session ends inside the interval callback, not during render.
  useEffect(() => {
    if (endsAt === null) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      if (t >= endsAt) {
        window.clearInterval(id);
        reset();
        record(length);
      } else {
        setNow(t);
        document.title = `${fmt(Math.ceil((endsAt - t) / 1000))} · Fokus`;
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [endsAt, length, record]);

  return (
    <section aria-labelledby="focus" className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="focus" className="text-[15px] font-medium tracking-[-0.01em]">Timer fokus</h2>
        <span className="font-mono text-[11px] text-muted">Tercatat saat selesai atau dihentikan ≥ 1 menit</span>
      </div>
      <p role="timer" aria-live="off" className={"mt-3 font-mono text-5xl tabular-nums " + (running ? "text-accent" : "text-fg")}>
        {fmt(left)}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="sr-only" htmlFor="focus-course">Mata kuliah</label>
        <select id="focus-course" value={courseId} disabled={running} onChange={(e) => setCourseId(e.target.value)} className={inputClass}>
          <option value="">Tanpa mata kuliah</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="flex gap-1" role="group" aria-label="Durasi">
          {LENGTHS.map((m) => (
            <button
              key={m}
              type="button"
              disabled={running}
              aria-pressed={length === m}
              onClick={() => setLength(m)}
              className={"min-h-9 rounded-md border px-3 font-mono text-[12px] pointer-coarse:min-h-11 " + (length === m ? "border-accent text-accent" : "border-line text-muted hover:text-fg")}
            >
              {m} m
            </button>
          ))}
        </div>
        {running ? (
          <Button
            variant="ghost"
            disabled={saving}
            onClick={() => {
              const minutes = Math.floor((Date.now() - (startedAt ?? Date.now())) / 60000);
              reset();
              record(minutes);
            }}
          >
            Hentikan
          </Button>
        ) : (
          <Button
            disabled={saving}
            onClick={() => {
              const t = Date.now();
              title.current = document.title;
              setNow(t);
              setStartedAt(t);
              setEndsAt(t + length * 60_000);
            }}
          >
            Mulai
          </Button>
        )}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui/button";
import { targetPlan } from "@/features/courses/links";
import { formatGpa, type Course } from "@/features/courses/schema";

/** "What do I need this semester?" Computed in the browser from the courses on the page; nothing is saved. */
export function TargetGpa({ courses }: { courses: Pick<Course, "credits" | "grade">[] }) {
  const [raw, setRaw] = useState("3.50");
  const target = Number(raw.replace(",", "."));
  const valid = Number.isFinite(target) && target > 0 && target <= 4;
  const plan = valid ? targetPlan(courses, target) : null;

  return (
    <section aria-labelledby="target" className="rounded-lg border border-line bg-surface p-4">
      <h2 id="target" className="text-[15px] font-medium tracking-[-0.01em]">Target IPK</h2>
      <div className="mt-3 flex items-center gap-3">
        <label htmlFor="target-ipk" className="font-mono text-[11px] text-muted">IPK yang dituju</label>
        <input id="target-ipk" inputMode="decimal" value={raw} onChange={(e) => setRaw(e.target.value)} className={inputClass + " w-24 font-mono"} aria-invalid={!valid} />
      </div>
      <p role="status" className="mt-3 text-[13px] leading-5">
        {!valid ? (
          <span className="text-danger">Isi angka antara 0 dan 4, misalnya 3,50.</span>
        ) : plan?.kind === "none" ? (
          <span className="text-muted">Semua mata kuliah sudah bernilai. Tambahkan mata kuliah semester ini (tanpa nilai) untuk merencanakan.</span>
        ) : plan?.kind === "reached" ? (
          <span className="text-ok">Target sudah aman untuk {plan.remaining} SKS yang belum bernilai, berapa pun nilainya.</span>
        ) : plan?.kind === "impossible" ? (
          <span className="text-danger">
            Butuh rata-rata {formatGpa(plan.needed)} di {plan.remaining} SKS tersisa: di atas 4,00, jadi belum terjangkau semester ini.
          </span>
        ) : plan?.kind === "plan" ? (
          <>
            Butuh rata-rata minimal <span className="font-mono text-accent">{formatGpa(plan.needed)}</span> di {plan.remaining} SKS yang belum
            bernilai, kira-kira setara <span className="font-mono text-accent">{plan.letter}</span> di semua mata kuliah itu.
          </>
        ) : null}
      </p>
    </section>
  );
}

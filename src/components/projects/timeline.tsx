import { EmptyState } from "@/components/ui/empty-state";
import { byMonth, type TimelineEntry, type TimelineState } from "@/features/projects/timeline";
import { formatDate } from "@/lib/date";

const DOT: Record<TimelineState, string> = { done: "bg-ok", overdue: "bg-danger", upcoming: "bg-accent" };
const STATE_LABEL: Record<TimelineState, string> = { done: "selesai", overdue: "terlambat", upcoming: "akan datang" };

const monthLabel = (ym: string) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${ym}-01T00:00:00Z`));

/** Vertical timeline grouped by month: one column on every screen, so it reads the same at 375px and 1280px. */
export function ProjectTimeline({ entries, undated, today }: { entries: TimelineEntry[]; undated: number; today: string }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="Belum ada yang bertanggal"
        hint="Isi tanggal mulai atau target proyek, tenggat task, atau target milestone agar muncul di timeline."
      />
    );
  }
  return (
    <div className="space-y-6">
      {byMonth(entries).map(([month, items]) => (
        <section key={month} aria-label={monthLabel(month)}>
          <h3 className="mb-2 font-mono text-[11px] tracking-[0.04em] text-faint uppercase">{monthLabel(month)}</h3>
          <ol className="relative ml-1.5 border-l border-line">
            {items.map((e, i) =>
              e.kind === "today" ? (
                <li key={`today-${i}`} className="relative py-2 pl-5">
                  <span aria-hidden className="absolute top-1/2 -left-px h-px w-4 bg-accent" />
                  <span className="font-mono text-[11px] font-semibold text-accent">Hari ini · {formatDate(e.date, today)}</span>
                </li>
              ) : (
                <li key={"id" in e ? `${e.kind}-${e.id}` : e.kind} className="relative py-2 pl-5">
                  <span aria-hidden className={`absolute top-3.5 -left-[5px] size-2.5 rounded-full ring-2 ring-bg ${DOT[e.state]}`} />
                  <p className="flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted">
                    <span>{formatDate(e.date, today)}</span>
                    <span aria-hidden>·</span>
                    <span>{e.label}</span>
                    <span className="sr-only">, {STATE_LABEL[e.state]}</span>
                    {e.state === "overdue" && <span className="text-danger">terlambat</span>}
                  </p>
                  <p className={"mt-0.5 text-[14px] [overflow-wrap:anywhere] " + (e.state === "done" ? "text-muted line-through" : "")}>
                    {"title" in e ? e.title : e.label}
                  </p>
                </li>
              ),
            )}
          </ol>
        </section>
      ))}
      {undated > 0 && <p className="font-mono text-[11px] text-muted">{undated} task/milestone/risiko tanpa tanggal tidak ditampilkan.</p>}
    </div>
  );
}

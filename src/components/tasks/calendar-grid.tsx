"use client";

import Link from "next/link";
import { useRef, useState, useOptimistic, useTransition, type DragEvent } from "react";
import { useToast } from "@/components/ui/toast";
import { rescheduleTask, setTaskDueDate } from "@/features/tasks/actions";
import { dueDayOf, monthLabel, moveInMap, shortDay, TASK_DRAG_MIME } from "@/features/tasks/calendar";
import { rescheduleSchema, type Task } from "@/features/tasks/schema";

type Tone = "late" | "high" | "school" | "plain" | "done";

// A chip says what needs attention: late (rose), high priority (cyan), imported from e-learning (outlined), finished (struck through).
const CHIP: Record<Tone, string> = {
  late: "bg-danger/15 text-danger",
  high: "bg-accent/15 text-accent",
  school: "bg-raised text-fg ring-1 ring-line-strong ring-inset",
  plain: "bg-raised text-muted",
  done: "text-faint line-through",
};
const DOT: Record<Tone, string> = {
  late: "bg-danger",
  high: "bg-accent",
  school: "bg-fg",
  plain: "bg-muted",
  done: "bg-faint",
};

function toneOf(t: Task, today: string): Tone {
  if (t.status === "done") return "done";
  if (t.due_date !== null && t.due_date < today) return "late";
  if (t.priority === "high") return "high";
  return t.source === "elearning" ? "school" : "plain";
}

const MAX_CHIPS = 3;

/**
 * The day cells. A chip here, or a task row in the side panel, can be dragged onto another cell to change its due
 * date (native HTML5 drag and drop: mouse and trackpad only; on touch, the Edit dialog and "Besok →" are the way).
 * The task shows up on the new day at once and snaps back by itself if the server refuses; a toast offers Undo.
 */
export function CalendarGrid({
  month,
  days,
  byDay,
  today,
  selected,
  hrefs,
}: {
  month: string;
  days: string[];
  byDay: Map<string, Task[]>;
  today: string;
  selected: string;
  hrefs: Record<string, string>;
}) {
  const [shown, move] = useOptimistic(byDay, (cur, m: { id: string; to: string }) => moveInMap(cur, m.id, m.to));
  const [, start] = useTransition();
  const { notify } = useToast();
  const [over, setOver] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);

  const isTaskDrag = (e: DragEvent) => e.dataTransfer.types.includes(TASK_DRAG_MIME);

  const drop = (e: DragEvent, to: string) => {
    if (!isTaskDrag(e)) return;
    e.preventDefault();
    setOver(null);
    const parsed = rescheduleSchema.safeParse({ id: e.dataTransfer.getData(TASK_DRAG_MIME), date: to });
    if (!parsed.success || dueDayOf(shown, parsed.data.id) === to) return;
    const { id } = parsed.data;
    start(async () => {
      move({ id, to });
      try {
        const { from, changed } = await rescheduleTask(id, to);
        if (changed) {
          notify(`Dipindah ke ${shortDay(to)}`, { action: { label: "Urungkan", run: () => setTaskDueDate(id, from) } });
        }
      } catch {
        notify("Gagal memindahkan task.", { tone: "error" });
      }
    });
  };

  return (
    <div
      ref={grid}
      className="grid grid-cols-7 gap-px bg-line"
      onDragLeave={(e) => {
        if (!(e.relatedTarget instanceof Node && grid.current?.contains(e.relatedTarget))) setOver(null);
      }}
    >
      {days.map((day) => {
        const list = shown.get(day) ?? [];
        const inMonth = day.startsWith(month);
        const isToday = day === today;
        const isSelected = day === selected;
        const open = list.filter((t) => t.status !== "done").length;
        return (
          <Link
            key={day}
            href={hrefs[day]}
            scroll={false}
            draggable={false}
            onDragOver={(e) => {
              if (!isTaskDrag(e)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOver(day);
            }}
            onDrop={(e) => drop(e, day)}
            aria-label={`${Number(day.slice(8))} ${monthLabel(day.slice(0, 7))}, ${list.length === 0 ? "tidak ada task" : `${open} task aktif dari ${list.length}`}`}
            aria-current={isToday ? "date" : undefined}
            className={
              "flex min-h-14 min-w-0 flex-col gap-1 p-1.5 transition-colors hover:bg-raised md:min-h-[108px] md:p-2 " +
              (over === day
                ? "bg-accent/10 ring-2 ring-accent ring-inset "
                : isSelected
                  ? "bg-raised ring-1 ring-accent ring-inset "
                  : inMonth
                    ? "bg-surface "
                    : "bg-bg ")
            }
          >
            <span
              className={
                "inline-flex size-5 items-center justify-center self-center rounded-sm font-mono text-[11px] md:self-start " +
                (isToday ? "bg-accent font-semibold text-accent-ink" : inMonth ? "text-fg" : "text-faint")
              }
            >
              {Number(day.slice(8))}
            </span>
            {list.length > 0 && (
              <>
                <span className="hidden min-w-0 flex-col gap-0.5 md:flex">
                  {list.slice(0, MAX_CHIPS).map((t) => (
                    <span
                      key={t.id}
                      draggable
                      title="Seret ke tanggal lain untuk memindah tenggat"
                      onDragStart={(e) => {
                        e.dataTransfer.setData(TASK_DRAG_MIME, t.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setOver(null)}
                      className={"truncate rounded-sm px-1.5 py-0.5 text-[11px] leading-4 pointer-fine:cursor-grab " + CHIP[toneOf(t, today)]}
                    >
                      {t.title}
                    </span>
                  ))}
                  {list.length > MAX_CHIPS && (
                    <span className="px-1.5 font-mono text-[10px] text-muted">+{list.length - MAX_CHIPS} lagi</span>
                  )}
                </span>
                <span aria-hidden className="flex flex-wrap justify-center gap-0.5 md:hidden">
                  {list.slice(0, 4).map((t) => (
                    <i key={t.id} className={"size-1.5 rounded-full " + DOT[toneOf(t, today)]} />
                  ))}
                </span>
              </>
            )}
          </Link>
        );
      })}
    </div>
  );
}

import { Icon, type IconName } from "@/components/ui/icons";
import { sortByFocus, sortChronological, type ProjectOption, type Task } from "@/features/tasks/schema";
import { addDays } from "@/lib/date";
import { TaskList } from "./task-row";

type Group = { id: string; title: string; hint: string; icon: IconName; tasks: Task[]; showDate: boolean; late?: boolean };

/** Open tasks by when they are due, finished ones last. Empty groups are dropped. */
export function groupTasks(tasks: Task[], today: string): Group[] {
  const open = tasks.filter((t) => t.status !== "done");
  const week = addDays(today, 7);
  const due = (t: Task) => t.due_date;
  const groups: Group[] = [
    {
      id: "late",
      title: "Terlambat",
      hint: "Lewat tenggat, belum selesai",
      icon: "warning",
      late: true,
      showDate: true,
      tasks: sortChronological(open.filter((t) => due(t) !== null && due(t)! < today)),
    },
    {
      id: "today",
      title: "Hari ini",
      hint: "Tenggat hari ini",
      icon: "calendar",
      showDate: false,
      tasks: sortByFocus(open.filter((t) => due(t) === today)),
    },
    {
      id: "week",
      title: "Minggu ini",
      hint: "Tenggat 7 hari ke depan",
      icon: "clock",
      showDate: true,
      tasks: sortChronological(open.filter((t) => due(t) !== null && due(t)! > today && due(t)! <= week)),
    },
    {
      id: "later",
      title: "Nanti",
      hint: "Tenggat lebih dari seminggu lagi",
      icon: "clock",
      showDate: true,
      tasks: sortChronological(open.filter((t) => due(t) !== null && due(t)! > week)),
    },
    {
      id: "none",
      title: "Tanpa tanggal",
      hint: "Belum ada tenggat",
      icon: "inbox",
      showDate: false,
      tasks: open.filter((t) => due(t) === null),
    },
    {
      id: "done",
      title: "Selesai",
      hint: "Sudah dikerjakan",
      icon: "check",
      showDate: true,
      tasks: tasks.filter((t) => t.status === "done"),
    },
  ];
  return groups.filter((g) => g.tasks.length > 0);
}

/** Stitch-style sections: a mono title bar with a count and a one-line hint, dense rows below. */
export function TaskGroups({ tasks, today, projects }: { tasks: Task[]; today: string; projects: ProjectOption[] }) {
  return (
    <div className="space-y-4">
      {groupTasks(tasks, today).map((g) => (
        <section key={g.id} aria-labelledby={`group-${g.id}`} className="overflow-hidden rounded-lg border border-line bg-surface">
          <header
            className={
              "flex items-center justify-between gap-3 border-b border-line px-3 py-2 " +
              (g.late ? "bg-danger/10 text-danger" : "bg-raised/60 text-fg")
            }
          >
            <div className="flex items-center gap-2">
              <Icon name={g.icon} className={"size-4 " + (g.late ? "" : "text-muted")} />
              <h2 id={`group-${g.id}`} className="font-mono text-[11px] font-semibold tracking-[0.08em] uppercase">
                {g.title}
              </h2>
              <span
                className={
                  "rounded-full px-1.5 py-px font-mono text-[10px] font-semibold " +
                  (g.late ? "bg-danger/20" : "bg-line-strong/70 text-muted")
                }
              >
                {g.tasks.length}
              </span>
            </div>
            <span className={"hidden font-mono text-[10px] sm:inline " + (g.late ? "text-danger" : "text-faint")}>{g.hint}</span>
          </header>
          <TaskList bare tasks={g.tasks} today={today} projects={projects} showDate={g.showDate} />
        </section>
      ))}
    </div>
  );
}

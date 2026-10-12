"use client";

import { useOptimistic, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { postponeTask, setTaskDone, setTaskDueDate, setTaskStatus } from "@/features/tasks/actions";
import type { Task, TaskStatus } from "@/features/tasks/schema";

/**
 * Complete / reopen and "push to tomorrow" for one task, shared by list rows and the focus card.
 * The status flips at once (optimistic) and snaps back by itself if the server refuses;
 * every change comes with a toast that can undo it.
 */
export function useTaskActions(task: Task) {
  const [status, setStatus] = useOptimistic<TaskStatus, TaskStatus>(task.status, (_, next) => next);
  const [, startToggle] = useTransition();
  const [postponing, startPostpone] = useTransition();
  const { notify } = useToast();

  const toggle = () =>
    startToggle(async () => {
      const nextDone = status !== "done";
      const before = task.status;
      setStatus(nextDone ? "done" : "todo");
      try {
        await setTaskDone(task.id, nextDone);
        notify(nextDone ? "Task selesai" : "Task dibuka lagi", {
          action: { label: "Urungkan", run: () => setTaskStatus(task.id, before) },
        });
      } catch {
        notify("Gagal mengubah status task.", { tone: "error" });
      }
    });

  const postpone = () =>
    startPostpone(async () => {
      const before = task.due_date;
      try {
        await postponeTask(task.id);
        notify("Dipindah ke besok", { action: { label: "Urungkan", run: () => setTaskDueDate(task.id, before) } });
      } catch {
        notify("Gagal memindahkan task.", { tone: "error" });
      }
    });

  return { status, toggle, postpone, postponing };
}

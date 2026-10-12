import { buttonClass } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import type { ProjectOption } from "@/features/tasks/schema";
import { TaskForm } from "./task-form";

export function NewTaskButton({ projects, defaultProjectId }: { projects: ProjectOption[]; defaultProjectId?: string }) {
  return (
    <FormDialog
      title="Task baru"
      trigger="Task baru"
      triggerClassName={buttonClass("primary")}
      draftKey={`task:${defaultProjectId ?? "new"}`}
    >
      <TaskForm projects={projects} defaultProjectId={defaultProjectId} />
    </FormDialog>
  );
}

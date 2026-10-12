import { listProjectOptions } from "@/features/tasks/queries";
import { NewTaskButton } from "./new-task-button";

/** "Task baru" for a page header. Loads project options, so render it inside <Suspense>. */
export async function NewTaskAction() {
  return <NewTaskButton projects={await listProjectOptions()} />;
}

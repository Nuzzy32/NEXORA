import { buttonClass } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";
import { listProjectOptions } from "@/features/tasks/queries";
import type { ProjectOption } from "@/features/tasks/schema";
import { MemoryForm } from "./memory-form";

export function NewMemoryButton({ projects }: { projects: ProjectOption[] }) {
  return (
    <FormDialog
      title="Memory baru"
      trigger={
        <>
          <Icon name="plus" className="mr-1.5 -ml-1 size-4" />
          Memory baru
        </>
      }
      triggerClassName={buttonClass("primary")}
      draftKey="memory"
    >
      <MemoryForm projects={projects} />
    </FormDialog>
  );
}

/** "Memory baru" for a page header. Loads project options, so render it inside <Suspense>. */
export async function NewMemoryAction() {
  return <NewMemoryButton projects={await listProjectOptions()} />;
}

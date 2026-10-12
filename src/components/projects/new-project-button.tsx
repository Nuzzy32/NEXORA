import { buttonClass } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";
import { ProjectForm } from "./project-form";

export function NewProjectButton() {
  return (
    <FormDialog
      title="Proyek baru"
      trigger={
        <>
          <Icon name="plus" className="size-4" />
          Proyek baru
        </>
      }
      triggerClassName={buttonClass("primary", "gap-1.5")}
      draftKey="project"
    >
      <ProjectForm />
    </FormDialog>
  );
}

/** The last tile of the project grid: an invitation, not a button in a toolbar. */
export function NewProjectTile() {
  return (
    <li className="rise" style={{ "--i": 8 } as React.CSSProperties}>
      <FormDialog
        title="Proyek baru"
        draftKey="project"
        triggerClassName="group flex h-full min-h-44 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong p-4 text-muted transition-colors duration-200 hover:border-accent/50 hover:text-fg"
        trigger={
          <>
            <span className="grid size-9 place-items-center rounded-md border border-line-strong transition-colors group-hover:border-accent/50 group-hover:text-accent">
              <Icon name="plus" />
            </span>
            <span className="text-sm font-medium">Proyek baru</span>
          </>
        }
      >
        <ProjectForm />
      </FormDialog>
    </li>
  );
}

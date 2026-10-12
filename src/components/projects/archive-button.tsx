"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setProjectStatus } from "@/features/projects/actions";
import type { ProjectStatus } from "@/features/projects/schema";

/** Archive / restore in one click, with an undo that returns to the exact previous status. */
export function ArchiveButton({ id, status }: { id: string; status: ProjectStatus }) {
  const [pending, start] = useTransition();
  const { notify } = useToast();
  const archived = status === "archived";

  return (
    <Button
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await setProjectStatus(id, archived ? "active" : "archived");
            notify(archived ? "Proyek dipulihkan" : "Proyek diarsipkan", {
              action: { label: "Urungkan", run: () => setProjectStatus(id, status) },
            });
          } catch {
            notify("Gagal mengubah status proyek.", { tone: "error" });
          }
        })
      }
    >
      {archived ? "Pulihkan" : "Arsipkan"}
    </Button>
  );
}

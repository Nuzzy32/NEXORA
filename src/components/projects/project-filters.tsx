import { FilterGroup } from "@/components/ui/filter-group";
import type { ProjectFilter } from "@/features/projects/schema";

const OPTIONS: { value: ProjectFilter; label: string }[] = [
  { value: "open", label: "Berjalan" },
  { value: "completed", label: "Selesai" },
  { value: "archived", label: "Diarsipkan" },
  { value: "all", label: "Semua" },
];

export function ProjectFilters({ current }: { current: ProjectFilter }) {
  return (
    <FilterGroup
      label="Status"
      options={OPTIONS}
      current={current}
      build={(s) => (s === "open" ? "/projects" : `/projects?status=${s}`)}
    />
  );
}

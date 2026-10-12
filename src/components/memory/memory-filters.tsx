import Form from "next/form";
import Link from "next/link";
import { Button, inputClass } from "@/components/ui/button";
import { FilterGroup } from "@/components/ui/filter-group";
import { Icon } from "@/components/ui/icons";
import {
  MEMORY_CATEGORIES,
  MEMORY_CATEGORY_LABEL,
  MEMORY_SORTS,
  MEMORY_SORT_LABEL,
  memoryHref,
  type MemoryCategory,
  type MemoryFilters,
} from "@/features/memory/schema";

const SORT_OPTIONS = MEMORY_SORTS.map((s) => ({ value: s, label: MEMORY_SORT_LABEL[s] }));

export function MemoryFilterBar({
  filters,
  total,
  byCategory,
}: {
  filters: MemoryFilters;
  total: number;
  byCategory: Record<MemoryCategory, number>;
}) {
  const chips = [
    { value: "all" as const, label: "Semua", count: total },
    ...MEMORY_CATEGORIES.map((c) => ({ value: c, label: MEMORY_CATEGORY_LABEL[c], count: byCategory[c] })),
  ];

  return (
    <div className="space-y-3">
      <Form action="/memory" className="flex gap-2">
        {filters.category !== "all" && <input type="hidden" name="category" value={filters.category} />}
        {filters.sort !== "updated" && <input type="hidden" name="sort" value={filters.sort} />}
        <div className="relative min-w-0 flex-1">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-faint">
            <Icon name="search" className="size-4" />
          </span>
          <input
            type="search" name="q" defaultValue={filters.q} maxLength={100}
            placeholder="Cari judul atau isi memory…" aria-label="Cari memory"
            className={inputClass + " pl-9"}
          />
        </div>
        <Button type="submit" variant="ghost">Cari</Button>
      </Form>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div role="group" aria-label="Kategori" className="flex flex-wrap items-center gap-1">
          {chips.map((c) => (
            <Link
              key={c.value}
              href={memoryHref({ ...filters, category: c.value })}
              aria-current={c.value === filters.category ? "true" : undefined}
              className={
                "inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors pointer-coarse:min-h-11 " +
                (c.value === filters.category ? "bg-raised text-fg" : "text-muted hover:text-fg")
              }
            >
              {c.label}
              <span className="font-mono text-[11px] text-faint">{c.count}</span>
            </Link>
          ))}
        </div>
        <FilterGroup
          label="Urutkan"
          options={SORT_OPTIONS}
          current={filters.sort}
          build={(sort) => memoryHref({ ...filters, sort })}
        />
      </div>
    </div>
  );
}

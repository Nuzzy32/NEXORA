import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/section-heading";

/** Dashboard card: hairline frame, tonal surface, section title on top. `flush` lets rows run edge to edge. */
export function Panel({
  id,
  title,
  count,
  aside,
  flush = false,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  aside?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="px-4 pt-3.5">
        <SectionHeading id={id} title={title} count={count} aside={aside} />
      </div>
      <div className={flush ? "border-t border-line" : "px-4 pb-4"}>{children}</div>
    </section>
  );
}

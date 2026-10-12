import type { ReactNode } from "react";

/** Section title bar: Geist title with a small mono count. */
export function SectionHeading({
  id,
  title,
  count,
  aside,
}: {
  id?: string;
  title: string;
  count?: number;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-[15px] leading-none font-medium tracking-[-0.01em] text-fg">
        {title}
        {count !== undefined && count > 0 && (
          <span className="ml-2 font-mono text-[11px] tracking-normal text-muted">{count}</span>
        )}
      </h2>
      {aside}
    </div>
  );
}

import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export function EmptyState({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: IconName;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
      {icon && (
        <span className="mb-3 grid size-9 place-items-center rounded-md border border-line bg-raised text-muted">
          <Icon name={icon} className="size-[18px]" />
        </span>
      )}
      <p className="text-[15px] font-medium tracking-[-0.01em]">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-[13px] text-muted">{hint}</p>}
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
  );
}

/** Thin progress track, decorative: the number next to it carries the meaning. Emerald once finished. */
export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div aria-hidden className={`h-1.5 w-full overflow-hidden rounded-full bg-line ${className}`}>
      <div className={`h-full rounded-full ${value >= 100 ? "bg-ok" : "bg-accent"}`} style={{ width: `${value}%` }} />
    </div>
  );
}

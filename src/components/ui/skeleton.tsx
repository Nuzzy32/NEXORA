export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Memuat" className="divide-y divide-line rounded-lg border border-line bg-surface">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-11 items-center gap-3 px-3">
          <div className="size-4 motion-safe:animate-pulse rounded-full bg-raised" />
          <div className="h-3 w-2/5 motion-safe:animate-pulse rounded bg-raised" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder with the size of a primary header button, so the header does not jump when it loads. */
export function ActionSkeleton() {
  return <div aria-hidden className="h-9 w-28 motion-safe:animate-pulse rounded-md bg-raised" />;
}

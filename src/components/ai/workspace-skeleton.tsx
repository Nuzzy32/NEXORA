/** Placeholder with the workspace's outer size, so the page does not jump while conversations load. */
export function WorkspaceSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat AI Workspace"
      className="flex h-[calc(100dvh-11rem)] min-h-96 overflow-hidden rounded-lg border border-line bg-surface md:h-[calc(100dvh-4rem)]"
    >
      <div className="hidden w-56 shrink-0 space-y-2 border-r border-line p-3 md:block">
        <div className="h-9 motion-safe:animate-pulse rounded-md bg-raised" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 motion-safe:animate-pulse rounded-md bg-raised/60" />
        ))}
      </div>
      <div className="flex-1 bg-bg" />
    </div>
  );
}

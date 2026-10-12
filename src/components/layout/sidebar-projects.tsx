import Link from "next/link";
import { ProgressRing } from "@/components/projects/progress-ring";
import { listProjects } from "@/features/projects/queries";

/** Running projects one click away (desktop sidebar only). Reads data: render inside <Suspense>. */
export async function SidebarProjects() {
  const projects = (await listProjects("open")).slice(0, 5);
  if (projects.length === 0) return null;
  return (
    <section aria-labelledby="sidebar-projects" className="mt-6 hidden md:block">
      <div className="flex items-center justify-between px-2 pb-1.5">
        <h2 id="sidebar-projects" className="font-mono text-[10px] font-semibold tracking-[0.08em] text-faint uppercase">
          Proyek
        </h2>
        <Link href="/projects" aria-label="Semua proyek" className="text-[11px] text-muted hover:text-fg">
          Semua
        </Link>
      </div>
      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            <Link
              href={`/projects/${p.id}`}
              className="flex min-h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-muted transition-colors hover:bg-raised/60 hover:text-fg"
            >
              <ProgressRing done={p.done_count} total={p.open_count + p.done_count} size={14} />
              <span className="truncate">{p.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

import Link from "next/link";
import { ProgressRing } from "@/components/projects/progress-ring";
import { listConversations } from "@/features/ai/queries";
import { listMemory } from "@/features/memory/queries";
import { MEMORY_CATEGORY_LABEL } from "@/features/memory/schema";
import { listRecentNotes } from "@/features/projects/queries";
import type { ProjectWithCounts } from "@/features/projects/schema";
import { listProjectOptions } from "@/features/tasks/queries";
import { projectColor } from "@/lib/color";
import { formatDate, localDate, todayISO } from "@/lib/date";
import { Panel } from "./panel";

const row = "min-h-11 rounded-md px-2 py-2 transition-colors hover:bg-raised";

/** Running projects with their progress ring. Gets its data from the page, so it can sit next to the stat cards. */
export function ProjectsRail({ projects }: { projects: ProjectWithCounts[] }) {
  return (
    <Panel
      id="rail-projects"
      title="Proyek berjalan"
      aside={
        <Link href="/projects" className="inline-flex min-h-6 items-center font-mono text-[11px] text-muted transition-colors hover:text-fg">
          Semua
        </Link>
      }
    >
      {projects.length === 0 ? (
        <p className="text-[13px] text-muted">Belum ada proyek berjalan.</p>
      ) : (
        <ul className="-mx-2">
          {projects.slice(0, 4).map((p) => {
            const total = p.open_count + p.done_count;
            return (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className={row + " flex items-center gap-3"}>
                  <ProgressRing done={p.done_count} total={total} size={28} color={projectColor(p.id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{p.name}</span>
                    <span className="block font-mono text-[11px] text-muted">
                      {total === 0 ? "belum ada task" : `${p.done_count}/${total} task`}
                    </span>
                  </span>
                  {total > 0 && (
                    <span className="shrink-0 font-mono text-[11px] text-muted tabular-nums">
                      {Math.round((p.done_count / total) * 100)}%
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/** The last few notes across projects: a way back into what you were thinking. Reads data: render inside <Suspense>. */
export async function RecentNotes() {
  const [notes, projects] = await Promise.all([listRecentNotes(3), listProjectOptions()]);
  if (notes.length === 0) return null;
  const today = todayISO();
  return (
    <Panel id="rail-notes" title="Catatan terbaru">
      <ul className="-mx-2">
        {notes.map((n) => {
          const project = projects.find((p) => p.id === n.project_id);
          return (
            <li key={n.id}>
              <Link href={`/projects/${n.project_id}?tab=notes`} className={row + " flex flex-col justify-center gap-0.5"}>
                <span className="block truncate text-[13px] font-medium">{n.title}</span>
                <span className="flex items-center gap-2 font-mono text-[11px] text-muted">
                  <i aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: projectColor(n.project_id) }} />
                  <span className="truncate">{project?.name ?? "Proyek"}</span>
                  <span aria-hidden>·</span>
                  <span className="shrink-0">{formatDate(localDate(n.updated_at), today)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/** Memory you pinned, a few at a time. Pinning only marks an item; nothing is sent to an AI. Inside <Suspense>. */
export async function PinnedMemory() {
  const items = (await listMemory({ q: "", category: "all", sort: "pinned" })).filter((m) => m.pinned).slice(0, 3);
  if (items.length === 0) return null;
  return (
    <Panel
      id="rail-memory"
      title="Memory disematkan"
      aside={
        <Link href="/memory" className="inline-flex min-h-6 items-center font-mono text-[11px] text-muted transition-colors hover:text-fg">
          Semua
        </Link>
      }
    >
      <ul className="-mx-2">
        {items.map((m) => (
          <li key={m.id}>
            <Link href="/memory" className={row + " flex flex-col justify-center gap-0.5"}>
              <span className="block truncate text-[13px] font-medium">{m.title}</span>
              <span className="block truncate font-mono text-[11px] text-muted">{MEMORY_CATEGORY_LABEL[m.category]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** The latest conversations, one click back into the thread. Inside <Suspense>. */
export async function RecentConversations() {
  const threads = (await listConversations()).slice(0, 3);
  if (threads.length === 0) return null;
  const today = todayISO();
  return (
    <Panel
      id="rail-ai"
      title="Percakapan terbaru"
      aside={
        <Link href="/ai" className="inline-flex min-h-6 items-center font-mono text-[11px] text-muted transition-colors hover:text-fg">
          Semua
        </Link>
      }
    >
      <ul className="-mx-2">
        {threads.map((c) => (
          <li key={c.id}>
            <Link href={`/ai?c=${c.id}`} className={row + " flex flex-col justify-center gap-0.5"}>
              <span className="block truncate text-[13px] font-medium">{c.title}</span>
              <span className="block font-mono text-[11px] text-muted">{formatDate(localDate(c.updated_at), today)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

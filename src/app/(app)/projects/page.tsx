import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { NewProjectButton, NewProjectTile } from "@/components/projects/new-project-button";
import { ProjectFilters } from "@/components/projects/project-filters";
import { ProjectGrid } from "@/components/projects/project-card";
import { ProjectStats } from "@/components/projects/project-stats";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/skeleton";
import { countDecisions } from "@/features/projects/decisions";
import { listProjects, listTrackedItems } from "@/features/projects/queries";
import { parseProjectFilter } from "@/features/projects/schema";
import { projectStats } from "@/features/projects/stats";
import { openRisksByProject, trackingStats } from "@/features/projects/tracking";
import { todayISO } from "@/lib/date";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  return (
    <>
      <PageHeader
        eyebrow="Projects"
        title="Project Command Center"
        description="Semua proyek, task, milestone, risiko, dan keputusan teknis di satu tempat. Setiap proyek punya task dan catatannya sendiri."
        actions={<NewProjectButton />}
      />
      <Suspense fallback={<div className="mt-6"><ListSkeleton /></div>}>
        <ProjectsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ProjectsContent({ searchParams }: { searchParams: PageProps<"/projects">["searchParams"] }) {
  const filter = parseProjectFilter(await searchParams);
  // Totals always cover every project; the filter only narrows the list below.
  const [all, projects, decisions, tracked] = await Promise.all([
    listProjects("all"),
    listProjects(filter),
    countDecisions(),
    listTrackedItems(),
  ]);
  const today = todayISO();

  return (
    <div className="mt-6 space-y-6">
      <ProjectStats stats={projectStats(all)} decisions={decisions} tracking={trackingStats(tracked, all)} />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-[15px] leading-none font-medium tracking-[-0.01em]">
          Workstreams <span className="ml-1 font-mono text-[11px] tracking-normal text-muted">{projects.length}</span>
        </h2>
        <ProjectFilters current={filter} />
      </div>
      {projects.length === 0 ? (
        filter === "open" ? (
          <EmptyState icon="projects" title="Belum ada proyek berjalan" hint="Buat proyek untuk mengelompokkan task dan catatan teknis." />
        ) : (
          <EmptyState icon="search" title="Tidak ada proyek di filter ini" hint="Ubah filter untuk melihat proyek lain.">
            <Link href="/projects" className={buttonClass("ghost")}>Lihat proyek berjalan</Link>
          </EmptyState>
        )
      ) : (
        <ProjectGrid projects={projects} today={today} risks={openRisksByProject(tracked)} tail={filter === "open" ? <NewProjectTile /> : undefined} />
      )}
    </div>
  );
}

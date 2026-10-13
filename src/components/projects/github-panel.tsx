import { SectionHeading } from "@/components/ui/section-heading";
import { getRepoActivity } from "@/features/github/client";
import { formatDate, localDate } from "@/lib/date";

const meta = "font-mono text-[11px] text-muted";
const row = "flex min-h-11 flex-col justify-center gap-0.5 rounded-md px-2 py-1.5 transition-colors hover:bg-raised";

/** Latest commits and open issues/PRs of the project's repo. Server component: render inside <Suspense>. */
export async function GithubPanel({ repo, today }: { repo: string; today: string }) {
  const result = await getRepoActivity(repo);
  return (
    <section aria-labelledby="github" className="mt-6">
      <SectionHeading
        id="github"
        title="GitHub"
        aside={
          <a href={`https://github.com/${repo}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center font-mono text-[11px] text-muted hover:text-fg pointer-coarse:min-h-11">
            {repo} ↗
          </a>
        }
      />
      {!result.ok ? (
        <p role="alert" className="rounded-md border border-line bg-surface px-4 py-3 text-[13px] text-danger">{result.error}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-line bg-surface p-3">
            <h3 className={`${meta} mb-1 px-2`}>Commit terbaru</h3>
            {result.data.commits.length === 0 ? (
              <p className="px-2 text-[13px] text-muted">Belum ada commit.</p>
            ) : (
              <ul>
                {result.data.commits.map((c) => (
                  <li key={c.sha}>
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className={row}>
                      <span className="truncate text-[13px]">{c.message}</span>
                      <span className={meta}>
                        {c.sha} · {c.author}
                        {c.date && ` · ${formatDate(localDate(c.date), today)}`}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border border-line bg-surface p-3">
            <h3 className={`${meta} mb-1 px-2`}>Issue & PR terbuka ({result.data.openCount})</h3>
            {result.data.open.length === 0 ? (
              <p className="px-2 text-[13px] text-muted">Tidak ada issue atau PR terbuka.</p>
            ) : (
              <ul>
                {result.data.open.map((i) => (
                  <li key={i.number}>
                    <a href={i.url} target="_blank" rel="noopener noreferrer" className={row}>
                      <span className="truncate text-[13px]">{i.title}</span>
                      <span className={meta}>
                        {i.isPull ? "PR" : "Issue"} #{i.number} · diperbarui {formatDate(localDate(i.updated), today)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

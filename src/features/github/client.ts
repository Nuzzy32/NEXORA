import "server-only";
import { z } from "zod";

// Read-only GitHub REST calls for one repo (PROJ-05, D-032). GITHUB_TOKEN is optional: public repos work without it
// (60 requests/hour per IP); a fine-grained read-only token adds private repos and 5000/hour. It never leaves the server.

export type RepoActivity = {
  repo: string;
  url: string;
  commits: { sha: string; message: string; author: string; date: string; url: string }[];
  open: { number: number; title: string; isPull: boolean; url: string; updated: string }[];
  /** Open issues + PRs as GitHub counts them. */
  openCount: number;
};
export type RepoResult = { ok: true; data: RepoActivity } | { ok: false; error: string };

const commitSchema = z.array(
  z.object({
    sha: z.string(),
    html_url: z.string(),
    commit: z.object({ message: z.string(), author: z.object({ name: z.string(), date: z.string() }).nullable() }),
  }),
);
const issueSchema = z.array(
  z.object({ number: z.number(), title: z.string(), html_url: z.string(), updated_at: z.string(), pull_request: z.unknown().optional() }),
);
const repoSchema = z.object({ html_url: z.string(), open_issues_count: z.number() });

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** Fixed, safe messages only: never the token, never GitHub's raw response. */
function describe(status: number, hasToken: boolean): string {
  if (status === 404) return hasToken ? "Repo tidak ditemukan atau token tidak punya akses." : "Repo tidak ditemukan. Untuk repo privat, isi GITHUB_TOKEN di server.";
  if (status === 401) return "GITHUB_TOKEN ditolak GitHub. Periksa atau buat ulang tokennya.";
  if (status === 403 || status === 429) return "Batas permintaan GitHub tercapai. Coba lagi nanti, atau isi GITHUB_TOKEN.";
  return "GitHub sedang tidak bisa dijangkau. Coba lagi nanti.";
}

export async function getRepoActivity(repo: string, fetcher: Fetcher = fetch): Promise<RepoResult> {
  const token = process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const get = async (path: string) => {
    const res = await fetcher(`https://api.github.com/repos/${repo}${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw res.status;
    return res.json() as Promise<unknown>;
  };
  try {
    const [info, commits, issues] = await Promise.all([get(""), get("/commits?per_page=5"), get("/issues?state=open&per_page=5&sort=updated")]);
    const r = repoSchema.parse(info);
    return {
      ok: true,
      data: {
        repo,
        url: r.html_url,
        openCount: r.open_issues_count,
        commits: commitSchema.parse(commits).map((c) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split("\n", 1)[0].slice(0, 200),
          author: c.commit.author?.name ?? "",
          date: c.commit.author?.date ?? "",
          url: c.html_url,
        })),
        open: issueSchema.parse(issues).map((i) => ({
          number: i.number,
          title: i.title.slice(0, 200),
          isPull: i.pull_request !== undefined,
          url: i.html_url,
          updated: i.updated_at,
        })),
      },
    };
  } catch (e) {
    // 409 = empty repository (no commits yet)
    if (e === 409) return { ok: false, error: "Repo ini belum punya commit." };
    return { ok: false, error: typeof e === "number" ? describe(e, Boolean(token)) : "Data GitHub tidak bisa dibaca. Coba lagi nanti." };
  }
}

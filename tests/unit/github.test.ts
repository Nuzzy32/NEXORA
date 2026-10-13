import { afterEach, describe, expect, it, vi } from "vitest";
import { getRepoActivity } from "@/features/github/client";
import { normalizeRepo, projectInputSchema } from "@/features/projects/schema";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("normalizeRepo", () => {
  it("accepts owner/repo and reduces a pasted URL", () => {
    expect(normalizeRepo("https://github.com/vercel/next.js.git/")).toBe("vercel/next.js");
    expect(normalizeRepo("  ")).toBeNull();
    const base = { name: "p", summary: "", status: "active", starts_on: "", due_on: "" };
    expect(projectInputSchema.safeParse({ ...base, github_repo: "Nuzzy32/NEXORA" }).success).toBe(true);
    expect(projectInputSchema.safeParse({ ...base, github_repo: "not a repo" }).success).toBe(false);
    expect(projectInputSchema.safeParse({ ...base, github_repo: "../../etc" }).success).toBe(false);
  });
});

describe("getRepoActivity", () => {
  it("returns commits and open items, sending the token only as a header", async () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_test");
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith("/commits?per_page=5"))
        return json([{ sha: "abcdef123456", html_url: "u1", commit: { message: "Fix bug\n\nbody", author: { name: "A", date: "2026-10-12T00:00:00Z" } } }]);
      if (url.includes("/issues")) return json([{ number: 7, title: "PR", html_url: "u2", updated_at: "2026-10-12T00:00:00Z", pull_request: {} }]);
      return json({ html_url: "https://github.com/o/r", open_issues_count: 3 });
    });
    const r = await getRepoActivity("o/r", fetcher);
    expect(r).toEqual({
      ok: true,
      data: {
        repo: "o/r",
        url: "https://github.com/o/r",
        openCount: 3,
        commits: [{ sha: "abcdef1", message: "Fix bug", author: "A", date: "2026-10-12T00:00:00Z", url: "u1" }],
        open: [{ number: 7, title: "PR", isPull: true, url: "u2", updated: "2026-10-12T00:00:00Z" }],
      },
    });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.startsWith("https://api.github.com/repos/o/r")).toBe(true);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer ghp_test");
  });

  it("maps failures to fixed messages", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    expect(await getRepoActivity("o/r", async () => json({}, 404))).toEqual({ ok: false, error: expect.stringContaining("GITHUB_TOKEN") });
    expect(await getRepoActivity("o/r", async () => json({}, 403))).toEqual({ ok: false, error: expect.stringContaining("Batas permintaan") });
    expect(await getRepoActivity("o/r", async () => json({}, 409))).toEqual({ ok: false, error: "Repo ini belum punya commit." });
    const broken = await getRepoActivity("o/r", async () => {
      throw new Error("ghp_secret network");
    });
    expect(broken.ok).toBe(false);
    expect(JSON.stringify(broken)).not.toContain("ghp_secret");
  });
});

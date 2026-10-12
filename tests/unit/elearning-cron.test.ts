import { describe, expect, it, vi } from "vitest";
import { authorizeCron, handleCron, type CronEnv } from "@/features/elearning/cron";
import type { SyncResult } from "@/features/elearning/sync";

const OWNER = "5f0d1c2e-8b3a-4c6d-9e1f-0a2b3c4d5e6f";
const env: CronEnv = { CRON_SECRET: "s3cret-value", OWNER_USER_ID: OWNER, SUPABASE_SERVICE_ROLE_KEY: "service-key" };
const ok: SyncResult = { status: "ok", created: 2, updated: 1, unchanged: 9, skipped: 0 };

describe("authorizeCron", () => {
  it("accepts only the exact Bearer secret", () => {
    expect(authorizeCron("Bearer s3cret-value", "s3cret-value")).toBe(true);
    for (const bad of [null, "", "s3cret-value", "bearer s3cret-value", "Bearer s3cret-valuE", "Bearer s3cret-value ", "Bearer "]) {
      expect(authorizeCron(bad, "s3cret-value")).toBe(false);
    }
  });
  it("is closed when no secret is configured", () => {
    expect(authorizeCron("Bearer ", "")).toBe(false);
    expect(authorizeCron("Bearer x", undefined)).toBe(false);
  });
});

describe("handleCron", () => {
  it("is off (503) until the secret, owner id and service key are all set, and never runs", async () => {
    const run = vi.fn();
    for (const missing of ["CRON_SECRET", "OWNER_USER_ID", "SUPABASE_SERVICE_ROLE_KEY"] as const) {
      const r = await handleCron("Bearer s3cret-value", { ...env, [missing]: undefined }, run);
      expect(r.status).toBe(503);
    }
    expect((await handleCron("Bearer s3cret-value", { ...env, OWNER_USER_ID: "bukan-uuid" }, run)).status).toBe(503);
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects a wrong or missing token with 401 before doing anything", async () => {
    const run = vi.fn();
    expect((await handleCron(null, env, run)).status).toBe(401);
    expect((await handleCron("Bearer salah", env, run)).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("runs the sync for the owner and returns the counts", async () => {
    const run = vi.fn().mockResolvedValue(ok);
    const r = await handleCron("Bearer s3cret-value", env, run);
    expect(run).toHaveBeenCalledWith(OWNER);
    expect(r).toEqual({ status: 200, body: ok });
  });

  it("treats a throttled run as success, and a failed run as 502 with the safe message only", async () => {
    expect((await handleCron("Bearer s3cret-value", env, async () => ({ status: "throttled" }))).status).toBe(200);
    const r = await handleCron("Bearer s3cret-value", env, async () => ({ status: "error", message: "Tidak bisa menghubungi e-learning" }));
    expect(r.status).toBe(502);
    expect(JSON.stringify(r.body)).not.toMatch(/s3cret|service-key|authtoken/);
  });
});

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Each integration file boots its own in-process Postgres (PGlite). Too many at once starve each other, so cap the workers and give hooks room.
  test: { include: ["tests/**/*.test.ts"], testTimeout: 30_000, hookTimeout: 60_000, maxWorkers: 4 },
});

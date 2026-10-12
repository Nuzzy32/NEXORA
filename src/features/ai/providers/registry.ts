import { mockProvider } from "./mock";
import type { AiProvider } from "./types";

/**
 * Providers the UI may offer. Phase 0 has verified none (PRD §6), so production lists none;
 * development lists only the labelled mock. Real adapters join here after they pass the feasibility checklist.
 */
export function listProviders(): AiProvider[] {
  if (process.env.NODE_ENV === "production") return [];
  return [mockProvider].filter((p) => p.available());
}

export const getProvider = (id: string): AiProvider | undefined => listProviders().find((p) => p.id === id);

/** Label for any known adapter, listed or not, so old history keeps a readable name (e.g. mock replies viewed in production). */
export const providerLabel = (id: string): string => [mockProvider].find((p) => p.id === id)?.label ?? id;

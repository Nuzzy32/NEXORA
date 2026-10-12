import { claudeProvider } from "./anthropic";
import { mockProvider } from "./mock";
import type { AiProvider } from "./types";

const claude = [claudeProvider("claude-haiku-5-5"), claudeProvider("claude-sonnet-5-5")];

/**
 * Providers the UI may offer. Claude (official Anthropic API, paid) is listed only when the key is set and the owner
 * opted in (`chatEnabled`, D-027); the labelled mock only outside production (D-004).
 */
export function listProviders(chatEnabled = false): AiProvider[] {
  const paid = chatEnabled ? claude : [];
  const mock = process.env.NODE_ENV === "production" ? [] : [mockProvider];
  return [...paid, ...mock].filter((p) => p.available());
}

export const getProvider = (id: string, chatEnabled = false): AiProvider | undefined =>
  listProviders(chatEnabled).find((p) => p.id === id);

/** Label for any known adapter, listed or not, so old history keeps a readable name (e.g. mock replies viewed in production). */
export const providerLabel = (id: string): string => [...claude, mockProvider].find((p) => p.id === id)?.label ?? id;

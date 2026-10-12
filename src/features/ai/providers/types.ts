export type ChatRole = "user" | "assistant" | "system";
export type ChatMessage = { role: ChatRole; content: string };

/**
 * One AI backend behind the chat UI (PRD §6 rule 7: adapters stay apart from UI and business logic).
 * Only an adapter whose official mechanism has been verified (Phase 0) may report `available()`.
 */
export type AiProvider = {
  id: string;
  /** Shown in the selector. */
  label: string;
  /** Mock providers exist for development only and are never listed in production (D-004). */
  isMock: boolean;
  available(): boolean;
  /** One request, one full answer (no streaming yet). Throw `ProviderError` for a failure that is safe to show. */
  complete(messages: ChatMessage[]): Promise<Completion>;
};

export type Completion = { content: string; model: string; usage?: { inputTokens: number; outputTokens: number } };

/** A provider failure whose message is safe to show the user and store (never a raw upstream error). */
export class ProviderError extends Error {}

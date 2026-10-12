import type { ChatMessage } from "./providers/types";
import type { Message } from "./schema";

/** Most recent messages sent to a provider with each request. */
export const MAX_CONTEXT_MESSAGES = 40;

/** Rough size only: characters / 4. It is not a tokenizer and no provider has been consulted. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

/**
 * Exactly what a request carries: the conversation's finished messages plus the new one, newest MAX_CONTEXT_MESSAGES,
 * preceded by the context system message when the owner picked memory or projects (`contextText`, built by
 * buildContextBundle). That message is not one of the MAX_CONTEXT_MESSAGES but is part of the size estimate.
 * The server action and the Inspector both call this, so what the Inspector shows is what is sent.
 */
export function selectContext(
  history: Pick<Message, "role" | "content" | "status">[],
  draft: string,
  contextText = "",
): ChatMessage[] {
  const sent: ChatMessage[] = history
    .filter((m) => m.status === "complete" && m.content !== "")
    .map(({ role, content }) => ({ role, content }));
  const text = draft.trim();
  if (text) sent.push({ role: "user", content: text });
  const recent = sent.slice(-MAX_CONTEXT_MESSAGES);
  return contextText ? [{ role: "system", content: contextText }, ...recent] : recent;
}

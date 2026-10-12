import { contextItemCount } from "../context-bundle";
import { ProviderError, type AiProvider } from "./types";

export const MOCK_MODEL = "mock-deterministic";
/** Typing this as the last message makes the mock fail, so the error and retry states can be exercised in development. */
export const MOCK_FAIL_COMMAND = "/galat";

/** Deterministic stand-in for development. It says what it is and does not imitate a real model. */
export const mockProvider: AiProvider = {
  id: "mock",
  label: "MOCK · DEV",
  isMock: true,
  available: () => true,
  async complete(messages) {
    const system = messages.find((m) => m.role === "system");
    const turns = messages.filter((m) => m.role !== "system");
    const last = turns.findLast((m) => m.role === "user")?.content ?? "";
    if (last.trim() === MOCK_FAIL_COMMAND) throw new ProviderError("Galat simulasi dari provider mock.");
    const quoted = last.length > 200 ? `${last.slice(0, 200)}…` : last;
    return {
      model: MOCK_MODEL,
      content:
        `Ini balasan tiruan dari provider MOCK · DEV, bukan dari model AI. ` +
        `Aku menerima ${turns.length} pesan; yang terakhir (${last.length} karakter):\n\n${quoted}\n\n` +
        // Only how many items rode along, never what they said.
        `(mock) konteks: ${system ? contextItemCount(system.content) : 0} item\n\n` +
        `Ketik ${MOCK_FAIL_COMMAND} untuk mencoba tampilan galat dan coba lagi.`,
    };
  },
};

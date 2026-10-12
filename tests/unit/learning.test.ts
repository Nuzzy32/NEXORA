import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { formatBytes, isPdf, MAX_PDF_BYTES, titleFromFileName, uploadInputSchema } from "@/features/learning/schema";
import { LearningError, MAX_SUMMARY_INPUT_TOKENS, SUMMARY_MODEL, summarizePdf, type SummaryClient } from "@/features/learning/summarize";

describe("upload input", () => {
  it("accepts a PDF name within the size cap and refuses the rest", () => {
    expect(uploadInputSchema.safeParse({ fileName: "Bab 1.PDF", size: 1000 }).success).toBe(true);
    expect(uploadInputSchema.safeParse({ fileName: "a.docx", size: 1000 }).success).toBe(false);
    expect(uploadInputSchema.safeParse({ fileName: "a.pdf", size: 0 }).success).toBe(false);
    expect(uploadInputSchema.safeParse({ fileName: "a.pdf", size: MAX_PDF_BYTES + 1 }).success).toBe(false);
  });

  it("derives a title and formats sizes", () => {
    expect(titleFromFileName("Bab_3__Basis  Data.pdf")).toBe("Bab 3 Basis Data");
    expect(titleFromFileName(".pdf")).toBe("Dokumen");
    expect(formatBytes(1536 * 1024)).toBe("1,5 MB");
    expect(formatBytes(10)).toBe("1 KB");
  });

  it("recognises the PDF header", () => {
    expect(isPdf(new TextEncoder().encode("%PDF-1.7 ..."))).toBe(true);
    expect(isPdf(new TextEncoder().encode("<html>"))).toBe(false);
  });
});

function fake(tokens: number, reply: Partial<Anthropic.Message> = {}) {
  const create = vi.fn<SummaryClient["messages"]["create"]>(async () => ({
    model: SUMMARY_MODEL,
    stop_reason: "end_turn",
    content: [{ type: "text", text: "Inti dokumen." }],
    usage: { input_tokens: tokens, output_tokens: 200 },
    ...reply,
  }) as Anthropic.Message);
  const countTokens = vi.fn<SummaryClient["messages"]["countTokens"]>(async () => ({ input_tokens: tokens }));
  return { client: { messages: { create, countTokens } }, create, countTokens };
}

describe("summarizePdf", () => {
  it("counts first, then sends the PDF as a document block to Haiku", async () => {
    const { client, create } = fake(5000);
    const out = await summarizePdf(client, "JVBERi0=");
    expect(out).toEqual({ text: "Inti dokumen.", model: SUMMARY_MODEL, inputTokens: 5000, outputTokens: 200 });
    const params = create.mock.calls[0][0];
    expect(params.model).toBe(SUMMARY_MODEL);
    const content = params.messages[0].content as Anthropic.ContentBlockParam[];
    expect(content[0]).toMatchObject({ type: "document", source: { type: "base64", media_type: "application/pdf" } });
  });

  it("refuses an oversized PDF without the paid request", async () => {
    const { client, create } = fake(MAX_SUMMARY_INPUT_TOKENS + 1);
    await expect(summarizePdf(client, "x")).rejects.toThrow(/terlalu panjang/);
    expect(create).not.toHaveBeenCalled();
  });

  it("maps refusals, truncation and SDK errors to safe LearningErrors", async () => {
    await expect(summarizePdf(fake(10, { stop_reason: "refusal" }).client, "x")).rejects.toThrow(/menolak/);
    await expect(summarizePdf(fake(10, { stop_reason: "max_tokens" }).client, "x")).rejects.toThrow(/terpotong/);
    const broken = fake(10);
    broken.countTokens.mockRejectedValueOnce(new Error("raw upstream"));
    const err = await summarizePdf(broken.client, "x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LearningError);
    expect((err as Error).message).not.toContain("raw upstream");
  });
});

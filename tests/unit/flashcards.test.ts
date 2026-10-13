import { describe, expect, it } from "vitest";
import { cardStats, flashcardInputSchema, MAX_BOX, nextReview } from "@/features/learning/flashcards";

describe("nextReview (Leitner)", () => {
  const today = "2026-10-13";
  it("moves a remembered card up one box with a growing gap", () => {
    expect(nextReview(1, true, today)).toEqual({ box: 2, due_date: "2026-10-16" });
    expect(nextReview(3, true, today)).toEqual({ box: 4, due_date: "2026-10-27" });
  });
  it("stays in the top box once mastered", () => {
    expect(nextReview(MAX_BOX, true, today)).toEqual({ box: MAX_BOX, due_date: "2026-11-12" });
  });
  it("sends a forgotten card back to box 1, due tomorrow", () => {
    expect(nextReview(4, false, today)).toEqual({ box: 1, due_date: "2026-10-14" });
  });
  it("crosses month and year ends", () => {
    expect(nextReview(1, true, "2026-12-30")).toEqual({ box: 2, due_date: "2027-01-02" });
  });
});

describe("cardStats", () => {
  it("counts due (today or earlier) and mastered cards", () => {
    const cards = [
      { box: 1, due_date: "2026-10-12" },
      { box: 2, due_date: "2026-10-13" },
      { box: 5, due_date: "2026-11-01" },
    ];
    expect(cardStats(cards, "2026-10-13")).toEqual({ total: 3, due: 2, mastered: 1 });
  });
});

describe("flashcard input", () => {
  it("requires both sides and caps their length", () => {
    expect(flashcardInputSchema.safeParse({ front: " Apa itu RLS? ", back: "Row level security" }).data).toEqual({
      front: "Apa itu RLS?",
      back: "Row level security",
    });
    expect(flashcardInputSchema.safeParse({ front: "", back: "x" }).success).toBe(false);
    expect(flashcardInputSchema.safeParse({ front: "x", back: "y".repeat(2001) }).success).toBe(false);
  });
});

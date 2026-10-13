import { z } from "zod";
import { addDays } from "@/lib/date";

// Leitner boxes (D-030): remembered moves a card up one box, forgotten sends it back to box 1.
// The gap before the next review grows with the box.
export const BOX_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;
export const MAX_BOX = BOX_INTERVAL_DAYS.length;

export type Flashcard = {
  id: string;
  document_id: string;
  front: string;
  back: string;
  box: number;
  due_date: string;
  review_count: number;
};
export const FLASHCARD_COLUMNS = "id,document_id,front,back,box,due_date,review_count";

/** Box and due date after one answer, counted from `today` (YYYY-MM-DD, app timezone). */
export function nextReview(box: number, remembered: boolean, today: string): { box: number; due_date: string } {
  const next = remembered ? Math.min(Math.max(box, 1) + 1, MAX_BOX) : 1;
  return { box: next, due_date: addDays(today, BOX_INTERVAL_DAYS[next - 1]) };
}

export type CardStats = { total: number; due: number; mastered: number };

/** Progress for one document (LEARN-06): due = due today or earlier; mastered = in the top box. */
export function cardStats(cards: Pick<Flashcard, "box" | "due_date">[], today: string): CardStats {
  return {
    total: cards.length,
    due: cards.filter((c) => c.due_date <= today).length,
    mastered: cards.filter((c) => c.box === MAX_BOX).length,
  };
}

export const FLASHCARD_FIELDS = ["front", "back"] as const;
export const flashcardInputSchema = z.object({
  front: z.string("Pertanyaan wajib diisi").trim().min(1, "Pertanyaan wajib diisi").max(1000, "Pertanyaan maksimal 1.000 karakter"),
  back: z.string("Jawaban wajib diisi").trim().min(1, "Jawaban wajib diisi").max(2000, "Jawaban maksimal 2.000 karakter"),
});

export function parseFlashcardForm(formData: FormData) {
  return flashcardInputSchema.safeParse(Object.fromEntries(FLASHCARD_FIELDS.map((f) => [f, formData.get(f) ?? ""])));
}

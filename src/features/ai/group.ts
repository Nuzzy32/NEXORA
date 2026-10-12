import { daysBetween, localDate } from "@/lib/date";
import type { Conversation } from "./schema";

export const GROUP_LABELS = ["Hari ini", "Kemarin", "7 hari terakhir", "Lebih lama"] as const;
export type ConversationGroup = { label: (typeof GROUP_LABELS)[number]; items: Conversation[] };

/** History list sections by last activity (app timezone). Input order is kept; empty groups are dropped. */
export function groupConversations(items: Conversation[], today: string): ConversationGroup[] {
  const groups: ConversationGroup[] = GROUP_LABELS.map((label) => ({ label, items: [] }));
  for (const c of items) {
    const age = daysBetween(localDate(c.updated_at), today);
    groups[age <= 0 ? 0 : age === 1 ? 1 : age <= 7 ? 2 : 3].items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}

/** "10:42" in the app timezone, same zone as the date helpers in lib/date. */
export function clockLabel(timestamp: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: process.env.APP_TIMEZONE || "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(timestamp))
    .replace(".", ":");
}

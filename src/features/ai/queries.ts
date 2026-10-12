import "server-only";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import {
  CONVERSATION_COLUMNS,
  MESSAGE_COLUMNS,
  type Conversation,
  parseMessageContext,
  type Message,
} from "./schema";

/** Newest activity first. RLS limits this to the caller's conversations. */
export async function listConversations(): Promise<Conversation[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(200)
    .overrideTypes<Conversation[]>();
  if (error) throw new Error("Gagal memuat percakapan.");
  return data;
}

/** The conversation and its latest 500 messages, oldest first. Null for an unknown, malformed or foreign id. */
export async function getThread(id: string): Promise<{ conversation: Conversation; messages: Message[] } | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const { supabase } = await requireUser();
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_COLUMNS)
    .eq("id", id)
    .maybeSingle<Conversation>();
  if (error) throw new Error("Gagal memuat percakapan.");
  if (!conversation) return null;
  const { data, error: messagesError } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(500)
    .overrideTypes<(Omit<Message, "context"> & { context: unknown })[]>();
  if (messagesError) throw new Error("Gagal memuat pesan.");
  return { conversation, messages: data.reverse().map((m) => ({ ...m, context: parseMessageContext(m.context) })) };
}

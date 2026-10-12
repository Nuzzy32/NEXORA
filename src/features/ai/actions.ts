"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { failed, invalid, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { refreshApp } from "@/lib/revalidate";
import { snapshotOf, type ContextBundle } from "./context-bundle";
import { MAX_CONTEXT_MESSAGES, selectContext } from "./context";
import { findOwnedRefs, listContextRefs, loadContextBundle } from "./context-queries";
import { getProvider } from "./providers/registry";
import { ProviderError, type AiProvider, type ChatMessage } from "./providers/types";
import {
  DEFAULT_TITLE,
  TITLE_FIELDS,
  messageInputSchema,
  parseTitleForm,
  setContextInputSchema,
  titleFromMessage,
  type Message,
} from "./schema";

type HistoryMessage = Pick<Message, "role" | "content" | "status">;
const idSchema = z.uuid();
const MAX_REPLY = 32000;

/** Latest messages of a conversation, oldest first; `before` stops at a given timestamp (retry). */
async function loadHistory(supabase: SupabaseClient, conversationId: string, before?: string): Promise<HistoryMessage[]> {
  let q = supabase.from("messages").select("role,content,status").eq("conversation_id", conversationId);
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(MAX_CONTEXT_MESSAGES)
    .overrideTypes<HistoryMessage[]>();
  if (error) throw new Error("Riwayat gagal dimuat.");
  return data.reverse();
}

/** The owner's chat opt-in (D-027). Unreadable settings count as "off", so a paid provider is never resolved by mistake. */
async function chatEnabled(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase.from("owner_settings").select("chat_enabled").maybeSingle<{ chat_enabled: boolean }>();
  return data?.chat_enabled ?? false;
}

type Usage = { input_tokens: number | null; output_tokens: number | null };
type Reply = ({ ok: true; content: string; model: string } & Usage) | { ok: false; error: string };

/** Calls the provider. Only a ProviderError message reaches the user or the database; anything else becomes a generic one. */
async function ask(provider: AiProvider, context: ChatMessage[]): Promise<Reply> {
  try {
    const { content, model, usage } = await provider.complete(context);
    if (content.trim() === "") return { ok: false, error: "Provider mengembalikan balasan kosong." };
    return {
      ok: true,
      content: content.slice(0, MAX_REPLY),
      model: model.slice(0, 120),
      input_tokens: usage?.inputTokens ?? null,
      output_tokens: usage?.outputTokens ?? null,
    };
  } catch (e) {
    return { ok: false, error: (e instanceof ProviderError ? e.message : "Provider gagal merespons. Coba lagi.").slice(0, 500) };
  }
}

const usageOf = (r: Usage): Usage => ({ input_tokens: r.input_tokens, output_tokens: r.output_tokens });

/** Consent: the only place `chat_enabled` becomes true, and only from the opt-in button. Nothing is sent yet. */
export async function enableChat(): Promise<ActionState> {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("owner_settings")
    .upsert({ user_id: user.id, chat_enabled: true, chat_consented_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return failed("Chat Claude gagal diaktifkan. Coba lagi.");
  refreshApp();
  return { status: "ok", message: "Chat Claude diaktifkan." };
}

/** Turning it off clears the consent time; Claude disappears from the selector, the history stays readable. */
export async function disableChat(): Promise<ActionState> {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("owner_settings")
    .upsert({ user_id: user.id, chat_enabled: false, chat_consented_at: null }, { onConflict: "user_id" });
  if (error) return failed("Chat Claude gagal dimatikan. Coba lagi.");
  refreshApp();
  return { status: "ok", message: "Chat Claude dimatikan." };
}

export async function createConversation(): Promise<ActionState> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("conversations").insert({}).select("id").single();
  if (error) return failed("Percakapan gagal dibuat. Coba lagi.");
  refreshApp();
  redirect(`/ai?c=${data.id}`);
}

/**
 * Saves the user's message, asks the provider, saves the answer. A provider failure is saved as a failed
 * assistant reply (retryable) and still returns "ok": the message itself was kept.
 */
export async function sendMessage(conversationId: string, providerId: string, content: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const parsed = messageInputSchema.safeParse({ conversationId, providerId, content });
  if (!parsed.success) return failed(parsed.error.issues[0].message);
  const { conversationId: cid, providerId: pid, content: text } = parsed.data;
  const provider = getProvider(pid, await chatEnabled(supabase));
  if (!provider) return failed("Provider tidak tersedia.");

  const { data: conversation, error: findError } = await supabase
    .from("conversations")
    .select("title")
    .eq("id", cid)
    .maybeSingle<{ title: string }>();
  if (findError) return failed("Percakapan gagal dimuat. Coba lagi.");
  if (!conversation) return failed("Percakapan tidak ditemukan.");

  const history = await loadHistory(supabase, cid);
  // Read the picked context again now, so an edited memory item is current and a deleted one is gone. The same bundle
  // goes to the provider and, as titles only, into the message's snapshot.
  let bundle: ContextBundle;
  try {
    bundle = await loadContextBundle(supabase, cid);
  } catch {
    return failed("Konteks gagal dimuat. Coba lagi.");
  }
  // The composite FK (conversation_id, user_id) rejects a conversation that is not the caller's.
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: cid, role: "user", content: text, context: snapshotOf(bundle) });
  if (error) return failed("Pesan gagal disimpan. Coba lagi.");
  if (history.length === 0 && conversation.title === DEFAULT_TITLE) {
    await supabase.from("conversations").update({ title: titleFromMessage(text) }).eq("id", cid);
  }

  const reply = await ask(provider, selectContext(history, text, bundle.text));
  const row = reply.ok
    ? { role: "assistant", content: reply.content, model: reply.model, provider_id: provider.id, ...usageOf(reply) }
    : { role: "assistant", status: "error", error: reply.error, provider_id: provider.id };
  const { error: replyError } = await supabase.from("messages").insert({ conversation_id: cid, ...row });
  refreshApp();
  if (replyError) return failed("Balasan gagal disimpan. Coba lagi.");
  return { status: "ok" };
}

/** Re-asks the provider for a failed reply, in place. */
export async function retryMessage(messageId: string, providerId: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const id = idSchema.safeParse(messageId);
  const pid = z.string().min(1).max(64).safeParse(providerId);
  if (!id.success || !pid.success) return failed("Pesan tidak ditemukan.");
  const provider = getProvider(pid.data, await chatEnabled(supabase));
  if (!provider) return failed("Provider tidak tersedia.");

  const { data: target, error } = await supabase
    .from("messages")
    .select("conversation_id,created_at")
    .eq("id", id.data)
    .eq("role", "assistant")
    .eq("status", "error")
    .maybeSingle<{ conversation_id: string; created_at: string }>();
  if (error) return failed("Pesan gagal dimuat. Coba lagi.");
  if (!target) return failed("Pesan ini tidak perlu dicoba ulang.");

  const history = await loadHistory(supabase, target.conversation_id, target.created_at);
  // A retry carries what is picked now (the Inspector shows exactly that), not what the first attempt carried.
  let bundle: ContextBundle;
  try {
    bundle = await loadContextBundle(supabase, target.conversation_id);
  } catch {
    return failed("Konteks gagal dimuat. Coba lagi.");
  }
  const reply = await ask(provider, selectContext(history, "", bundle.text));
  const patch = reply.ok
    ? { content: reply.content, model: reply.model, provider_id: provider.id, ...usageOf(reply), status: "complete", error: null }
    : { error: reply.error, provider_id: provider.id };
  const { data, error: updateError } = await supabase
    .from("messages")
    .update(patch)
    .eq("id", id.data)
    .eq("status", "error")
    .select("id");
  if (updateError || data.length === 0) return failed("Balasan gagal disimpan. Coba lagi.");
  refreshApp();
  return reply.ok ? { status: "ok" } : failed(reply.error);
}

/**
 * Makes the conversation's picked context exactly `items` (idempotent). Only the owner's own memory and projects can be
 * picked; more than MAX_CONTEXT_ITEMS is refused. Nothing is sent to a provider here: the items ride along with the
 * next message, and only after the owner has seen them in the Inspector.
 */
export async function setConversationContext(conversationId: string, items: { kind: string; id: string }[]): Promise<ActionState> {
  const { supabase } = await requireUser();
  const parsed = setContextInputSchema.safeParse({ conversationId, items });
  if (!parsed.success) return failed(parsed.error.issues[0].message);
  const cid = parsed.data.conversationId;
  const wanted = [...new Map(parsed.data.items.map((r) => [`${r.kind}:${r.id}`, r])).entries()];

  try {
    const { data: conversation, error: findError } = await supabase.from("conversations").select("id").eq("id", cid).maybeSingle();
    if (findError) return failed("Percakapan gagal dimuat. Coba lagi.");
    if (!conversation) return failed("Percakapan tidak ditemukan.");

    const owned = await findOwnedRefs(supabase, wanted.map(([, r]) => r));
    if (wanted.some(([key]) => !owned.has(key))) {
      return failed("Sebagian item sudah tidak ada. Muat ulang daftar lalu pilih lagi.");
    }

    const current = await listContextRefs(supabase, cid);
    const keep = new Set(wanted.map(([key]) => key));
    const have = new Set(current.map((r) => `${r.kind}:${r.id}`));
    // Remove first so that swapping items in a full list never trips the limit.
    for (const kind of ["memory", "project"] as const) {
      const drop = current.filter((r) => r.kind === kind && !keep.has(`${r.kind}:${r.id}`)).map((r) => r.id);
      if (drop.length === 0) continue;
      const { error } = await supabase.from("conversation_context").delete().eq("conversation_id", cid).eq("kind", kind).in("ref_id", drop);
      if (error) return failed("Konteks gagal diterapkan. Coba lagi.");
    }
    const add = wanted.filter(([key]) => !have.has(key)).map(([, r]) => ({ conversation_id: cid, kind: r.kind, ref_id: r.id }));
    if (add.length > 0) {
      const { error } = await supabase.from("conversation_context").insert(add);
      if (error) return failed("Konteks gagal diterapkan. Coba lagi.");
    }
  } catch {
    return failed("Konteks gagal diterapkan. Coba lagi.");
  } finally {
    refreshApp();
  }
  return { status: "ok" };
}

export async function renameConversation(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const cid = idSchema.safeParse(id);
  if (!cid.success) return failed("Percakapan tidak ditemukan.");
  const parsed = parseTitleForm(formData);
  if (!parsed.success) return invalid(parsed.error, formData, TITLE_FIELDS);
  const { data, error } = await supabase.from("conversations").update(parsed.data).eq("id", cid.data).select("id");
  if (error) return failed("Judul gagal disimpan. Coba lagi.", formData, TITLE_FIELDS);
  if (data.length === 0) return failed("Percakapan tidak ditemukan.");
  refreshApp();
  return { status: "ok" };
}

/** Deletes the conversation and its messages (FK cascade), then returns to the empty workspace. */
export async function deleteConversation(id: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const cid = idSchema.safeParse(id);
  if (!cid.success) return failed("Percakapan tidak ditemukan.");
  const { error } = await supabase.from("conversations").delete().eq("id", cid.data);
  if (error) return failed("Percakapan gagal dihapus. Coba lagi.");
  refreshApp();
  redirect("/ai");
}

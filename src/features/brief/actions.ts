"use server";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { failed, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { todayISO } from "@/lib/date";
import { refreshApp } from "@/lib/revalidate";
import { generateBrief, planGeneration } from "./generate";
import { isInputEmpty } from "./input";
import { loadBriefInput } from "./queries";
import { BriefError } from "./schema";

const forceSchema = z.boolean();

/** Consent: the only place `brief_enabled` becomes true, and only from the opt-in button. Nothing is sent yet. */
export async function enableBrief(): Promise<ActionState> {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("owner_settings")
    .upsert({ user_id: user.id, brief_enabled: true, brief_consented_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return failed("Brief harian gagal diaktifkan. Coba lagi.");
  refreshApp();
  return { status: "ok", message: "Brief harian diaktifkan." };
}

/** Turning it off also clears the consent time, so turning it on again asks again. Stored briefs stay. */
export async function disableBrief(): Promise<ActionState> {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("owner_settings")
    .upsert({ user_id: user.id, brief_enabled: false, brief_consented_at: null }, { onConflict: "user_id" });
  if (error) return failed("Brief harian gagal dimatikan. Coba lagi.");
  refreshApp();
  return { status: "ok", message: "Brief harian dimatikan." };
}

/**
 * Makes today's brief if consent is on and a key exists. Returns the stored one unless `force`; forcing is capped per day.
 * The key is read by `new Anthropic()` from ANTHROPIC_API_KEY and never leaves the server.
 */
export async function generateTodayBrief(force = false): Promise<ActionState> {
  const { user, supabase } = await requireUser();
  const wantForce = forceSchema.safeParse(force);
  if (!wantForce.success) return failed("Permintaan tidak valid.");

  const today = todayISO();
  const [settings, existing] = await Promise.all([
    supabase.from("owner_settings").select("brief_enabled").maybeSingle<{ brief_enabled: boolean }>(),
    supabase.from("daily_briefs").select("refresh_count").eq("brief_date", today).maybeSingle<{ refresh_count: number }>(),
  ]);
  if (settings.error || existing.error) return failed("Brief harian gagal dimuat. Coba lagi.");

  const plan = planGeneration({
    enabled: settings.data?.brief_enabled ?? false,
    hasKey: Boolean(process.env.ANTHROPIC_API_KEY),
    existing: existing.data,
    force: wantForce.data,
  });
  if (plan.kind === "deny") return failed(plan.reason);
  if (plan.kind === "existing") return { status: "ok" };

  try {
    const input = await loadBriefInput();
    if (isInputEmpty(input)) return failed("Belum ada proyek berjalan atau tugas kuliah yang bisa diringkas.");

    const result = await generateBrief({ client: new Anthropic(), input });
    const { error } = await supabase.from("daily_briefs").upsert(
      {
        user_id: user.id,
        brief_date: today,
        content: result.content,
        model: result.model,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        refresh_count: existing.data ? existing.data.refresh_count + 1 : 0,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,brief_date" },
    );
    if (error) return failed("Brief dibuat tetapi gagal disimpan. Coba lagi.");
  } catch (e) {
    if (e instanceof BriefError) return failed(e.message);
    console.error("brief: kegagalan tak terduga", e instanceof Error ? e.name : typeof e);
    return failed("Brief gagal dibuat. Coba lagi.");
  }
  refreshApp();
  return { status: "ok", message: "Brief diperbarui." };
}

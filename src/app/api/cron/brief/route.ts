import Anthropic from "@anthropic-ai/sdk";
import { connection } from "next/server";
import { runBriefCron } from "@/features/brief/cron";
import { generateBrief } from "@/features/brief/generate";
import { loadBriefInputFor } from "@/features/brief/queries";
import { BriefError } from "@/features/brief/schema";
import { handleCron } from "@/features/elearning/cron";
import { createAdminClient } from "@/lib/db/admin";
import { todayISO } from "@/lib/date";

/**
 * Called once a day by Vercel Cron (vercel.json), after the e-learning sync. Not behind the login proxy: it checks
 * CRON_SECRET itself. It only runs for an owner who clicked "Aktifkan brief harian" and only with ANTHROPIC_API_KEY set.
 * The admin client bypasses RLS, so every query below is scoped to OWNER_USER_ID by hand.
 */
export async function GET(request: Request) {
  await connection();
  const { CRON_SECRET, OWNER_USER_ID, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const reply = await handleCron(
    request.headers.get("authorization"),
    { CRON_SECRET, OWNER_USER_ID, SUPABASE_SERVICE_ROLE_KEY },
    (ownerId) => {
      const db = createAdminClient();
      const today = todayISO();
      return runBriefCron({
        hasKey: Boolean(process.env.ANTHROPIC_API_KEY),
        loadSettings: async () => {
          const { data, error } = await db
            .from("owner_settings")
            .select("brief_enabled")
            .eq("user_id", ownerId)
            .maybeSingle<{ brief_enabled: boolean }>();
          if (error) throw new BriefError("Brief harian gagal dimuat.");
          return data ? { enabled: data.brief_enabled } : null;
        },
        loadExisting: async () => {
          const { data, error } = await db
            .from("daily_briefs")
            .select("refresh_count")
            .eq("user_id", ownerId)
            .eq("brief_date", today)
            .maybeSingle<{ refresh_count: number }>();
          if (error) throw new BriefError("Brief harian gagal dimuat.");
          return data;
        },
        loadInput: () => loadBriefInputFor(db, ownerId, today),
        generate: (input) => generateBrief({ client: new Anthropic(), input }),
        save: async (brief) => {
          const { error } = await db.from("daily_briefs").upsert(
            {
              user_id: ownerId,
              brief_date: today,
              content: brief.content,
              model: brief.model,
              input_tokens: brief.inputTokens,
              output_tokens: brief.outputTokens,
              refresh_count: 0,
              created_at: new Date().toISOString(),
            },
            { onConflict: "user_id,brief_date" },
          );
          if (error) throw new BriefError("Brief dibuat tetapi gagal disimpan.");
        },
      });
    },
  );
  return Response.json(reply.body, { status: reply.status, headers: { "cache-control": "no-store" } });
}

import { connection } from "next/server";
import { createAdminClient } from "@/lib/db/admin";
import { handleCron } from "@/features/elearning/cron";
import { runSync } from "@/features/elearning/sync";

/** Called once a day by Vercel Cron (see vercel.json). Not behind the login proxy: it checks CRON_SECRET itself. */
export async function GET(request: Request) {
  await connection(); // per-request: the clock and the secrets must not be frozen into a prerender
  const { CRON_SECRET, OWNER_USER_ID, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const reply = await handleCron(
    request.headers.get("authorization"),
    { CRON_SECRET, OWNER_USER_ID, SUPABASE_SERVICE_ROLE_KEY },
    (ownerId) => runSync(createAdminClient(), ownerId, new Date()),
  );
  return Response.json(reply.body, { status: reply.status, headers: { "cache-control": "no-store" } });
}

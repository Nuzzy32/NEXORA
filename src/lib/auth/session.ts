import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/db/server";

/**
 * Data-access gate: call at the top of every page data loader and Server Action.
 * Verifies the JWT (getClaims) and returns the user id plus a request-scoped Supabase client.
 * Memoized per request, so several loaders on one page verify the token once.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) redirect("/login");
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { user: { id: sub, email }, supabase };
});

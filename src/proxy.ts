import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/db/proxy-session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // api/cron/* answers to CRON_SECRET, not to a login cookie.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

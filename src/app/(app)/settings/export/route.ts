import { requireUser } from "@/lib/auth/session";
import { todayISO } from "@/lib/date";
import { exportFilename } from "@/features/settings/export";
import { loadExport } from "@/features/settings/queries";

/** Owner's data as one JSON download (SET-04). Never contains env values, keys or the feed URL. */
export async function GET() {
  await requireUser(); // outside the try: its redirect to /login must not be swallowed
  try {
    const now = new Date();
    const file = await loadExport(now);
    return new Response(JSON.stringify(file, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFilename(todayISO(now))}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Ekspor gagal. Coba lagi." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

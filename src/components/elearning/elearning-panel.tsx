import { io } from "next/cache";
import { agoSince } from "@/features/elearning/plan";
import { getElearningStatus } from "@/features/elearning/status";
import { AutoSyncRunner, SyncButton } from "./sync-client";

const code = "rounded-sm bg-raised px-1 py-px font-mono text-[11px] text-fg";

/** Connection and last-sync status for the e-learning calendar, with a manual sync button. Wrap in <Suspense>. */
export async function ElearningPanel() {
  await io(); // "N minutes ago" depends on the clock
  const s = await getElearningStatus();
  const failed = s.lastStatus === "error";
  const ago = s.lastSyncedAt ? agoSince(s.lastSyncedAt) : null;

  return (
    <section
      aria-label="Sinkronisasi e-learning UNAIR"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-line bg-surface px-4 py-3"
    >
      <div className="min-w-0 flex-1 basis-64">
        <p className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.08em] text-muted uppercase">
          <i
            aria-hidden
            className={"size-1.5 rounded-full " + (!s.connected ? "bg-faint" : failed ? "bg-danger" : s.lastSyncedAt ? "bg-ok" : "bg-faint")}
          />
          E-learning UNAIR
        </p>
        {!s.connected ? (
          <details className="mt-1.5 text-[13px] leading-5 text-muted">
            <summary className="min-h-6 cursor-pointer marker:text-faint hover:text-fg pointer-coarse:min-h-11">
              Belum terhubung · lihat caranya
            </summary>
            <p className="mt-1">
              Isi <code className={code}>ELEARNING_ICAL_URL</code> di <code className={code}>.env.local</code>. Cara mendapatkan
              URL: Moodle → Kalender → Impor atau ekspor kalender → Ekspor kalender → Dapatkan URL kalender.
            </p>
          </details>
        ) : failed ? (
          <p className="mt-1.5 text-[13px] leading-5 text-danger">
            Sinkron terakhir gagal ({ago}): {s.lastError}
          </p>
        ) : ago ? (
          <p className="mt-1.5 font-mono text-[12px] leading-5 text-muted">
            Terakhir sinkron {ago} · {s.created} baru, {s.updated} diperbarui
          </p>
        ) : (
          <p className="mt-1.5 text-[13px] leading-5 text-muted">Belum pernah disinkronkan.</p>
        )}
      </div>
      {s.connected && <SyncButton />}
      <AutoSyncRunner connected={s.connected} lastSyncedAt={s.lastSyncedAt} />
    </section>
  );
}

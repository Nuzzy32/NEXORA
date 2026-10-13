import { io } from "next/cache";
import { Panel } from "@/components/dashboard/panel";
import { Icon } from "@/components/ui/icons";
import { isInputEmpty, maxCostEstimateUSD } from "@/features/brief/input";
import { getBriefState, loadBriefInput } from "@/features/brief/queries";
import {
  BRIEF_MODEL_LABEL,
  briefContentSchema,
  estimateCostUSD,
  formatUSD,
  MAX_OUTPUT_TOKENS,
  MAX_REFRESHES_PER_DAY,
  type BriefContent,
  type StoredBrief,
} from "@/features/brief/schema";
import { AutoGenerate, BriefActions, EnableBriefButton } from "./brief-controls";

const label = "font-mono text-[10px] font-semibold tracking-[0.08em] text-muted uppercase";
const note = "text-[13px] text-muted";

export function BriefSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat brief" className="h-[132px] rounded-lg border border-line bg-surface motion-safe:animate-pulse" />
  );
}

/** Jam pembuatan di zona waktu aplikasi: "07.42". */
function clock(timestamp: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: process.env.APP_TIMEZONE || "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);

/**
 * "Brief harian" on the dashboard. Four honest states: no key, not opted in, enabled without a brief yet
 * (generates once), and a brief. Reads data and the clock: render inside <Suspense>.
 */
export async function BriefCard() {
  await io(); // "today" and the creation time are not stable values
  const state = await getBriefState();
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

  if (state.status === "error") {
    return (
      <Panel id="brief" title="Brief harian">
        <p role="alert" className="text-[13px] text-danger">
          Brief harian gagal dimuat. Muat ulang halaman untuk mencoba lagi.
        </p>
      </Panel>
    );
  }

  // A stored brief is only shown while the feature is on; after "Matikan" the opt-in offer comes back.
  if (state.brief && state.enabled) return <BriefView brief={state.brief} />;

  // Without a key the brief cannot run; the owner turned paid AI off (D-029). Settings shows how to configure it.
  if (!hasKey) return null;

  if (!state.enabled) {
    return (
      <Panel id="brief" title="Brief harian">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 max-w-prose space-y-2">
            <p className="text-[13px] font-medium">Ringkasan harian tiap proyek, ditulis {BRIEF_MODEL_LABEL}</p>
            <p className={note}>
              Setelah kamu aktifkan, dashboard mengirim ke Anthropic API: nama dan status proyek, tanggal mulai dan target, jumlah
              task, judul dan tenggat task terbuka, judul catatan keputusan, serta judul dan tenggat tugas kuliah. Tidak
              dikirim: isi catatan, memory, deskripsi, atau data akunmu.
            </p>
            <p className={note}>
              Jalur ini berbayar per token dari akun API-mu. Perkiraan batas atas{" "}
              <span className="font-mono text-[12px] text-fg">≈ {formatUSD(maxCostEstimateUSD())}</span> per brief (perkiraan,
              dengan keluaran maksimal {fmt(MAX_OUTPUT_TOKENS)} token); angka sebenarnya muncul setelah brief dibuat. Dibuat
              sekali sehari: otomatis tiap pagi sekitar 05.30 WIB (pada versi yang di-deploy ke Vercel) atau saat dashboard
              dibuka, mana yang lebih dulu. Bisa kamu matikan kapan saja.
            </p>
          </div>
          <div className="shrink-0">
            <EnableBriefButton />
          </div>
        </div>
      </Panel>
    );
  }

  // Enabled, no brief today: generate once, unless there is nothing to summarize.
  let empty = false;
  try {
    empty = isInputEmpty(await loadBriefInput());
  } catch {
    return (
      <Panel id="brief" title="Brief harian">
        <p role="alert" className="text-[13px] text-danger">
          Data untuk brief gagal dimuat. Muat ulang halaman untuk mencoba lagi.
        </p>
      </Panel>
    );
  }
  return (
    <Panel id="brief" title="Brief harian">
      {empty ? (
        <p className={note}>Belum ada proyek berjalan atau tugas kuliah yang bisa diringkas. Brief dibuat otomatis begitu ada.</p>
      ) : (
        <AutoGenerate />
      )}
    </Panel>
  );
}

function BriefView({ brief }: { brief: StoredBrief }) {
  const parsed = briefContentSchema.safeParse(brief.content);
  const refreshesLeft = Math.max(0, MAX_REFRESHES_PER_DAY - brief.refresh_count);
  const cost = estimateCostUSD(brief.input_tokens, brief.output_tokens);

  return (
    <Panel
      id="brief"
      title="Brief harian"
      aside={<span className="font-mono text-[11px] text-muted">dibuat {clock(brief.created_at)}</span>}
    >
      {parsed.success ? (
        <BriefBody content={parsed.data} />
      ) : (
        <p role="alert" className="text-[13px] text-danger">
          Brief tersimpan tidak bisa dibaca. Perbarui untuk membuat ulang.
        </p>
      )}
      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-3 md:flex-row md:items-center md:justify-between">
        <p className="min-w-0 font-mono text-[11px] break-words text-muted">
          {BRIEF_MODEL_LABEL} · {fmt(brief.input_tokens)} token masuk · {fmt(brief.output_tokens)} keluar · ≈{" "}
          {formatUSD(cost)} (perkiraan)
        </p>
        <BriefActions refreshesLeft={refreshesLeft} />
      </div>
    </Panel>
  );
}

/** Model text is rendered as plain text nodes only. */
function BriefBody({ content }: { content: BriefContent }) {
  return (
    <div className="space-y-4">
      <p className="text-[15px] leading-snug font-medium tracking-[-0.01em] break-words">{content.headline}</p>

      {content.projects.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {content.projects.map((p) => (
            <li key={p.name} className="min-w-0 rounded-md border border-line bg-raised/40 p-3">
              <h3 className="text-[13px] font-medium break-words">{p.name}</h3>
              <p className={`mt-1 break-words ${note}`}>{p.progress}</p>
              <p className={`mt-3 ${label}`}>Langkah berikutnya</p>
              <ul className="mt-1 space-y-1">
                {p.next.map((step, i) => (
                  <li key={i} className="flex gap-2 text-[13px] break-words">
                    <Icon name="arrowRight" className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    <span className="min-w-0">{step}</span>
                  </li>
                ))}
              </ul>
              {p.risk && <p className="mt-3 text-[12px] break-words text-warn">Risiko: {p.risk}</p>}
            </li>
          ))}
        </ul>
      )}

      {content.watch.length > 0 && (
        <div>
          <h3 className={label}>Perlu diperhatikan</h3>
          <ul className="mt-1.5 space-y-1">
            {content.watch.map((w, i) => (
              <li key={i} className="flex gap-2 text-[13px] break-words">
                <Icon name="warning" className="mt-0.5 size-3.5 shrink-0 text-warn" />
                <span className="min-w-0">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

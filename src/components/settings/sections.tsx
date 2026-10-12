import { io } from "next/cache";
import Link from "next/link";
import { Panel } from "@/components/dashboard/panel";
import { buttonClass } from "@/components/ui/button";
import { agoSince } from "@/features/elearning/plan";
import { getElearningStatus } from "@/features/elearning/status";
import { listProviders } from "@/features/ai/providers/registry";
import { maxCostEstimateUSD } from "@/features/brief/input";
import { BRIEF_MODEL, formatUSD } from "@/features/brief/schema";
import { countsFor, describeCounts } from "@/features/settings/delete";
import { getDataCounts, getOwnerSettings } from "@/features/settings/queries";
import { formatDate, localDate, todayISO } from "@/lib/date";
import { BriefToggle } from "./brief-toggle";
import { DangerList, type DangerItem } from "./danger-zone";
import { ExportButton } from "./export-button";
import { PrefsForm } from "./prefs-form";
import { code, note, SecretState, SettingRow, StatusPill } from "./parts";

const failedLoad = (what: string) => (
  <p role="alert" className="text-[13px] text-danger">
    {what} gagal dimuat. Muat ulang halaman untuk mencoba lagi.
  </p>
);

/** SET-01 and SET-03: what is connected. Only booleans and safe text are computed here; no secret or URL is read into output. */
export async function IntegrationsSection() {
  await io(); // "N menit lalu" and "today" depend on the clock
  const [elearning, settings] = await Promise.all([getElearningStatus(), getOwnerSettings()]);
  const providers = listProviders();
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const today = todayISO();
  const ago = elearning.lastSyncedAt ? agoSince(elearning.lastSyncedAt) : null;
  const briefOn = settings?.briefEnabled ?? false;

  return (
    <Panel id="integrations" title="Integrasi" flush>
      <ul className="divide-y divide-line">
        <SettingRow
          name="E-learning UNAIR"
          status={
            !elearning.connected ? (
              <StatusPill tone="off">Belum terhubung</StatusPill>
            ) : elearning.lastStatus === "error" ? (
              <StatusPill tone="danger">Sinkron gagal</StatusPill>
            ) : (
              <StatusPill tone="ok">Terhubung</StatusPill>
            )
          }
          action={
            elearning.connected && (
              <Link href="/tasks" className={buttonClass("ghost")}>
                Sinkronkan di Tasks
              </Link>
            )
          }
        >
          <SecretState name="ELEARNING_ICAL_URL" filled={elearning.connected} />
          {!elearning.connected ? (
            <p className={note}>Kalender iCal pribadi Moodle, dibaca dari server. Isi variabel di atas lalu jalankan ulang aplikasi.</p>
          ) : elearning.lastStatus === "error" ? (
            <p className="text-[13px] leading-5 text-danger">
              Sinkron terakhir gagal ({ago}): {elearning.lastError}
            </p>
          ) : ago ? (
            <p className="font-mono text-[12px] leading-5 text-muted">
              Terakhir sinkron {ago} · {elearning.created} baru, {elearning.updated} diperbarui
            </p>
          ) : (
            <p className={note}>Belum pernah disinkronkan. Tombol sinkron ada di halaman Tasks.</p>
          )}
        </SettingRow>

        <SettingRow
          name="Brief harian"
          status={
            !hasKey ? (
              briefOn ? <StatusPill tone="warn">Aktif, kunci belum diisi</StatusPill> : <StatusPill tone="off">Belum dikonfigurasi</StatusPill>
            ) : briefOn ? (
              <StatusPill tone="ok">Aktif</StatusPill>
            ) : (
              <StatusPill tone="off">Mati</StatusPill>
            )
          }
          action={(hasKey || briefOn) && settings && <BriefToggle enabled={briefOn} />}
        >
          <SecretState name="ANTHROPIC_API_KEY" filled={hasKey} />
          <p className={note}>
            Model <code className={code}>{BRIEF_MODEL}</code>, berbayar per token dari akun API-mu (perkiraan batas atas{" "}
            <span className="font-mono text-[12px] text-fg">≈ {formatUSD(maxCostEstimateUSD())}</span> per brief). Data proyek
            hanya dikirim ke Anthropic setelah kamu mengaktifkannya; isi catatan dan memory tidak dikirim.
          </p>
          {settings?.briefConsentedAt && briefOn && (
            <p className="font-mono text-[12px] text-muted">
              Disetujui {formatDate(localDate(settings.briefConsentedAt), today)}
            </p>
          )}
          {!settings && failedLoad("Status brief")}
        </SettingRow>

        <SettingRow
          name="Provider chat AI"
          status={providers.length === 0 ? <StatusPill tone="off">Belum terhubung</StatusPill> : undefined}
        >
          {providers.length === 0 ? (
            <p className={note}>Belum ada provider chat yang terhubung (Phase 0 belum selesai).</p>
          ) : (
            <ul className="space-y-1.5">
              {providers.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-[12px] text-fg">{p.label}</span>
                  {p.isMock && <span className={note}>Balasan tiruan untuk development, bukan model AI.</span>}
                </li>
              ))}
            </ul>
          )}
        </SettingRow>

        <SettingRow
          name="Database dan Auth"
          status={settings ? <StatusPill tone="ok">Terhubung</StatusPill> : <StatusPill tone="danger">Gagal</StatusPill>}
        >
          <p className={note}>
            {settings
              ? "Supabase: kueri ke database berhasil dan sesi masuk valid."
              : "Kueri ke Supabase gagal. Muat ulang halaman; bila berulang, periksa koneksi dan konfigurasi Supabase."}
          </p>
        </SettingRow>
      </ul>
    </Panel>
  );
}

/** SET-02. Timezone and theme are facts, not controls: neither can be changed from here today. */
export async function PrefsSection() {
  const settings = await getOwnerSettings();
  const timeZone = process.env.APP_TIMEZONE || "Asia/Jakarta";
  return (
    <Panel id="prefs" title="Preferensi workspace" flush>
      <ul className="divide-y divide-line">
        <li className="px-4 py-4">
          {settings ? <PrefsForm view={settings.tasksView} /> : failedLoad("Preferensi")}
        </li>
        <SettingRow name="Zona waktu" status={<StatusPill tone="info">Hanya baca</StatusPill>}>
          <p className="font-mono text-[12px] text-fg">{timeZone}</p>
          <p className={note}>
            Diatur lewat variabel <code className={code}>APP_TIMEZONE</code> di environment dan menentukan &quot;hari ini&quot; untuk
            tenggat dan brief.
          </p>
        </SettingRow>
        <SettingRow name="Tema">
          <p className={note}>Gelap (tema terang belum tersedia).</p>
        </SettingRow>
      </ul>
    </Panel>
  );
}

/** SET-04: export and delete. Row counts come from the database, so the dialogs state exactly what will go. */
export async function DataSection() {
  const counts = await getDataCounts();
  const base: Omit<DangerItem, "summary">[] = [
        {
          category: "memory",
          title: "Memory",
          dialogTitle: "Hapus semua memory?",
          hint: "Semua item memory, termasuk yang disematkan. Proyek dan task tidak tersentuh.",
        },
        {
          category: "conversations",
          title: "Percakapan AI",
          dialogTitle: "Hapus semua percakapan AI?",
          hint: "Semua percakapan beserta pesannya.",
        },
        {
          category: "briefs",
          title: "Brief harian",
          dialogTitle: "Hapus semua brief harian?",
          hint: "Brief yang tersimpan. Pengaturan brief (aktif atau mati) tidak berubah.",
        },
        {
          category: "elearning",
          title: "Tugas hasil impor e-learning",
          dialogTitle: "Hapus tugas hasil impor e-learning?",
          hint: "Hanya task yang berasal dari e-learning. Sinkron berikutnya mengimpor ulang tugas yang masih ada di kalender.",
        },
        {
          category: "all",
          title: "Semua data NEXORA",
          dialogTitle: "Hapus semua data NEXORA?",
          hint: "Proyek, task, catatan, memory, percakapan, brief, dan status sinkron. Brief harian dimatikan dan persetujuannya dicabut. Akun masuk (Supabase Auth) tetap ada.",
        },
  ];
  const items: DangerItem[] = counts ? base.map((i) => ({ ...i, summary: describeCounts(countsFor(i.category, counts)) })) : [];

  return (
    <>
      <Panel id="export" title="Ekspor data">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className={`min-w-0 flex-1 basis-72 ${note}`}>
            Satu berkas JSON berisi proyek, task, catatan, memory, percakapan, brief, pengaturan, dan status sinkron milikmu.
            Tidak berisi kunci API, URL e-learning, atau variabel environment apa pun.
          </p>
          <ExportButton />
        </div>
      </Panel>
      <section aria-labelledby="danger" className="overflow-hidden rounded-lg border border-danger/40 bg-surface">
        <div className="px-4 pt-3.5">
          <h2 id="danger" className="mb-3 text-[15px] leading-none font-medium tracking-[-0.01em] text-danger">
            Zona bahaya
          </h2>
        </div>
        <div className="border-t border-danger/20">
          {counts ? <DangerList items={items} /> : <div className="px-4 py-4">{failedLoad("Jumlah data")}</div>}
        </div>
      </section>
    </>
  );
}

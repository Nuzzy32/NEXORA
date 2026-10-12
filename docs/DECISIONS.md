# Decision Log

Format: keputusan, alasan, status. Tanggal dalam format ISO.

## D-001 — Nama dan lokasi dokumen (2026-10-10)
Nama produk **Nexora**; "Personal AI OS" adalah nama kerja lama. PRD ada di `docs/PRD.md`; dokumen awal dipindah ke `docs/foundation/` sebagai konteks historis. `CLAUDE.md` di root menggantikan `05_AI_CODING_RULES.md`.

## D-002 — Struktur folder mengikuti PRD §7 (2026-10-10)
`src/app/(app)/...`, `src/features/...`, `src/lib/{auth,db,validation,security}`. Rute AI adalah `/ai` (bukan `/chat`). Status: final untuk MVP.

## D-003 — Konteks memory ke chat adalah P1 (2026-10-10)
Dokumen `01` menaruhnya di P0; PRD (AI-09, AI-10, MEM-07) di P1. Ikuti PRD.

## D-004 — Provider mock (2026-10-10)
Boleh ada pada Phase 2 hanya di development, berlabel jelas, tidak tampil di production (AI-04, AI-06).

## D-005 — Auth: Supabase Auth, single-owner, skema siap multi-user (2026-10-10)
Satu pemilik akun, tetapi semua tabel personal memiliki `user_id` + RLS sejak awal. Sign-up publik dinonaktifkan di project Supabase (undangan/akun dibuat manual). Status: provisional sampai Open Question PRD §18 no. 4 dijawab.

## D-006 — Hosting: Vercel (2026-10-10)
Dipilih oleh pemilik. Risiko: jalur langganan yang butuh CLI/login interaktif mungkin tidak cocok dengan serverless. Diverifikasi di Phase 0; hasilnya dicatat di sini.

## D-007 — Package manager: pnpm; test: Vitest (unit/integration) + Playwright (e2e) (2026-10-10)
Default dipilih agar tidak menunda. Dapat diubah sebelum ada tes yang bergantung padanya.

## D-008 — Next.js 16 Cache Components (2026-10-10)
Scaffold menyalakan `cacheComponents`. Semua pembacaan sesi/cookie/searchParams dilakukan di komponen di dalam `<Suspense>`, tidak di level atas layout (lihat `src/app/(app)/*`). Tidak ada `use cache` pada data pengguna. Sesi dikelola oleh `src/proxy.ts` (pengganti `middleware`) dan divalidasi dengan `getClaims()`.

## D-009 — Skema Supabase (2026-10-10)
Mulai 2026-10-30 tabel `public` baru tidak otomatis terbuka ke Data API, jadi migration memberi `GRANT` eksplisit ke `authenticated` dan mencabut dari `anon`. Task→project memakai FK komposit `(project_id, user_id)` agar task tidak bisa menunjuk proyek milik user lain; hapus proyek mengosongkan `project_id` dan menyimpan task. `completed_at` dijaga CHECK terhadap `status = 'done'`. Zona waktu "hari ini" tetap `APP_TIMEZONE` (default Asia/Jakarta) sampai ada pengaturan profil.

## D-010 — RLS diuji dengan PGlite (2026-10-10)
Tidak ada Docker di mesin pengembangan, jadi `tests/integration/rls.test.ts` menjalankan migration asli di PGlite dengan stub schema `auth`. Ini membuktikan RLS, FK, dan constraint, tetapi bukan perilaku Supabase Auth/PostgREST yang sebenarnya; itu tetap perlu dicek pada project Supabase nyata.

## D-011 — Proyek dan catatan proyek (2026-10-10)
- Catatan (`project_notes`) hanya hidup di dalam proyek (PRD §8, §9: tidak ada menu "Notes" sendiri). Jenis dibatasi `note` dan `decision` (alur B di PRD §11); `milestone`, `bug`, `risk` menunggu PROJ-04 (P1) lewat migration baru. Isi catatan teks biasa (`whitespace-pre-line`); render Markdown ditunda agar tidak menambah dependency dan permukaan XSS.
- Hapus proyek menghapus catatannya (FK cascade) dan hanya melepas task dari proyek. Dialog hapus menyebutkan ini.
- Pencarian catatan: kolom generated `search_text` (judul + isi) dan satu filter `ILIKE`; wildcard `%`, `_`, `\` dari input pengguna di-escape (`likePattern`). Ini jawaban sementara untuk PRD §18 no. 7: FTS Postgres belum dibutuhkan pada skala pribadi.
- Jumlah task per proyek memakai view `project_task_counts` (`security_invoker = true`, jadi RLS tabel `tasks` tetap berlaku), bukan agregasi di klien yang bisa terpotong batas baris API.
- Arsip = `status = 'archived'`; task yang terhubung ke proyek terarsip tetap menampilkan proyeknya di form edit.
- Tab di halaman proyek (`?tab=tasks|notes`) dan filter/pencarian hidup di URL, agar bisa di-deep-link dan tombol Back bekerja.

## D-012 — Catatan Cache Components yang hanya terlihat di `next dev` (2026-10-10)
`next build` lulus, tetapi uji di browser menemukan dua hal yang perlu dijaga:
- `createClient()` (`src/lib/db/server.ts`) memanggil `await io()` setelah `cookies()`. Tanpa itu, validasi dev Next melaporkan `Date.now()` dari auth-js sebagai "unstable value while prerendering" di setiap rute berautentikasi.
- `usePathname()` pada navigasi membaca parameter rute dinamis (`/projects/[id]`), sehingga `<AppNav />` wajib berada di dalam `<Suspense>`; fallback-nya memakai `NavLinks` tanpa penanda aktif. Tanpa ini build gagal pada rute dinamis.
Aturan umum: komponen yang membaca sesi, `params`, `searchParams`, atau memakai hook rute harus berada di dalam `<Suspense>`.

## D-013 — Pola UI dari riset referensi (2026-10-10)
Riset ada di `docs/UI_REFERENCES.md` (putaran 1: Linear; putaran 2 di `docs/ui-research/`). Yang sudah diterapkan dan alasan teknisnya:
- Draft lokal untuk dialog "buat" (`src/lib/draft.ts`, `FormDialog draftKey`): `localStorage` best-effort, kedaluwarsa 30 hari, tidak pernah menyimpan dialog edit. Tidak ada secret/password di form mana pun, jadi aman disimpan di browser.
- Tab bar bawah di mobile menggantikan baris tautan di bilah atas (target sentuh 56px; PRD NFR-01 mewajibkan >= 44px).
- `requireUser()` dan `listProjectOptions()` dibungkus `cache()` React: beberapa loader dalam satu halaman memverifikasi token dan memuat proyek sekali per request.
- Quick-add (`quickAddTask`): judul saja; konteks datang dari halaman (proyek, atau "hari ini" yang dihitung di server dengan `APP_TIMEZONE`, bukan di klien). Dialog "Task baru" tetap untuk detail.
- "Besok →" (`postponeTask`) hanya untuk satu task terlambat per klik. Jadwal ulang massal ditunda sampai ada Urungkan (toast): ia akan menimpa banyak tanggal sekaligus.
- Prioritas Sedang tidak dicetak di baris task (bawaan); merah dicadangkan untuk "terlambat" dan galat.
- `/` dialihkan lewat `redirects` di `next.config.ts` (bukan halaman yang memanggil `redirect()`), agar validasi dev Next tidak mencatat `NEXT_REDIRECT`.

## D-014 — Penyelesaian UI (2026-10-11)
Hasil audit visual per layar (desktop 800px, mobile 375px) dengan data contoh:
- **Bug:** `<main>` adalah flex item tanpa `min-w-0`, sehingga teks ringkasan yang tidak membungkus melebarkan halaman di lebar ±800px. Diperbaiki dengan `min-w-0`.
- **Toast** (`src/components/ui/toast.tsx`, PRD §10): satu toast pada satu waktu, berhenti saat hover/fokus, `aria-live="polite"`, berada di atas tab bar mobile. Aksi yang bisa dibatalkan memakai tombol "Urungkan": selesai/buka lagi task (kembali ke status semula, mis. "Dikerjakan"), "Besok →" (tanggal lama dipulihkan), quick-add (task dihapus), arsip/pulihkan proyek. Hapus permanen tidak diberi Urungkan; ia tetap lewat dialog konfirmasi.
- **Baris task optimistis:** `TaskRow` menjadi komponen klien (`useOptimistic`), jadi ikon dan judul berubah seketika dan kembali sendiri bila server gagal. Harga yang dibayar: daftar proyek diserialisasi per baris; wajar untuk skala pribadi, ganti ke context bila daftar task mencapai ratusan.
- **Catatan membuka mode baca** (teks penuh, tombol Edit mengganti isi dialog menjadi form), supaya membaca keputusan lama tidak berisiko mengetik tak sengaja.
- **Dialog**: animasi masuk (`@starting-style`) dan bottom sheet di ponsel; klik backdrop tidak menutup form yang sudah diisi (D-013).
- **Sidebar**: logo, kolom cari (membuka palette lewat event `nexora:open-palette`), proyek berjalan (maks 5, desktop), chip pengguna. Tab bar bawah di mobile (D-013).
- **Tasks**: satu baris chip status + pilihan prioritas (native `<select>`, nyaman di ponsel); `?q=` memfilter judul dan menjadi target tautan palette.
- **Tema** tetap gelap saja (PRD: terang menyusul); `devIndicators` dipindah ke kanan bawah agar tidak menimpa chip pengguna saat pengembangan.
- Belum dibangun saat itu, sengaja (AI Workspace dan Memory kemudian dibangun, lihat D-016): layar AI Workspace/Memory/Learning/Settings (butuh fondasi Phase 2–3; layar tiruan akan melanggar "tidak ada klaim kemampuan palsu"), jadwal ulang massal, tema terang.

## D-015 — Arah visual: "jurnal pribadi yang cerdas" (2026-10-11) — digantikan oleh D-016
Konteks: UI pertama terasa generik. Penyebabnya ketahuan lewat audit dan skill UI: untuk tipe "Productivity Tool" basis datanya merekomendasikan "Flat + Minimalism", dan itu persis yang dibangun (kelabu kebiruan, satu aksen mint, font bawaan Next). Riset referensi putaran 1–2 hanya menghasilkan pola perilaku (undo, quick-add, palette), bukan identitas visual, dan sumbernya (Linear, Vercel, Notion) sendiri adalah tampilan "SaaS modern" yang generik. Keputusan:
- **Palet** tinta hangat + tulang + amber (aksen), sage (selesai), koral (terlambat). Semua token lulus kontras AA (teks utama 16:1, `muted` 6.4–7:1, `faint` ≥ 4.9:1 setelah dinaikkan dari 4.1:1).
- **Tipografi** Instrument Serif (judul, angka, judul seksi italic) + Instrument Sans (UI) + Geist Mono (data).
- **Struktur**: Dashboard berupa hero bersapaan, pita angka, kartu Fokus (satu task yang paling layak dikerjakan: sedang berjalan, lalu prioritas, lalu tenggat tertua), strip 7 hari, dan rel kanan (proyek berjalan, catatan terbaru). Projects berupa kartu dengan warna identitas per proyek (`projectColor`, tanpa kolom DB; bila ingin memilih warna sendiri nanti, tambahkan kolom `color`).
- **Tekstur & gerak**: butiran halus dan cahaya amber samar (tetap, inert), animasi masuk bertahap dengan easing tunggal, cincin progres yang terisi, dialog sebagai bottom sheet di ponsel. Tanpa glassmorphism dan tanpa gradien mencolok (PRD §10).
- **Command palette** (⌘K, `/`, tombol cari) selesai: pencarian task/proyek/catatan, Esc dua langkah, "Buat task" dengan Urungkan. `/tasks` mendukung `?q=` dan `?due=`.
- Yang sengaja tidak dilakukan: tema terang, ilustrasi/foto (tidak ada aset asli), dan layar Memory/AI/Learning/Settings.

## D-016 — Desain Stitch menggantikan "jurnal pribadi"; Memory dan AI Workspace dibangun lebih awal (2026-10-11)
Pemilik meminta UI mengikuti project Google Stitch "PRD Design Implementation" (5 layar: Dashboard, Tasks, Project Command Center, Memory, AI Workspace) dan menyetujui membangun Memory dan AI Workspace sekarang, melompati roadmap PRD §15 ke Phase 2. Phase 0 tetap belum selesai.
- **Visual:** D-015 digantikan. Token di `globals.css` diganti ke palet slate/cyan Stitch, font Geist + JetBrains Mono, radius 4px, tanpa grain/cahaya amber/serif. Nama token lama dipertahankan (`bg`, `surface`, `raised`, `line`, `fg`, `accent`, `ok`, `danger`, `info`) agar komponen tidak perlu menyebar hex; ditambah `overlay`, `agent`, `warn`. `projectColor` tetap dipakai sebagai titik identitas proyek.
- **Salinan Stitch yang sengaja dibuang** (klaim palsu menurut CLAUDE.md aturan 2 dan 4): "Verified", "mTLS", "encrypted/hardware encrypted", "zero retention/telemetry", "local-first/local-only", daftar model Claude/GPT/DeepSeek/Llama, nama "Alex Chen", versi/ID/ADR rekaan, statistik rekaan, "Est $0.004". Tidak ada P0..P3: prioritas tampil sebagai Tinggi/Sedang/Rendah. Tidak ada Board, kartu Milestone/Risk (Calendar kemudian dibuat, lihat D-019) (PROJ-04), Learning, Settings.
- **Dashboard:** kartu "Memory disematkan" (maks 3, hanya item yang disematkan) dan "Percakapan terbaru" (3) ditambahkan di rel kanan dengan data nyata; keduanya tidak tampil bila kosong. Kartu AI Stitch lain (Quick AI Launcher, Active Engines, Memory Graph, Throughput, Activity Stream) tidak dibuat: tidak ada data nyatanya.
- **Baris task** memakai container query (`@container`, `@lg:`), bukan breakpoint viewport: baris yang sempit (kolom dashboard di layar ±1000px) menumpuk meta di bawah judul agar "Terlambat N hari" tidak menimpa tombol "Besok →".
- **Projects:** tab `overview` ditambahkan ke `PROJECT_TABS`, default tetap `tasks`. Statistik proyek tidak menghitung proyek terarsip; "Keputusan tercatat" = catatan `kind = decision`. "Diperbarui ... lalu" berpresisi hari (hindari `Date.now()`, D-012).
- **Tasks:** filter proyek lewat `?project=` dibaca di halaman dengan zod. Satu form GET untuk pencarian, prioritas, dan proyek.
- **Memory** (`memory_items`, migration `20261011120000`): kolom `content`, kategori (architecture, preference, decision, code_pattern, project_note), tag, `pinned` (hanya penanda opt-in; belum ada pengiriman ke AI, D-003), FK komposit ke proyek dengan `set null`, trigger `memory_touch_updated_at` (sematkan tidak menggeser `updated_at`), pencarian ILIKE (D-011). Hapus lewat dialog konfirmasi, tanpa Urungkan. Ekspor (MEM-08, P1) ditunda.
- **AI Workspace** (`conversations`, `messages`, migration `20261011130000`): tanpa adapter ke API mana pun. `listProviders()` hanya mengembalikan provider mock berlabel "MOCK · DEV" saat `NODE_ENV !== "production"` (D-004); di production daftar kosong, composer nonaktif, riwayat tetap terbaca. Kegagalan provider disimpan sebagai balasan `assistant` berstatus `error` yang bisa dicoba ulang; pesan `user` tidak bisa diubah. Konteks permintaan = percakapan itu saja (maks 40 pesan terbaru); memory belum dilampirkan (AI-09/10 menyusul lewat jalur UI eksplisit). Estimasi token = karakter / 4, berlabel "perkiraan". Percakapan dipilih lewat `?c=<id>`.
- **Verifikasi:** typecheck, lint, 121 tes, dan `next build` lulus. Migration baru hanya teruji di PGlite (D-010), belum di Supabase nyata. Layar ber-auth belum pernah dijalankan di browser (tidak ada project Supabase); hanya `/login` yang diperiksa (font Geist, latar #0b0d11, tanpa overflow di 375px).

## D-017 — Tugas e-learning UNAIR lewat kalender iCal (2026-10-11)
Pemilik meminta tugas dari https://hebat.elearning.unair.ac.id (Moodle) masuk ke Tasks.
- **Sumber:** URL kalender iCal pribadi Moodle (Kalender → Ekspor kalender → "Dapatkan URL kalender"), dibaca server-side dari `ELEARNING_ICAL_URL`. Tanpa scraping HTML, endpoint privat, browser automation, login otomatis, atau penyimpanan password (CLAUDE.md aturan 2). URL berisi token rahasia: hanya di env, tidak pernah ke DB, log, pesan galat, props klien, atau tes.
- **Fetch:** wajib https, host `*.unair.ac.id`, `redirect: "error"`, timeout 15 dtk, maks 2 MB, tipe `text/calendar` atau `text/plain`; galat berupa kalimat tetap tanpa URL.
- **Data:** kolom `tasks.source/external_id/external_hash`; unique index parsial `(user_id, source, external_id)` membuat impor idempoten. Update hanya bila hash isi sumber berubah dan task belum selesai; task selesai tidak dibuka lagi; task tidak dihapus bila hilang dari feed. Tabel `integration_syncs` menyimpan status dan membatasi satu sinkron per 2 menit. Kalender hanya memuat tenggat: status pengumpulan di Moodle tidak diketahui, jadi task tidak otomatis selesai. Event "opens/dibuka" dan event lebih tua dari 7 hari dilewati.
- **Pemicu:** tombol "Sinkronkan e-learning" di /tasks, dan otomatis sekali saat Dashboard/Tasks dibuka bila sinkron terakhir > 6 jam (diam bila gagal).
- **Belum teruji** terhadap Moodle UNAIR yang asli (tidak ada akses); parser diuji dengan fixture bergaya Moodle.

## D-018 — Brief harian dengan Claude Haiku 5.5 (2026-10-11)
Pemilik meminta brief harian tentang proyek (sudah sampai mana, langkah berikutnya) dengan model termurah yang masih pintar.
- **Model:** `claude-haiku-5-5` ($0,10 input / $0,50 output per 1M token, prompt ≤ 100K, harga per 2026-10) lewat `@anthropic-ai/sdk` (dependency baru, alasan: klien resmi dengan galat bertipe dan structured output). Kunci `ANTHROPIC_API_KEY`, server-only. `effort: "low"`, `output_config.format` JSON schema, `max_tokens` 4000 (token thinking adaptif ikut terhitung), tanpa parameter sampling dan tanpa prefill; `stop_reason` diperiksa; keluaran divalidasi ulang dengan zod dan nama proyek dicocokkan dengan masukan.
- **Persetujuan (aturan 3 dan 10):** jalur berbayar dan mengirim data ke Anthropic, jadi opt-in lewat tombol "Aktifkan brief harian" yang menjelaskan apa yang dikirim dan perkiraan biaya. Persetujuan disimpan di `owner_settings.brief_consented_at` (CHECK melarang `brief_enabled` tanpa persetujuan) dan dikosongkan saat dimatikan. Tidak ada fallback ke model/penyedia lain.
- **Yang dikirim:** hanya allow-list: nama, status, tanggal, jumlah task, judul task terbuka teratas, judul catatan keputusan, dan judul tugas kuliah ≤ 14 hari. Tidak dikirim: isi catatan, memory, deskripsi, email, UUID. Input ≤ 16.000 karakter; judul dianggap data, bukan instruksi.
- **Biaya:** perkiraan sub-sen per brief (batas atas ±$0,0026); token nyata disimpan di `daily_briefs`. Perbarui paksa dibatasi 5×/hari (CHECK `refresh_count`).
- **Otomatisasi:** brief dibuat otomatis sekali saat Dashboard pertama kali dibuka pada hari itu. Cron terjadwal ditunda: butuh `service_role` di server dan Supabase nyata; `generateBrief` sudah dirancang agar route cron (Vercel Cron + `CRON_SECRET`) bisa memanggilnya kelak.
- Migration `20261011150000_daily_briefs.sql` (`daily_briefs`, `owner_settings`) baru teruji di PGlite (D-010).

## D-019 — Tasks tampil sebagai kalender bulanan (2026-10-11)
Daftar task bertumpuk (apalagi dengan tugas kuliah dari e-learning) sulit dipindai, jadi `/tasks` kini membuka kalender bulan; daftar lama tetap ada sebagai tampilan "Daftar".
- **URL:** `?view=calendar|list`, `?month=YYYY-MM`, `?day=YYYY-MM-DD`. Tanpa `view`, tautan yang membawa `status` atau `due` (palette, dashboard) tetap membuka daftar; selebihnya kalender. Pencarian, prioritas, dan proyek berlaku di kedua tampilan; chip status hanya di daftar.
- **Kalender:** grid Senin–Minggu, sel = tautan yang memilih hari (tanpa JS, bisa di-deep-link). Layar lebar: hingga 3 task per sel (rose = terlambat, cyan = prioritas tinggi, outline = e-learning, dicoret = selesai) + "+N lagi"; ponsel: titik berwarna. Kolom samping: hari terpilih (edit, selesaikan, tambah dengan tenggat hari itu), lalu "Terlambat" dan "Tanpa tanggal" agar tidak ada task yang hilang dari kalender. Di ponsel, memilih tanggal menggulir halus ke panel hari (`ScrollToDay`).
- **Data:** `listTasks` menerima `from`/`to`/`undated`; kalender memakai tiga query kecil (rentang minggu yang tampil, terlambat, tanpa tanggal) sehingga batas 500 baris tidak memotong task jauh di depan. `quickAddTask` menerima `"today"` atau tanggal ISO. Logika murni di `src/features/tasks/calendar.ts` (teruji).
- Pembacaan "hari ini" sebelum ada akses data memakai `await io()` (D-012); tanpa itu dev Next melaporkan `new Date()` saat prerender.
- Tidak dibuat: tampilan Board dan seret-lepas untuk memindah tanggal; tampilan minggu.

## D-020 — Settings dan data pemilik (2026-10-11)
Halaman `/settings` memenuhi PRD §5.6 (SET-01 sampai SET-04).
- **Status integrasi:** e-learning, brief harian, provider chat, dan koneksi database, semuanya dihitung server; ke klien hanya boolean/teks aman. Secret tidak pernah ditampilkan: hanya "Terisi" atau "Belum diisi" plus nama env var (SET-03). Provider chat kosong di production ditulis jujur (Phase 0 belum selesai).
- **Preferensi:** `owner_settings.default_tasks_view` (`calendar`/`list`, default `calendar`) menjadi default `/tasks` bila URL tidak menentukan; tautan dengan `status`/`due` tetap membuka daftar (D-019). Zona waktu tetap dari `APP_TIMEZONE`, hanya-baca di UI: membuatnya per-pengguna terlalu invasif karena `todayISO` sinkron dan dipakai di banyak tempat (ditunda). Tema terang belum ada; UI hanya menyatakan itu.
- **Ekspor:** `GET /settings/export` → JSON versi 1 (9 tabel, tanpa `user_id`, tanpa secret/env), dibaca per 1000 baris maks 50.000 per tabel dengan `truncated`/`truncated_tables`; gagal total (500) bila ada kueri yang gagal, bukan berkas parsial.
- **Hapus:** per kategori (memory, percakapan AI, brief, tugas e-learning) dan "hapus semua", permanen tanpa Urungkan, lewat RLS dengan urutan mengikuti FK; "hapus semua" wajib mengetik `HAPUS`. Akun Supabase Auth tidak dihapus; `owner_settings` hanya di-reset (app role tidak punya hak DELETE). Tugas e-learning yang dihapus diimpor ulang oleh sinkron berikutnya selama masih ada di kalender Moodle.
- Migration `20261011160000_settings_prefs.sql` baru teruji di PGlite (D-010).

## D-021 — Konteks memory dan proyek untuk chat (AI-09, AI-10, MEM-07) (2026-10-11)
- **Hanya atas pilihan pemilik:** tabel `conversation_context` menyimpan penunjuk (kind + ref_id), bukan salinan; menyematkan memory tidak melampirkannya. Teks dibaca ulang dari DB saat kirim, jadi edit memory tetap segar dan item yang terhapus dilewati.
- **Bentuk:** satu pesan sistem "Konteks dari pengguna", maks 10 item, memory ≤ 2000 karakter, total ≤ 8000, pemotongan ditandai eksplisit di teks dan inspektur. Isi dibungkus pembatas dan satu kalimat pengantar sebagai data, bukan instruksi (mitigasi, bukan jaminan terhadap prompt injection). Proyek: ringkasan, jumlah task, 6 task terbuka teratas (judul + tenggat), dan judul (bukan isi) catatan keputusan. Pesan konteks di luar batas 40 pesan tetapi ikut estimasi token.
- **Inspektur = yang terkirim:** `selectContext` dipakai server action dan inspektur dengan bundel yang sama; inspektur menampilkan teks persis yang dikirim. `messages.context` menyimpan hanya judul dan jumlah karakter (snapshot), bukan isi.
- **Integritas di DB** (trigger tanpa `SECURITY DEFINER`): batas 10 item (dengan `FOR UPDATE` agar tidak terlewati insert serentak), penunjuk harus milik sendiri, dan baris yatim dibersihkan saat memory/proyek dihapus. Tidak ada UPDATE: ganti pilihan = hapus + tambah. Retry memakai konteks yang sedang dipilih. Provider mock hanya melaporkan jumlah item.
- Migration `20261011170000_conversation_context.sql` baru teruji di PGlite (D-010).
- **Tes:** vitest dibatasi `maxWorkers: 4` dan `hookTimeout: 60s`, karena banyak PGlite paralel saling menghambat dan membuat `createDb` timeout di mesin sibuk.

## D-022 — PROJ-04: milestone, bug, dan risiko di proyek (2026-10-12)
- Jenis catatan proyek diperluas dari (note, decision) menjadi (note, decision, milestone, bug, risk) lewat migration `20261011180000_project_note_kinds.sql`, memenuhi janji D-011. Kolom baru `due_date` dan `resolved_at` hanya boleh terisi untuk milestone/bug/risk (CHECK di DB); RLS dan grant tidak berubah. Mengganti jenis ke Catatan/Keputusan menghapus tanggal dan tanda selesai.
- `toggleNoteResolved(id, resolved?)` idempoten bila status diberikan eksplisit, sehingga Urungkan memanggilnya dengan status sebaliknya.
- Project Command Center kini punya kartu "Milestone" (selesai dari total) dan "Risiko terbuka" dari data nyata, dihitung di proyek berjalan (active + on_hold); kartu proyek menampilkan "N risiko" bila ada. Tab Catatan punya filter `?kind=` dengan hitungan; Overview memuat milestone terdekat dan risiko terbuka. Kontrak URL D-011 tidak berubah.
- Tidak dibuat dari Stitch: tab "Milestones & Timeline" terpisah dan kotak "Risk Notice" (timeline dan teks rekaan), ID ADR dan angka rekaan.
- Batas: 1000 baris per query untuk kartu (cukup untuk skala pribadi). Judul risiko terbuka bisa ditambahkan ke input brief harian nanti. Migration baru teruji di PGlite saja (D-010).

## D-023 — Seret-lepas tenggat di kalender Tasks (2026-10-12)
- HTML5 drag-and-drop native, tanpa dependency baru. Payload hanya id task dengan MIME `application/x-nexora-task`. Chip kalender dan baris task di panel hari bisa diseret ke sel tanggal; pembaruan optimistis (`useOptimistic`) dengan toast "Urungkan" (pola D-014) lewat `rescheduleTask` dan `setTaskDueDate`. Hanya `due_date` yang berubah, tanpa migration. Task selesai dan task e-learning boleh dipindah; pindah manual bisa tertimpa bila Moodle mengubah tenggat dan task belum selesai.
- Layar sentuh tidak mendukung HTML5 DnD, jadi affordance seret hanya untuk pointer halus; jalur lain untuk memindah tanggal adalah dialog "Edit task" dan "Besok →". Sel kalender tetap tautan yang bisa difokus (pilih hari lewat keyboard). Koreksi D-019: seret-lepas kini ada; tampilan Board tetap tidak dibuat.
- Batas: baris di panel hari baru berubah setelah respons server; task di daftar "Terlambat"/"Tanpa tanggal" tidak punya chip untuk pembaruan optimistis (server tetap menulis dan menyegarkan).

## Pertanyaan terbuka
- Phase 0: jalur resmi OpenAI dan Anthropic untuk aplikasi web hosted (PRD §18 no. 1–3).
- Batas ukuran dan retensi PDF (no. 6). Full-text search Postgres cukup untuk memory MVP? (no. 7). GitHub sejak awal? (no. 8; asumsi: tidak).
- Supabase project belum dibuat; migration baru teruji di PGlite (D-010), belum di Supabase nyata.

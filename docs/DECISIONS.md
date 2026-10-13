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

## D-024 — Sinkron e-learning harian lewat Vercel Cron (2026-10-12)
- **Pemicu:** `vercel.json` memanggil `GET /api/cron/elearning` tiap hari 22:00 UTC (05:00 WIB). Route memakai `runSync` yang sama dengan tombol "Sinkronkan" dan sinkron otomatis saat membuka aplikasi, jadi idempotensi, hash, dan throttle 2 menit tetap berlaku. Cron hanya berjalan pada deployment Vercel; lokal tidak ada jadwal.
- **Otorisasi:** `Authorization: Bearer $CRON_SECRET` (dikirim Vercel Cron), dibandingkan dengan `timingSafeEqual` atas hash. Route tertutup (503) sampai `CRON_SECRET`, `OWNER_USER_ID` (uuid), dan `SUPABASE_SERVICE_ROLE_KEY` terisi. `/api/cron/*` dikecualikan dari proxy login karena memakai secret sendiri. Balasan hanya berisi hitungan dan kalimat tetap, tanpa URL kalender atau secret; sinkron gagal menjawab 502 supaya terlihat di log Vercel.
- **service_role:** tanpa sesi pengguna, RLS tidak bisa dipakai, jadi route memakai klien service-role (`src/lib/db/admin.ts`, server-only) yang dibatasi ke satu `OWNER_USER_ID` dan hanya dipakai di route ini. Ini pengecualian sadar dari "tanpa SECURITY DEFINER": tidak ada fungsi database baru, hanya `GRANT select, insert, update` pada `tasks` dan `integration_syncs` untuk `service_role` (migration `20261012100000_service_role_sync_grants.sql`; tanpa delete, tanpa tabel lain). Kunci tidak pernah ke klien atau `NEXT_PUBLIC_*`.
- **Belum:** brief harian tidak ikut dijadwalkan (butuh keputusan terpisah: ia berbayar dan butuh persetujuan; `generateBrief` sudah siap dipanggil dari cron serupa). Jalur cron ini belum diuji terhadap Supabase dan Vercel sungguhan; unit test mencakup otorisasi dan balasan, dan route diuji menjawab 503 saat belum dikonfigurasi.

## D-025 — Deploy ke Vercel (2026-10-12)
- Project Vercel `nexora` (akun `adrianfaishalhilmys-projects`) tersambung ke repo GitHub `Nuzzy32/NEXORA`; production di https://nexora-cyan-beta.vercel.app. Env production (terenkripsi): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `APP_TIMEZONE`, `ELEARNING_ICAL_URL`, `CRON_SECRET`. Belum diisi: `OWNER_USER_ID` dan `SUPABASE_SERVICE_ROLE_KEY`, jadi `/api/cron/elearning` menjawab 503 (tertutup) sampai keduanya ada (D-024).
- **Cron teruji end-to-end (2026-10-12):** setelah `OWNER_USER_ID` dan `SUPABASE_SERVICE_ROLE_KEY` terisi, `GET /api/cron/elearning` dengan Bearer yang benar menjawab 200 `{"status":"ok","created":0,"updated":0,"unchanged":13,"skipped":0}` (idempoten terhadap 13 tugas yang sudah ada); tanpa token 401. Temuan: `service_role` di project Supabase ini sudah punya semua hak tabel secara bawaan, jadi migration `20261012100000_service_role_sync_grants.sql` bersifat redundan (tidak berbahaya); batasan sebenarnya ada di kode (route hanya menyentuh `tasks` dan `integration_syncs`, dibatasi satu `OWNER_USER_ID`). Kesalahan awal: key yang tersimpan di Vercel bukan key secret (Supabase menjawab 401 pada PATCH klaim slot).
- Pemeriksaan dari luar: `/login` 200; `/dashboard`, `/tasks`, `/settings/export` dialihkan ke `/login`; cron 503. Sign-up publik Supabase sudah dimatikan sebelum deploy (D-005).
- Deploy pertama dikirim dari working tree lokal, bukan dari commit GitHub; push ke `main` berikutnya akan memicu deploy otomatis dari GitHub.
- Deploy otomatis dari GitHub sempat gagal dengan `git_info_fail` (2026-10-12): aplikasi Vercel di GitHub meminta pembaruan izin yang belum disetujui. Setelah disetujui pemilik (GitHub → Settings → Applications → Vercel), push ke `main` men-deploy otomatis. Deploy lewat CLI (`vercel deploy --prod --yes`) tetap bisa dipakai sebagai cadangan.
- Supabase MCP (project-ref `wwazidvylulavvbqtqgx`) dipasang dengan scope `local`, bukan `project`, agar konfigurasinya tidak ikut ter-commit di repo publik.

## D-026 — Brief harian terjadwal (2026-10-12)
- Cron kedua `GET /api/cron/brief` (vercel.json, 22:30 UTC = 05:30 WIB, setelah sinkron e-learning 05:00) membuat brief harian tanpa menunggu dashboard dibuka. Otorisasi, penutupan saat belum dikonfigurasi, dan klien service-role sama dengan D-024 (`handleCron` dibuat generik).
- **Persetujuan tetap lewat UI (aturan 3 dan 10):** job hanya berjalan bila pemilik sudah menekan "Aktifkan brief harian" (`owner_settings.brief_enabled`, CHECK mensyaratkan `brief_consented_at`) dan `ANTHROPIC_API_KEY` terisi di Vercel; tanpa itu menjawab 200 `skipped` dan tidak mengirim apa pun. Job tidak pernah mengaktifkan persetujuan. Mematikan brief di UI menghentikan cron di hari berikutnya.
- **Biaya terbatas:** satu brief per hari; bila brief hari itu sudah ada (dibuat cron atau dashboard) job tidak memanggil model lagi, dan job tidak menaikkan `refresh_count`. Input dan model sama dengan D-018 (claude-haiku-5-5, daftar field yang diizinkan, ≤ 16.000 karakter).
- **Isolasi data:** klien admin melewati RLS, jadi `loadBriefInputFor(supabase, userId, today)` memberi `.eq("user_id", userId)` pada setiap query (proyek, task, catatan, tugas kuliah); jalur pengguna memakai fungsi yang sama dengan `user.id`, sehingga satu kode untuk kedua jalur.
- Balasan cron hanya berisi status, jumlah token, atau kalimat tetap: tanpa isi brief, input, atau galat pustaka. Orkestrasi (`runBriefCron`) murni dengan dependensi yang disuntikkan, diuji tanpa database atau jaringan. Belum teruji terhadap Anthropic API sungguhan (tidak ada kunci di mesin ini).

## D-027 — Chat Claude lewat Anthropic API; Phase 0 untuk Anthropic (2026-10-12)
- **Phase 0:** lihat D-029. Ringkasnya: tidak ada jalur langganan resmi untuk aplikasi web yang di-host, jadi chat memakai Anthropic API key (berbayar per token).
- **Persetujuan:** pemilik memilih "dua-duanya" (chat Claude lalu Learning OS) pada 2026-10-12. Seperti brief (D-018), chat opt-in lewat tombol "Aktifkan chat Claude" di Settings: `owner_settings.chat_enabled` + `chat_consented_at` (CHECK, migration `20261013100000_chat_consent.sql`). Tanpa persetujuan atau tanpa `ANTHROPIC_API_KEY`, provider Claude tidak didaftar dan server action menolaknya (`getProvider(id, chatEnabled)`); setelan yang gagal dibaca dianggap mati. Mematikan menghapus jejak persetujuan; "Hapus semua" ikut mematikannya.
- **Model:** dua provider, `claude-haiku-5-5` ($0,10/$0,50 per 1 juta token) dan `claude-sonnet-5-5` ($2/$10), harga per 2026-10 di `CLAUDE_MODELS`. Non-streaming, `max_tokens` 8000 (setara batas kolom balasan), `effort: "low"`, thinking adaptif bawaan, tanpa parameter sampling. Pesan `system` NEXORA (konteks pilihan pengguna) digabung ke `system` API; riwayat dimulai dari pesan user pertama. Tanpa `fallbacks` server-side: penolakan ditampilkan sebagai penolakan, tidak dijalankan ulang di model lain (aturan 3, AI-07).
- **Biaya terlihat:** `messages.input_tokens/output_tokens` menyimpan token yang dilaporkan Anthropic; balasan menampilkan "token masuk → keluar · ≈ $biaya". Inspektur menampilkan tarif model terpilih. Galat SDK dipetakan ke kalimat tetap (`describeSdkError`), tanpa teks mentah.
- Belum: streaming, prompt caching (prefix percakapan pendek), batas biaya harian untuk chat.

## D-028 — Learning OS: PDF dan ringkasan (2026-10-12)
- **Penyimpanan:** bucket Supabase Storage privat `documents` (20 MB, hanya `application/pdf`, ditegakkan bucket) di jalur `<user_id>/<document_id>.pdf`; policy `storage.objects` hanya mengizinkan folder milik sendiri (select, insert, delete; tanpa update). Tabel `documents` (RLS, migration `20261013110000_documents.sql`). Menjawab PRD §18 no. 6: batas 20 MB, disimpan sampai pemilik menghapusnya.
- **Upload:** body server action di Vercel dibatasi 4,5 MB, jadi browser mengunggah langsung ke Storage dengan token signed upload URL sekali pakai dari server (`startUpload`), lalu `finishUpload` memeriksa ukuran dan tipe lewat `info()` sebelum status menjadi `ready`. Baris yang tertinggal di `uploading` bisa dihapus dari UI. Membuka PDF lewat route `/learning/file/[id]` yang mengalihkan ke signed URL 60 detik.
- **Ringkasan (LEARN-03/05):** hanya saat pemilik menekan "Buat ringkasan", dan hanya bila chat Claude sudah diaktifkan (D-027) dan kunci ada. Server mengunduh PDF, memeriksa header `%PDF-`, menghitung token dengan `count_tokens` (gratis) dan menolak di atas 100.000 token (tetap di tarif Haiku ≤100K, maks ±$0,012 per ringkasan), lalu satu permintaan ke `claude-haiku-5-5` dengan blok `document` base64. Hasilnya `summary_draft`; baru menjadi `summary` setelah pemilik meninjau, boleh mengubah, dan menyimpan. Token tersimpan dan biaya tampil.
- **Data pemilik:** ekspor memuat metadata dan ringkasan (bukan berkas PDF). Hapus kategori "Dokumen Learning" dan "Hapus semua" menghapus berkas di Storage lebih dulu, baru barisnya; bila Storage gagal, tidak ada yang dihapus.
- **Navigasi:** "Learning" di sidebar desktop, ikon di bilah atas ponsel (tab bar penuh), dan di command palette.
- Belum: kuis dan flashcard (LEARN-04), progres dan pengulangan (LEARN-06), pencarian isi PDF.
- Migration D-027/D-028 teruji di PGlite (dengan stand-in skema `storage`) dan diterapkan ke Supabase produksi 2026-10-12 lewat MCP; advisor keamanan tidak menemukan masalah baru.

## D-029 — Phase 0: login langganan Claude/ChatGPT untuk NEXORA (2026-10-13)
Pemilik meminta jalur langganan (bukan API) bila memang ada. Hasil pemeriksaan sumber resmi, diakses 2026-10-13:
- **Claude (Pro/Max/Team): tidak ada.** code.claude.com/docs/en/legal-and-compliance: OAuth langganan hanya untuk "ordinary use of Claude Code and other native Anthropic applications"; "Anthropic does not permit third-party developers to offer Claude.ai login"; developer produk, termasuk yang memakai Agent SDK, "should use API key authentication". code.claude.com/docs/en/agent-sdk/overview: "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login." `claude setup-token` (code.claude.com/docs/en/authentication) disebut untuk CI dan skrip, bukan untuk melayani web app. Tidak ada klausul Team yang mengubah ini. Tidak ditemukan program "Sign in with Claude" untuk aplikasi pihak ketiga.
- **ChatGPT (Plus/Pro/Team/Business): belum tersedia untuk NEXORA.** "Sign in with ChatGPT" dengan pemakaian kuota paket (scope `chatgpt.tokens.use.direct`, Responses API) ada, tetapi dokumentasinya (developers.openai.com/siwc, cookbook "sign-in-with-chatgpt") membatasi peluncuran ke proyek pribadi yang berjalan lokal, proyek open-source, dan "selected private apps"; aplikasi yang "remotely hosted" harus "join the waitlist" (openai.com/form/sign-in-with-chatgpt-interest). Login di situs web hanya identitas, untuk mitra komersial terpilih. Menurut kutipan pencarian dari help.openai.com (halaman tidak bisa dibuka langsung, 403), pemakaian paket hanya untuk Go/Plus/Pro, sedangkan Business/Enterprise hanya identitas. Panduan Codex: otomatisasi semestinya memakai API key.
- **Yang tidak dilakukan:** membungkus Claude Code/Codex CLI di server dengan token langganan, mengambil cookie/token sesi, atau endpoint privat (PRD §6 aturan 2; ketentuan kedua provider). Selain melanggar atau di luar cakupan dokumentasi, ini berisiko akun pemilik diblokir.
- **Keputusan:** chat Claude tetap lewat Anthropic API key dengan opt-in (D-027). OpenAI tetap "belum tersedia". Pemilik dapat mendaftar ke formulir minat OpenAI; bila disetujui, adapter "Sign in with ChatGPT" (OAuth, token di server, `stream: true`, `store: false`, refresh token) ditambahkan di registry tanpa mengubah UI. Klaim D-027 bahwa Phase 0 Anthropic selesai ditulis sebelum pemeriksaan ini; D-029 adalah verifikasinya.

## D-030 — Flashcard manual dengan pengulangan Leitner (LEARN-04 tanpa AI, LEARN-06) (2026-10-13)
- Chat AI dimatikan oleh pemilik (opsi 3 di D-029), jadi kartu ditulis sendiri per dokumen Learning. Tabel `flashcards` (RLS, migration `20261013120000_flashcards.sql`) dengan FK komposit `(document_id, user_id)` ke `documents` (butuh unique `(id, user_id)` baru), ikut terhapus bersama dokumennya.
- **Jadwal:** kotak Leitner 1–5 dengan jeda 1, 3, 7, 14, 30 hari (`nextReview`, murni dan teruji). Diingat → naik satu kotak; lupa → kotak 1, muncul lagi besok (tidak diulang di sesi yang sama). Kotak baru dihitung di server dari kotak tersimpan, bukan dikirim klien. Kartu baru jatuh tempo hari ini (APP_TIMEZONE).
- **UI:** `/learning/[id]` (statistik kartu/jatuh tempo/dikuasai, tambah, ubah, hapus), `/learning/review` (satu kartu per layar, `?d=` untuk satu dokumen), ringkasan progres di kartu dokumen dan banner "jatuh tempo" di `/learning`. Ekspor dan hapus data mencakup flashcard.
- Belum: kartu dari AI (menunggu keputusan provider), statistik riwayat latihan per hari.

## D-031 — Aktivitas terbaru, timeline proyek, tema terang (2026-10-13)
- **Aktivitas (DASH-06):** panel "Aktivitas terbaru" di rel Dashboard, digabung dari timestamp yang sudah ada (task selesai/dibuat, proyek, catatan, memory, PDF), maks 8 item. Bukan log peristiwa: item menunjukkan keadaan terakhir ("diperbarui" bila berubah > 1 menit setelah dibuat). Task impor e-learning tidak ditampilkan agar satu sinkron tidak membanjiri daftar.
- **Timeline proyek (Phase 5):** tab `?tab=timeline` di detail proyek: tanggal mulai, target selesai, milestone/bug/risiko bertanggal, dan task bertenggat, dikelompokkan per bulan dengan penanda "Hari ini". Satu kolom vertikal di semua lebar layar; item tanpa tanggal hanya dihitung. Tidak ada Gantt atau tanggal rekaan.
- **Tema terang (SET-02):** token terang di `globals.css` (`:root[data-theme="light"]`, dan `"system"` mengikuti `prefers-color-scheme`); semua warna teks ≥ 4,5:1 pada bg, surface, raised (diukur). Pilihan disimpan per perangkat di `localStorage` dan diterapkan sebelum paint oleh skrip kecil di `layout.tsx`; default tetap gelap. Tidak di database: membacanya di root layout akan membuat seluruh shell dinamis (Cache Components, D-008).

- **Pemeriksaan layar (MVP AC 13, 2026-10-13):** semua layar ber-auth (Dashboard, Tasks kalender/daftar, Projects, AI, Memory, Learning, Latihan, Settings) dimuat di 375px dan 1280px lewat `next dev` dengan sesi pemilik: tanpa overflow horizontal, tanpa galat, tanpa redirect. Perbaikan: chip "N terlambat" di kartu statistik kini membungkus; kartu brief disembunyikan bila `ANTHROPIC_API_KEY` kosong (AI dimatikan, D-029; statusnya tetap di Settings); dokumen Learning bisa diringkas manual ("Tulis ringkasan") dan tombol ringkasan otomatis tidak tampil saat AI nonaktif. Belum teruji di browser: upload PDF sungguhan, tab Timeline dan flashcard dengan data (database belum punya proyek atau dokumen).

## D-032 — GitHub per proyek (PROJ-05) dan modul Kuliah (2026-10-13)
- **GitHub:** kolom `projects.github_repo` ("pemilik/nama", CHECK pola yang sama dengan zod; URL github.com yang ditempel diubah otomatis). Tab Overview proyek menampilkan 5 commit terbaru dan 5 issue/PR terbuka lewat REST API GitHub, dibaca di server per kunjungan (`no-store`, timeout 8 dtk). `GITHUB_TOKEN` opsional dan server-only: tanpa token hanya repo publik (60 permintaan/jam per IP); dengan fine-grained token read-only, repo privat dan 5000/jam. Token tidak disimpan di database dan tidak pernah dikirim ke klien. Galat dipetakan ke kalimat tetap (404 / 401 / batas permintaan / repo kosong). Hanya baca: tidak ada OAuth, webhook, atau penulisan ke GitHub.
- **Kuliah (permintaan pemilik: fitur akademik):** `/courses` dengan tabel `courses` (nama, kode, SKS 1–24, semester 1–14, dosen, nilai A/AB/B/BC/C/D/E) dan `course_sessions` (hari ISO 1–7, jam mulai < jam selesai, ruang; FK komposit, ikut terhapus). IPS dan IPK dihitung aplikasi: Σ(bobot × SKS) / Σ SKS hanya atas mata kuliah bernilai, bobot A=4, AB=3,5, B=3, BC=2,5, C=2, D=1, E=0, dibulatkan 2 desimal. "Semester berjalan" = semester tertinggi yang ada. Jadwal mingguan semester itu tampil di `/courses` dan panel "Kuliah hari ini" di Dashboard. Ekspor dan hapus data mencakup keduanya (kategori "Mata kuliah").
- Navigasi: "Kuliah" di sidebar desktop, ikon kalender di bilah atas ponsel, dan di command palette.
- **Diperiksa di browser (2026-10-13):** migration diterapkan ke produksi; alur tambah mata kuliah → nilai → jadwal → panel "Kuliah hari ini" → hapus diuji dengan data berlabel TES lalu dihapus (sisa 0 baris). Perbaikan: dialog di dalam empty state tidak lagi mewarisi `text-center`; ikon bilah atas ponsel dirapatkan karena ikon Kuliah membuat lebar 380px di layar 375px. Panel GitHub belum dilihat dengan repo sungguhan (belum ada proyek), hanya teruji lewat unit test dengan fetch palsu.
- Belum: menghubungkan tugas e-learning, PDF, atau flashcard ke mata kuliah; target IPK; impor jadwal dari SIAKAD (tidak ada API resmi yang diketahui).

## D-033 — Tautan ke mata kuliah, target IPK, timer fokus (2026-10-13)
- **Tautan:** kolom `tasks.course_id` dan `documents.course_id` (FK komposit ke `courses`, `on delete set null`, migration `20261013140000_course_links_study.sql`). Tugas impor e-learning ditautkan otomatis (`linkElearningTasks`) setelah setiap sinkron dan setiap kali mata kuliah disimpan: kode Moodle (mis. SIA302) di baris "Mata kuliah:" deskripsi diutamakan, selain itu judul harus diawali "<nama mata kuliah> · " (tanpa beda huruf besar); kecocokan ganda tidak ditautkan, tautan yang ada tidak ditimpa. Semua query fungsi itu memakai `user_id` eksplisit karena juga dipanggil cron service-role. PDF ditautkan manual lewat pilihan di kartu dokumen. Task buatan sendiri belum bisa ditautkan dari form task (ditunda: butuh menambah daftar mata kuliah ke semua form task).
- **Halaman `/courses/[id]`:** tugas terbuka, materi PDF dengan progres flashcard dan tombol latihan khusus mata kuliah itu (`/learning/review?c=`), jadwal, timer fokus, dan menit belajar minggu ini.
- **Target IPK:** dihitung di browser dari data halaman (tidak disimpan): rata-rata bobot minimal untuk SKS yang belum bernilai = (target × total SKS − bobot saat ini) / SKS tersisa, dengan huruf terendah yang mencapainya; ≤ 0 "aman", > 4 "belum terjangkau".
- **Timer fokus:** 25 atau 50 menit, dihitung dari timestamp (tetap tepat walau tab di latar). Sesi selesai, atau dihentikan setelah ≥ 1 menit, dicatat di `study_sessions` (1–240 menit, tanpa UPDATE). "Minggu ini" = sejak Senin menurut APP_TIMEZONE. Ekspor dan hapus "Mata kuliah" mencakup sesi belajar.
- **Diperiksa di browser (2026-10-13):** migration diterapkan ke produksi. Mata kuliah uji berkode SIA302 langsung menautkan 7 tugas e-learning; halaman detail menampilkan 7 tugas itu; timer 1 menit tercatat dan muncul di "Belajar minggu ini"; target IPK benar; 375px tanpa overflow; menghapus mata kuliah melepas tautan ke 7 tugas (FK set null). Temuan sampingan: dev server lama sempat melayani kode basi setelah `next build` dijalankan bersamaan; restart dev server menyelesaikannya.

## Pertanyaan terbuka
- Phase 0: lihat D-029. OpenAI menunggu waitlist "Sign in with ChatGPT" untuk aplikasi yang di-host (PRD §18 no. 1–2).
- Full-text search Postgres cukup untuk memory MVP? (no. 7). GitHub sejak awal? (no. 8; asumsi: tidak).

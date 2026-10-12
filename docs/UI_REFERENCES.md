# Referensi UI Nexora

Riset: 2026-10-10. Semua isi diparafrase; tidak ada aset, logo, atau teks panjang yang disalin (PRD §10: pelajari pola, bukan identitas).

## Ringkasan

- **Terverifikasi:** 14 halaman Linear (dokumentasi, changelog 2024-2026, dua artikel desain) benar-benar dibuka dan dibaca. Semua pola bernomor di bawah bersumber dari halaman-halaman itu.
- **Belum:** Notion, Raycast, Vercel Geist, Things 3, Todoist, Plane, Attio, dan Basecamp tidak dibuka pada sesi ini (riset dipersingkat karena batas waktu). Tidak ada pola yang diatribusikan ke mereka. Lihat "Pola pelengkap" dan "Batasan riset".
- **Tema besar:** (1) chrome yang tenang, struktur terasa dan tidak berteriak; (2) daftar "milik saya" berurutan fokus; (3) pencarian dua tingkat; (4) status dan progres berbasis kategori, bukan dekorasi; (5) keyboard sebagai lapisan opsional di atas UI yang tetap penuh bisa diklik dan disentuh.
- **Selaras dengan kode sekarang:** checkbox bulat 44px (`task-row.tsx`), seksi Dashboard yang menyembunyikan seksi kosong, filter berbasis URL (`task-filters.tsx`), `ListSkeleton`, token tema berkontras rendah (`globals.css`). Satu temuan: `NavLinks` di `app-nav.tsx` memakai `min-h-10` (40px), di bawah target sentuh 44px dari PRD.
- **Prinsip pendukung:** halaman Linear Method (https://linear.app/method/introduction) menekankan alat yang dibuat untuk tujuan jelas dan "sederhana dulu"; searah dengan prinsip PRD "functional over decorative".

Cara membaca: **Dampak** = seberapa besar memperbaiki layar yang sedang dibangun (Tinggi/Sedang/Rendah). **Usaha** = perkiraan kasar: S beberapa jam, M sekitar 1-2 hari, L lebih dari 2 hari. Pola diurutkan dari yang paling berdampak. Label **[adaptasi kami]** berarti ide implementasi kami sendiri, bukan klaim tentang produk sumber.

---

## Status penerapan (diperbarui 2026-10-10, ditulis oleh kami, bukan hasil riset)

| # | Pola | Status | Catatan |
|---|------|--------|---------|
| 1 | Chrome tenang | Sebagian | `PageHeader` seragam di Dashboard/Tasks/Projects; sidebar dengan ikon 16px; target nav 44px. Token tidak diubah. |
| 2 | Dashboard berurutan fokus | Selesai | `in_progress` dulu, lalu prioritas, lalu tanggal; seksi "7 hari" kronologis; tautan "Lihat semua task aktif". |
| 3 | Detail proyek | Sebagian | Ringkasan di header + tab Tasks/Catatan di URL. Panel properti samping sengaja ditunda (proyek masih kecil). |
| 4 | Pencarian dua tingkat | Sebagian | Cari catatan per proyek + "N hasil" + "Hapus filter". Palette global dan debounce live belum. |
| 5 | Navigasi mobile | Sebagian | Tab bar bawah 56px dengan ikon. Aksi "Tambah" global belum; tiap halaman punya tombolnya sendiri. |
| 6 | Progres proyek | Selesai | Cincin di daftar, bar + "N dari M" di detail, "Belum ada task" saat kosong. |
| 7 | Status berikon | Selesai | `StatusIcon`: cincin kosong / setengah / centang aksen; label "Terlambat N hari". |
| 8 | Daftar berkelompok | Sebagian | Dashboard mengelompokkan 7 hari per hari; menu "Tampilan" di Tasks belum. |
| 9 | Draft form | Selesai | Draft lokal untuk dialog buat (task, proyek, catatan), pulih + "Buang", kedaluwarsa 30 hari; klik backdrop tidak menutup form yang sudah diisi. |
| 10 | Lapisan keyboard | Sebagian | Lewat palette (⌘K, `/`, panah, Enter, Esc). Pintasan per baris (j/k, x, e) belum. |
| 11 | Token tema | Belum | Opsional. |

### Putaran 2 (laporan lengkap di `docs/ui-research/`)

Sumber: Raycast dan Notion ([raycast-notion.md](ui-research/raycast-notion.md)); Vercel Geist, Things, Todoist, Plane ([vercel-things-todoist-plane.md](ui-research/vercel-things-todoist-plane.md)). Setiap berkas memuat daftar halaman yang tidak sempat dibuka.

| Pola | Status | Catatan |
|------|--------|---------|
| Quick-add inline (Todoist/Things/Raycast) | Selesai | Satu kolom judul di Tasks, tab Tasks proyek (proyek terisi), dan Dashboard ("hari ini" terisi). Parser tanggal dan pintasan `q` belum. |
| Hari ini sebagai rencana kecil (Things/Todoist) | Selesai | Judul "Terlambat" netral, hanya teks "Terlambat N hari" yang merah; "7 hari" dikelompokkan per hari; "Hari ini" selalu tampil dengan pesan kosong. |
| Terlambat punya jalan keluar (Todoist) | Sebagian | Tombol "Besok →" per task terlambat. Jadwal ulang massal dan Urungkan sengaja belum: mengubah banyak tanggal sekaligus tanpa Urungkan tidak aman. |
| Baris: tampilkan yang menyimpang dari bawaan (Plane/Geist) | Selesai | Prioritas Sedang tidak dicetak, Tinggi tebal tanpa merah. Merah hanya berarti terlambat atau galat. |
| Empty state berisi aksi (Geist/Raycast) | Selesai | "Hapus filter" / "Lihat proyek berjalan" di Tasks, Projects, dan Catatan. `error.tsx` menampilkan kode digest. |
| Tab: sembunyikan hitungan nol (Geist) | Selesai | |
| Skeleton menghormati reduced-motion (Geist) | Selesai | `motion-safe:animate-pulse`. |
| Target sentuh 44px pada chip filter (temuan agen) | Selesai | `pointer-coarse:min-h-11`. |
| Filter "Terlambat" di Tasks (Notion: satu data banyak tampilan) | Sebagian | Chip status baru; tab preset penuh dan urutan belum. |
| Palette berlapis + Cmd/Ctrl+K (Raycast/Notion/Linear) | Selesai | ⌘K, `/`, tombol cari; bagian tetap Tasks, Proyek, Catatan, Aksi; Esc dua langkah; "Buat task" dengan Urungkan. Riwayat "terakhir dibuka" belum. |
| Toast + Urungkan (Geist) | Selesai | Dipakai untuk selesai/buka lagi, "Besok →", quick-add, arsip. Jadwal ulang massal tetap belum. |
| Catatan: baca dulu, edit kemudian (Notion) | Selesai | Dialog catatan terbuka sebagai tampilan baca; "Edit" mengganti isinya menjadi form. |
| Sidebar "Proyek" (Notion) | Selesai | Maks 5 proyek berjalan di sidebar desktop, dengan cincin progres. |
| Menu aksi per baris (Raycast) | Belum | Baris punya dua aksi cepat (selesai, "Besok →"); menu lengkap belum dibutuhkan. |
| Catatan: tetap daftar, bukan galeri (Notion/Raycast) | Keputusan | Catatan teks polos; galeri hanya untuk isi visual. |

---

## 1. Chrome yang tenang: sidebar lebih redup, pembatas halus, ikon sedikit, header seragam

- **Sumber:**
  - https://linear.app/changelog/2026-03-12-ui-refresh (changelog, 2026-03-12)
  - https://linear.app/now/behind-the-latest-design-refresh (artikel desain; tanggal tidak tampil di hasil fetch, isinya sejalan dengan refresh Maret 2026)
  - https://linear.app/now/how-we-redesigned-the-linear-ui (artikel lebih lama; tanggal tidak terverifikasi, kemungkinan 2024)
- **Yang dilakukan:** Linear menyeragamkan header, navigasi, dan kontrol tampilan di semua area. Sidebar dibuat sedikit lebih redup agar konten utama yang menonjol. Ikon digambar ulang dan diperkecil, latar berwarna dekoratif pada ikon tim dibuang. Pembatas dibuat lebih halus (sudut membulat, kontras diturunkan) karena jumlahnya membengkak tanpa tujuan jelas. Netral digeser ke abu yang lebih hangat dan kurang jenuh. Elemen yang penting untuk tugas tetap berbobot, elemen orientasi menyurut. Prinsipnya: struktur harus terasa, bukan terlihat. Judul memakai varian display; teks lain satu keluarga font yang sama.
- **Kenapa cocok untuk Nexora:** Persis arah PRD (minimal, tenang, fokus konten). Token Nexora (`--line` berkontras rendah, satu aksen) sudah searah; yang perlu dijaga adalah disiplin saat jumlah layar bertambah.
- **Cara membangunnya:**
  - Sidebar `bg-bg` dengan teks `text-muted`; hanya item aktif `bg-raised text-fg` (seperti `app-nav.tsx` sekarang). Area konten satu langkah lebih terang (`bg-surface`) bila perlu pemisah.
  - Pembatas cukup `border-line` 1px, hanya antar-baris/antar-seksi (`divide-y divide-line`); hindari kartu bersarang dan bayangan.
  - Satu komponen `PageHeader` (judul `text-2xl font-semibold tracking-tight` + slot aksi kanan + baris kontrol tampilan) dipakai semua layar; ikon 16px tanpa latar berwarna.
  - Aksen `#6fd3b0` hanya untuk fokus, aksi utama, dan status selesai.
- **Dampak:** Tinggi
- **Usaha:** S

## 2. Dashboard sebagai daftar "milik saya" berurutan fokus

- **Sumber:**
  - https://linear.app/docs/my-issues (dokumentasi, tanpa tanggal)
  - https://linear.app/docs/default-team-pages (dokumentasi, tanpa tanggal)
- **Yang dilakukan:** Halaman "My issues" Linear memecah isi menjadi empat tab (Assigned, Created, Subscribed, Activity). Tab Assigned memakai urutan fokus berbasis prioritas, dari yang mendesak sampai backlog dan selesai, dan sebagian kelompok hanya muncul bila relevan. Di dalam kelompok, item diurutkan menurut prioritas dengan yang sedang dikerjakan di atas. Halaman tim memisahkan "Active" (belum mulai + sedang jalan) dari "Backlog". Dokumen My issues tidak menjelaskan empty state.
- **Kenapa cocok untuk Nexora:** JTBD-01 (memulai hari dengan memahami prioritas). Dashboard Nexora sudah punya Terlambat / Hari ini / 7 hari dan menyembunyikan seksi kosong; pola ini mengonfirmasi arahnya, lalu menambah aturan urutan di dalam seksi dan pemisahan "aktif" dari "backlog" supaya dashboard tidak berubah menjadi daftar semua task.
- **Cara membangunnya:**
  - Urutkan di query: `in_progress` lebih dulu, lalu prioritas (high ke low), lalu `due_date` naik. Seksi kosong tidak dirender (sudah ada di `dashboard/page.tsx`).
  - `text-danger` hanya pada judul seksi "Terlambat" dan tanggal di baris; sisanya netral, tanpa latar merah.
  - Task tanpa tanggal tidak masuk dashboard; sediakan satu tautan "Lihat semua task aktif" ke `/tasks`.
- **Dampak:** Tinggi
- **Usaha:** S

## 3. Detail proyek: ringkasan di atas, tab untuk koleksi sejajar, panel properti di samping

- **Sumber:**
  - https://linear.app/docs/projects (dokumentasi, tanpa tanggal)
  - https://linear.app/docs/project-graph (dokumentasi; dipakai untuk pintasan Cmd/Ctrl+I yang membuka sidebar proyek)
- **Yang dilakukan:** Membuka proyek di Linear menampilkan ringkasan singkat, properti (status, lead, tanggal mulai/target, label, ikon), dokumen dan tautan, deskripsi panjang, serta milestone. Halaman proyek punya tab Overview dan Issues; view tersimpan muncul sebagai tab tambahan yang bisa diurutkan ulang. Properti dan grafik progres tinggal di panel detail di sisi yang bisa dibuka-tutup dengan pintasan keyboard. Jadi pembagiannya: tab untuk koleksi daftar yang sejajar, seksi untuk info pelengkap, panel samping untuk properti.
- **Kenapa cocok untuk Nexora:** Proyek Nexora kecil (nama, ringkasan, status, tanggal) dengan dua koleksi sejajar: Tasks dan Catatan. Tab "Overview" tersendiri akan hampir kosong, jadi ringkasan lebih baik selalu terlihat di header.
- **Cara membangunnya:**
  - Header: `h1` + ringkasan `text-muted line-clamp-2` + baris chips properti (status, tanggal); tab di bawahnya.
  - Tab berbasis rute: `<nav aria-label="Bagian proyek">` berisi `<Link aria-current="page">` ke `?tab=tasks|notes` (bisa di-deep-link, tanpa JS). Aktif `border-b-2 border-accent text-fg`, lainnya `text-muted`. **[adaptasi kami]**
  - Desktop: `lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8` dengan panel properti di kolom kanan; mobile: panel menjadi `<details>` "Detail proyek" di atas tab. **[adaptasi kami]**
- **Dampak:** Tinggi
- **Usaha:** M

## 4. Pencarian dua tingkat: global dan "cari di tampilan ini"

- **Sumber:** https://linear.app/docs/search (dokumentasi, tanpa tanggal)
- **Yang dilakukan:** Tombol `/` membuka pencarian seluruh workspace (judul, deskripsi, komentar, dokumen). Cmd/Ctrl+F hanya mencari di tampilan yang sedang terbuka dan bertindak sebagai filter sementara yang dibersihkan dengan Esc. Di command menu, satu huruf prefiks + spasi menyempitkan hasil ke satu kategori (issue, proyek, user, dokumen, dan lain-lain). Urutan hasil bawaan menaruh item aktif dulu, baru backlog, selesai, dibatalkan, dan arsip.
- **Kenapa cocok untuk Nexora:** JTBD-02 (menemukan kembali konteks dan keputusan teknis) dan PRD §10 (command palette, pencarian catatan di proyek). Dua tingkat menghindari satu kotak serba-bisa: pencarian catatan proyek cukup filter lokal; palette global untuk melompat antarhalaman dan entitas.
- **Cara membangunnya:**
  - Tab Catatan: `<input type="search">` yang menulis `?q=` (debounce sekitar 250 ms, `router.replace`); filter di server (`ilike` dulu, FTS bila perlu); Esc mengosongkan; tampilkan "N hasil" + tombol "Hapus filter". **[adaptasi kami]**
  - Palette global: `<dialog>` native (`showModal()`), input `role="combobox"` + daftar `role="listbox"` (panah/Enter/Esc); dibuka Cmd/Ctrl+K dan `/` (diabaikan saat fokus di input). **[adaptasi kami]**
  - Prefiks `t ` task, `p ` proyek, `n ` catatan; hasil aktif di atas, selesai di bawah. **[adaptasi kami]**
- **Dampak:** Tinggi
- **Usaha:** M (L bila palette global dibangun lengkap)

## 5. Navigasi mobile: toolbar bawah untuk alur inti dan satu aksi "Tambah" yang selalu ada

- **Sumber:** https://linear.app/changelog/2025-10-16-mobile-app-redesign (changelog, 2025-10-16)
- **Yang dilakukan:** Redesain aplikasi mobile Linear membangun ulang navigasi di sekitar toolbar bawah untuk akses cepat ke alur inti, dan menaruh tombol "Create Issue" di bagian atas setiap layar. Halaman itu tidak menjelaskan gestur, daftar, atau jangkauan satu tangan, dan memakai bahan kaca buram yang tidak kita tiru. Bukti untuk pola ini tipis: hanya struktur navigasinya.
- **Kenapa cocok untuk Nexora:** PRD NFR-01 mewajibkan ponsel dan target sentuh >= 44px. `NavLinks` sekarang berupa baris `flex gap-1` di mobile dengan `min-h-10` (40px). Nexora juga akan punya 7 tujuan (AI, Memory, Learning, Settings menyusul), terlalu banyak untuk satu bar.
- **Cara membangunnya:**
  - `md:hidden fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]`; item `min-h-14`; tiga tujuan inti + "Lainnya" (sheet berisi sisanya); konten mobile diberi `pb-24`. **[adaptasi kami]**
  - Satu aksi "Tambah" yang terjangkau jempol (item tengah, atau tombol `size-12 bg-accent text-accent-ink`) membuka dialog yang sama dengan desktop; di mobile dialog menjadi sheet penuh (`max-md:inset-0 max-md:rounded-none`). **[adaptasi kami]**
  - Letak tombol Tambah di bawah adalah pilihan kami demi jangkauan jempol; Linear menaruhnya di atas layar.
- **Dampak:** Tinggi (karena persyaratan PRD)
- **Usaha:** M

## 6. Progres proyek: ringkas di daftar, grafik hanya di detail dan hanya bila ada data

- **Sumber:**
  - https://linear.app/docs/project-graph (dokumentasi, tanpa tanggal)
  - https://linear.app/docs/projects (dokumentasi, tanpa tanggal)
- **Yang dilakukan:** Di dokumen yang saya buka, progres proyek tampil sebagai grafik di panel detail (bukan persen atau cincin): garis abu untuk total cakupan, garis terpisah untuk pekerjaan yang mulai dan yang selesai, garis putus-putus untuk prakiraan selesai, tanggal target sebagai garis vertikal merah, dan hover menampilkan angka tepat. Grafik baru dibuat setelah proyek berstatus Started dan data cukup, lalu diperbarui berkala.
- **Kenapa cocok untuk Nexora:** Daftar Proyek butuh sinyal progres sekilas, tetapi grafik beserta prakiraan berlebihan untuk satu pengguna dan belum ada data riwayat. Yang kita tiru: jangan menampilkan progres kosong, tampilkan cakupan (total) di samping yang selesai, dan beri penanda tanggal target.
- **Cara membangunnya (bar dan cincin = adaptasi kami, bukan klaim tentang Linear):**
  - Daftar: `3/8` (`font-mono text-xs text-muted`) + bar `h-1 rounded-full bg-line` berisi `div` `bg-accent` dengan `style={{ width: pct + "%" }}`; pasang `role="progressbar" aria-valuenow aria-valuemin={0} aria-valuemax={total} aria-label="Task selesai"`.
  - Tanpa task tampilkan "Belum ada task" (bukan 0%); proyek selesai/arsip mengganti bar dengan chip status.
  - Cincin opsional 16px: SVG `viewBox="0 0 16 16"`, `r=7`, `stroke-width=2`, `stroke-dasharray="{pct * 0.4398} 43.98"`, `-rotate-90`. Grafik riwayat ditunda (butuh snapshot harian).
- **Dampak:** Sedang
- **Usaha:** S (bar/cincin); L (grafik)

## 7. Status berbasis kategori, dengan ikon lingkaran-progres

- **Sumber:**
  - https://linear.app/changelog/2024-03-19-custom-statuses-for-projects (changelog, 2024-03-19)
  - https://linear.app/docs/default-team-pages (dokumentasi, tanpa tanggal)
- **Yang dilakukan:** Status dikelompokkan ke kategori berurutan tetap; untuk proyek: Backlog, Planned, Started, Completed, Canceled, dan status kustom dibuat di dalam kategori. Untuk issue, halaman "Active" berisi kategori Unstarted + Started (pintasan G lalu A) dan "Backlog" dipisah. Jadi tampilan dan hitungan bergantung pada kategori, bukan nama status. Teks kedua halaman tidak menjelaskan bentuk ikon; ikon lingkaran bertahap (kosong, separuh, penuh) adalah **pengamatan umum** pada tracker modern, bukan klaim dari halaman yang dibuka.
- **Kenapa cocok untuk Nexora:** Task punya status `todo / in_progress / done` dan proyek akan menyusul. Memetakan ikon dan warna per kategori menjaga konsistensi lintas layar (PRD: status konsisten di semua tampilan), dan filter "Aktif" tinggal todo + in_progress (sudah ada di `STATUS_OPTIONS`).
- **Cara membangunnya:**
  - Satu komponen `StatusIcon` SVG 14px: todo = cincin kosong `stroke-muted`; in_progress = cincin + juring setengah (`<circle r="2.5" stroke-width="5" stroke-dasharray="7.85 15.71" transform="rotate(-90 7 7)">`); done = terisi aksen + centang. **[adaptasi kami]**
  - Pemetaan lewat objek kategori (`STATUS_CATEGORY`), bukan string status. Nama status tetap ada sebagai teks atau `aria-label`: jangan hanya ikon, jangan hanya warna.
  - Di `task-row.tsx` klik tetap hanya men-toggle selesai; ikon menampilkan in_progress (ubah status lewat dialog edit). Hanya `done` memakai aksen; lainnya netral.
- **Dampak:** Sedang
- **Usaha:** S

## 8. Daftar berkelompok: header dengan hitungan, menempel saat gulir, dan menu "Tampilan"

- **Sumber:** https://linear.app/docs/display-options (dokumentasi, tanpa tanggal)
- **Yang dilakukan:** Daftar bisa dikelompokkan (status, prioritas, proyek, dan lain-lain), disub-kelompokkan, diurutkan, dan properti baris dinyalakan/dimatikan satu per satu; ada opsi menampilkan grup kosong. Header grup menunjukkan jumlah item dan tetap menempel saat menggulir. Halaman tidak menyebut header yang bisa dilipat, jadi melipat grup adalah tambahan kami.
- **Kenapa cocok untuk Nexora:** Layar Tasks (filter status/prioritas) dan Dashboard butuh kelompok yang jelas tanpa halaman baru. Filter Nexora sudah berbasis URL, jadi group/sort cukup menambah parameter tanpa state client.
- **Cara membangunnya:**
  - Tambah param `group` (`none|status|priority|project|due`) dan `sort` pada `href()` di `task-filters.tsx`; menu "Tampilan" = `<details>` berisi grup tautan. Batasi 3-5 opsi, jangan meniru puluhan toggle. **[adaptasi kami]**
  - Header grup: `<h2 class="sticky top-0 z-10 bg-bg py-1.5 text-sm font-medium text-muted">Judul <span class="font-mono text-xs">3</span></h2>`; grup kosong disembunyikan secara bawaan.
  - Opsional: bungkus grup dengan `<details open><summary>` agar bisa dilipat dan tetap bisa dioperasikan keyboard. **[adaptasi kami]**
- **Dampak:** Sedang
- **Usaha:** M

## 9. Draft form yang tahan tertutup tidak sengaja

- **Sumber:** https://linear.app/docs/creating-issues (dokumentasi, tanpa tanggal)
- **Yang dilakukan:** `C` membuka modal buat. Menutup atau berpindah halaman menyimpan draft lokal yang terbuka lagi pada pembuatan berikutnya; Esc menawarkan menyimpan draft yang bertahan lintas klien; draft terhapus otomatis setelah enam bulan; isian awal bisa diberikan lewat parameter URL (judul, status, prioritas, proyek, dan lain-lain). Halaman tidak menyebut "create more", Cmd+Enter, maupun quick-add dari header grup.
- **Kenapa cocok untuk Nexora:** Dialog tambah/edit (layar 6): catatan keputusan teknis cenderung panjang, dan kehilangan teks karena Esc atau klik backdrop itu mahal. Prefill proyek memudahkan "tambah task di proyek ini".
- **Cara membangunnya:**
  - Simpan draft di `localStorage` (`nexora:draft:task:new`) saat `input` (debounce), hapus setelah submit sukses; bungkus `try/catch` (storage bisa kosong atau terblokir); jangan simpan draft untuk dialog edit. **[adaptasi kami]**
  - Saat dialog dibuka dan draft ada: isi otomatis + label "Draft dipulihkan" + tombol "Buang".
  - Prefill lewat props (`defaultProjectId` dari halaman proyek), bukan lewat query. Esc pada form yang berubah: tutup, draft tetap tersimpan, tanpa dialog konfirmasi.
- **Dampak:** Sedang
- **Usaha:** S

## 10. Lapisan keyboard di atas UI yang tetap penuh bisa diklik

- **Sumber:**
  - https://linear.app/docs/select-issues (dokumentasi, tanpa tanggal)
  - https://linear.app/docs/creating-issues (dokumentasi, tanpa tanggal)
  - https://linear.app/docs/default-team-pages (dokumentasi, tanpa tanggal)
  - https://linear.app/changelog/2026-03-12-ui-refresh (changelog, 2026-03-12; preferensi Enter vs Cmd/Ctrl+Enter)
- **Yang dilakukan:** Baris disorot lewat hover atau J/K/panah, terpisah dari memilih (tombol X). Checkbox muncul saat pointer berada di tepi kiri baris; Esc menghapus pilihan; Cmd/Ctrl+K membuka command bar yang bertindak pada item terpilih; klik kanan membuka menu konteks; aksi massal muncul di bawah daftar. `C` membuka form buat, dan G lalu A/B berpindah halaman. Satu preferensi pengguna menentukan apakah Enter saja atau Cmd/Ctrl+Enter yang mengirim komentar.
- **Kenapa cocok untuk Nexora:** Satu pengguna yang berulang kali memakai aplikasi yang sama diuntungkan pintasan (PRD: interaksi cepat). Tetapi PRD juga mewajibkan target sentuh dan fokus keyboard, jadi lapisan ini opsional dan tidak menggantikan tombol.
- **Cara membangunnya:**
  - Satu handler `keydown` pada daftar; abaikan bila target `input, textarea, select, [contenteditable]` atau ada `dialog[open]`. `j/k` memindah sorotan (roving `tabindex`; `data-active` memberi `bg-raised`), `x`/Space = selesai, `e`/Enter = edit, `c` = tambah, `Esc` = hapus sorotan. **[adaptasi kami]**
  - Hover-reveal hanya untuk aksi sekunder, bukan checkbox: `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100`. Tailwind 4.3.3 yang terpasang membungkus `hover:` dengan `(hover: hover)` dan menyediakan `pointer-coarse:` (dicek di `node_modules`), sehingga layar sentuh tetap melihat aksinya.
  - `g` lalu `d|t|p` (buffer sekitar 800 ms) untuk pindah halaman; `?` membuka daftar pintasan. Preferensi "Enter vs Cmd/Ctrl+Enter" berguna untuk composer AI nanti.
- **Dampak:** Sedang
- **Usaha:** M

## 11. Token tema kecil, netral hangat, satu varian kontras

- **Sumber:**
  - https://linear.app/now/how-we-redesigned-the-linear-ui (artikel; tanggal tidak terverifikasi, kemungkinan 2024)
  - https://linear.app/now/behind-the-latest-design-refresh (artikel; sejalan dengan refresh Maret 2026)
- **Yang dilakukan:** Linear mengganti puluhan variabel tema (98) dengan tiga masukan: warna dasar, aksen, dan kontras, yang dihitung di ruang warna perseptual (LCH) sehingga warna berkecerahan sama tampak sama terang. Pengaruh aksen pada netral dikurangi; pengaturan kontras dapat menghasilkan tema kontras tinggi untuk aksesibilitas; belakangan netral digeser ke abu hangat yang kurang jenuh.
- **Kenapa cocok untuk Nexora:** Nexora ingin satu aksen dan akan menambah warna status. Menurunkan permukaan dan garis dari satu warna dasar mencegah token menjamur. Opsional: palet sekarang sudah baik, pakai ini saat menambah token baru.
- **Cara membangunnya:**
  - Turunkan permukaan dari dasar: `--surface: color-mix(in oklab, var(--bg), white 4%)`, `--raised` sekitar 8%, `--line` sekitar 13%. **[adaptasi kami]**
  - Pilih `--danger`, `--warn`, `--accent` pada lightness yang mirip agar chip status seimbang.
  - `@media (prefers-contrast: more)` menaikkan `--line` dan `--muted` sebagai padanan "variabel kontras".
- **Dampak:** Rendah
- **Usaha:** S

---

## Pola pelengkap (pengamatan umum, tanpa sumber terverifikasi)

Tidak ada halaman yang saya buka yang mendukung butir di bawah; jangan dikutip sebagai "cara produk X". Tetap dicantumkan karena PRD mewajibkan state-state ini dan karena sebagian sudah ada di kode.

- **Empty state satu CTA.** `dashboard/page.tsx` sudah menerapkannya (`border-dashed`, judul, satu kalimat, satu tombol). Jadikan komponen `EmptyState({ title, hint, action })` untuk Proyek, Tasks, dan Catatan; state error memakai struktur sama dengan tombol "Coba lagi".
- **Skeleton berbentuk baris nyata.** `ListSkeleton` sudah memakai tinggi 56px (`h-14`) dan `animate-pulse`. Samakan tinggi dengan baris sebenarnya agar tidak ada layout shift; tambahkan varian untuk kartu proyek dan baris catatan. Aturan reduced-motion di `globals.css` sudah meredam animasinya.
- **Quick-add inline.** `<form>` satu input di atas daftar ("Tambah task...", Enter menambah dan fokus tetap di input). Dokumen Linear yang saya buka tidak menyebutnya, jadi ini bukan klaim tentang Linear.
- **Tanggal terlambat.** Label teks + warna, bukan warna saja ("Terlambat 3 hari", tanggal absolut di `title`). `TaskRow` sudah menulis "Terlambat · tanggal" dengan `text-danger`.
- **Master-detail (daftar + panel detail).** Untuk Tasks/Catatan di layar lebar: `xl:grid-cols-[minmax(0,1fr)_24rem]`, panel menjadi halaman penuh di bawah `xl`. Belum ada sumber terverifikasi.

## Batasan riset

- **Berhasil dibuka dan dipakai (14, semuanya Linear):** `docs/projects`, `docs/display-options`, `docs/my-issues`, `docs/project-graph`, `docs/select-issues`, `docs/search`, `docs/creating-issues`, `docs/default-team-pages`, `changelog/2026-03-12-ui-refresh`, `changelog/2025-10-16-mobile-app-redesign`, `changelog/2024-03-19-custom-statuses-for-projects`, `now/how-we-redesigned-the-linear-ui`, `now/behind-the-latest-design-refresh`, `method/introduction`.
- **Gagal dibuka (HTTP 404), tidak dipakai sebagai sumber:** https://linear.app/docs/project-overview dan https://linear.app/docs/configuring-workflows (termasuk varian `?_rsc=`). Akibatnya bentuk ikon status Linear tidak terverifikasi.
- **Tidak dibuka karena batas waktu:** Notion, Raycast, Vercel Geist, Things 3, Todoist, Plane, Attio, Basecamp. Tiga URL Notion sempat muncul di hasil pencarian tetapi tidak dibuka, jadi hanya kandidat untuk iterasi berikutnya: https://www.notion.com/help/views-filters-and-sorts, https://www.notion.com/help/guides/using-database-views, https://www.notion.com/help/search. Prioritas iterasi berikutnya: empty state/skeleton/status dari Vercel Geist, List + Action Panel dari Raycast, tampilan list/gallery dari Notion, Today/Overdue dari Things 3 atau Todoist.
- Ringkasan isi halaman dibuat lewat WebFetch (model kecil); bagian yang halaman tidak sebutkan saya tandai eksplisit di atas, bukan diisi dari ingatan. Banyak halaman dokumentasi tidak bertanggal; tanggal hanya dicantumkan bila ada di URL atau halaman.

## Yang sengaja tidak ditiru

- **Bahan kaca buram (frosted glass)** pada aplikasi mobile Linear (disebut di halaman redesain mobile Oktober 2025). Bertentangan dengan PRD: hindari glassmorphism.
- **Grafik progres dengan prakiraan** (garis putus-putus, rentang optimistis/pesimistis berbasis kecepatan mingguan; halaman project-graph). Berlebihan untuk satu pengguna dan belum ada data riwayat.
- **Konsep tim:** assignee, cycle dua mingguan, SLA, triage, estimasi, pelanggan, rilis, "pemilik tunggal per proyek" (https://linear.app/docs/display-options, https://linear.app/docs/my-issues, https://linear.app/method/introduction). Nexora single-user; jangan menyisakan properti assignee di UI.
- **Puluhan toggle properti dan opsi grouping.** Cukup 3-5 opsi yang benar-benar dipakai.
- **Rantai status sebanyak Linear** (Backlog/Planned/Started/Completed/Canceled plus status kustom). Nexora cukup `todo / in_progress / done` dan status proyek sederhana sampai ada kebutuhan nyata; yang ditiru hanya prinsip "kategori, bukan nama".
- **Sembunyi-saat-idle untuk kontrol penting.** Checkbox yang baru muncul saat hover bagus di desktop tetapi buruk di sentuh; checkbox Nexora tetap selalu terlihat (44px).
- **Banyak warna status dan merah dekoratif.** Satu aksen mint; merah hanya untuk terlambat/error; status tidak boleh hanya dibedakan lewat warna.
- **Identitas Linear:** nama fitur, ikon, copy, logo, dan palet (biru/ungu pada grafik). PRD: pelajari pola, bukan identitas atau aset.

# Referensi UI Nexora, putaran 2: Raycast dan Notion

Riset: 2026-10-10. Putaran 1 (Linear) ada di `docs/UI_REFERENCES.md`; pola Linear tidak diulang di sini, hanya dirujuk bila sebuah pola di bawah memperkuatnya. Semua isi diparafrase; tidak ada aset, logo, atau teks panjang yang disalin (PRD §10: pelajari pola, bukan identitas).

## Ringkasan

- **Terverifikasi:** 19 halaman benar-benar dibuka dan dibaca: 7 halaman docs developer Raycast, 3 halaman manual Raycast, dan 9 halaman help center/guide Notion. Semua pola bernomor bersumber dari halaman-halaman itu, kecuali bagian yang ditandai **[adaptasi kami]** (ide implementasi kami, bukan klaim tentang produk sumber) atau "pengamatan umum".
- **Jawaban untuk tiga hal yang sedang dipertimbangkan:**
  - Command palette / pencarian global: **bangun** (Pola 1). Versi murah: keadaan awal yang berguna, bagian berurutan tetap, Esc dua langkah.
  - Quick-add task: **bangun**, mulai dari input satu kolom di atas daftar dan baris "Buat task ..." di palette (Pola 2).
  - Daftar vs galeri untuk catatan: **daftar**. Kedua sumber memakai galeri untuk konten visual; catatan Nexora adalah teks polos (Pola 8).
- **Tema besar:** (1) satu pintu masuk berbasis keyboard yang tetap punya tombol; (2) teks yang sudah diketik tidak berujung buntu; (3) satu data, beberapa tampilan; (4) aksi berlapis per item: utama, kedua, semua; (5) baca dulu, edit kemudian; (6) bagian dan kontrol muncul bertahap, hanya bila ada isinya.
- **Selaras dengan kode sekarang** (dibaca 2026-10-10): `FormDialog` (native `<dialog>` + draft), `EmptyState` (ada slot `children`), `ProjectTabs` (tab berbasis URL dengan jumlah), `FilterGroup` (chip berupa tautan), `listProjectOptions()` (sudah `cache()`), `listNotes` (`ilike` pada `search_text`), `NotesPanel` (sudah membedakan "belum ada" dan "tidak cocok"). Jadi sebagian besar pola di bawah adalah tambahan, bukan penggantian.
- **Temuan sampingan:** chip `FilterGroup` dan tautan "Hapus filter" di `NotesPanel` memakai `min-h-8` (32px), di bawah target sentuh 44px. Tailwind 4.3.3 yang terpasang punya varian `pointer-coarse:` (dicek di `node_modules`), jadi cukup menambah `pointer-coarse:min-h-11`.

Cara membaca: **Dampak** = seberapa besar memperbaiki layar yang sedang dibangun (Tinggi/Sedang/Rendah). **Usaha** = perkiraan kasar: S beberapa jam, M sekitar 1-2 hari, L lebih dari 2 hari. Pola diurutkan dari yang paling berdampak. Label **[adaptasi kami]** berarti ide implementasi kami sendiri.

---

## 1. Palette berlapis: awal yang berguna, bagian berurutan tetap, Esc dua langkah

- **Sumber:**
  - https://manual.raycast.com/search-bar (manual pengguna Raycast)
  - https://developers.raycast.com/api-reference/user-interface/list (docs developer Raycast)
  - https://developers.raycast.com/api-reference/user-interface/action-panel (docs developer; dipakai untuk catatan urutan bagian saat memfilter)
  - https://www.notion.com/help/search (help center Notion)
- **Yang dilakukan:**
  - Raycast: kolom cari langsung terfokus saat jendela terbuka, dan sebelum mengetik daftar sudah berisi hal berguna: favorit di bagian sendiri paling atas, file yang baru dipakai, serta agenda hari ini. Hasil dikelompokkan dalam bagian; Cmd/Ctrl + panah meloncat antarbagian. Esc menghapus teks lebih dulu dan baru menutup jendela bila kolom sudah kosong; Backspace pada kolom kosong naik satu tingkat. Peringkat hasil: alias persis, awalan alias, kecocokan judul, subjudul/kata kunci, terakhir pola pemakaian (frekuensi dan kebaruan). Di API List, tiap item dapat diberi `keywords` tambahan, dan ada opsi menjaga urutan bagian saat memfilter (dokumen Action Panel menyebut bahwa tanpa opsi itu, bagian bisa tertata ulang menurut peringkat).
  - Notion: sebelum mengetik, pencarian menampilkan halaman yang baru dikunjungi beserta waktu kunjungannya. Ada filter (hanya judul, pembuat, di dalam halaman tertentu, rentang tanggal) dan urutan (paling cocok, terakhir diedit, dibuat). Cmd/Ctrl+P membuka pencarian; Cmd/Ctrl+K juga, tetapi hanya bila kursor tidak berada di dalam blok teks. Pencarian di dalam halaman (Cmd/Ctrl+F) dipisahkan dari pencarian global.
- **Kenapa cocok untuk Nexora:** PRD §10 menyebut global search/command palette sebagai komponen inti, dan Phase 5 menjadwalkan penyempurnaannya. JTBD-02 (menemukan kembali konteks dan keputusan) sekarang hanya dilayani pencarian per proyek di tab Catatan. Layout sudah punya sidebar desktop dan tab bar mobile dengan 3 item. Dua pelajaran termurah: keadaan awal tidak kosong, dan Esc dua langkah.
- **Cara membangunnya:**
  - `<dialog>` native (`showModal()`, seperti `FormDialog`); input `role="combobox"` dengan `aria-controls` dan `aria-activedescendant`, daftar `role="listbox"` berisi `role="option"`, fokus tetap di input (praktik ARIA umum, bukan dari sumber). **[adaptasi kami]**
  - Awal: bagian "Terakhir dibuka" (maks 5, `localStorage` dengan `try/catch` seperti `src/lib/draft.ts`) dan "Aksi" (Task baru, Proyek baru, ke Dashboard/Tasks/Projects). Saat mengetik: urutan bagian tetap Aksi, Tasks, Proyek, Catatan, maks 5 baris per bagian, tanpa menyusun ulang antarbagian. **[adaptasi kami]**
  - Tombol: Esc mengosongkan teks dulu lalu menutup; Enter = aksi utama. Cmd/Ctrl+K hanya bila fokus bukan di `input, textarea, [contenteditable]`; sediakan tombol "Cari" 44px di sidebar dan sebagai item tab bar mobile agar sentuh punya jalur. **[adaptasi kami]**
  - Data: satu server action `searchAll(q)` menjalankan tiga query `ilike` (`limit 5`, pakai `likePattern`) dengan debounce sekitar 200 ms. Komponen hanya memakai `useRouter`, bukan `usePathname`/`useSearchParams`, agar tidak melanggar aturan Suspense D-012. **[adaptasi kami]**
- **Dampak:** Tinggi
- **Usaha:** M (L bila kategori Catatan lintas proyek dan versi mobile dikerjakan lengkap)

## 2. Teks yang sudah diketik tidak berujung buntu: baris "Buat ..." dan tombol tambah sesuai konteks

- **Sumber:**
  - https://manual.raycast.com/settings (manual pengguna Raycast; fallback command)
  - https://developers.raycast.com/api-reference/user-interface/list (docs; tampilan kosong yang membawa aksi)
  - https://developers.raycast.com/api-reference/user-interface/action-panel (docs; aksi utama pada form)
  - https://developers.raycast.com/api-reference/user-interface/form (docs; validasi dan fokus otomatis)
  - https://www.notion.com/help/intro-to-databases (help center; titik tambah item)
- **Yang dilakukan:**
  - Raycast: bila kueri tidak cocok dengan apa pun, di dasar hasil muncul daftar "fallback command" yang diatur pengguna (tambah dari ekstensi mana pun, urutkan, hapus), sehingga teks yang sudah diketik tetap bisa dipakai. Tampilan kosong pada daftar juga boleh membawa aksi. Di form, aksi utama dipicu Cmd+Enter (pada daftar cukup Enter); kolom bisa langsung terfokus; validasi berjalan saat kolom ditinggalkan, pesan galat hilang ketika pengguna mulai mengetik lagi, dan pengiriman tertahan selama masih ada galat.
  - Notion: item baru bisa dibuat dari beberapa tempat: tombol New di kanan atas, baris `+ New` di dasar tabel/daftar/papan, kartu `+ New` di dasar galeri, dan di kalender ikon plus yang muncul saat hover pada sebuah hari dan membuat item di hari itu (konteks tanggal terisi otomatis).
- **Kenapa cocok untuk Nexora:** quick-add sedang dipertimbangkan. Sekarang menambah task berarti membuka dialog dengan semua kolom. Untuk "tiba-tiba ingat satu task", jalur tercepat adalah satu input lalu Enter, dengan konteks terisi dari tempat pengguna berada (proyek di tab Tasks, tanggal hari ini di seksi "Hari ini" Dashboard). Pola ini melengkapi draft dialog yang sudah ada (D-013).
- **Cara membangunnya:**
  - Halaman Tasks dan tab Tasks proyek: `<form>` satu input (`aria-label="Task baru"`, `min-h-11`) di atas daftar; Enter menambah, fokus tetap di input, hasil diumumkan lewat `role="status"`; `project_id` terisi dari halaman proyek. **[adaptasi kami]**
  - Server action `quickAddTask(title, defaults)` dengan default status todo, prioritas sedang, tanpa tanggal; sesudahnya toast singkat "Task dibuat" dengan tautan "Ubah" yang membuka dialog edit yang sudah ada. **[adaptasi kami]**
  - Di palette (Pola 1): bila hasil kosong, baris pertama `Buat task "{teks}"`; bila ada hasil, baris itu menjadi bagian terakhir. Dialog lengkap tetap lewat tombol "Detail" untuk prioritas, tanggal, dan proyek. **[adaptasi kami]**
- **Dampak:** Tinggi
- **Usaha:** S (input inline); M (lewat palette)

## 3. Baca dulu, edit kemudian: catatan terbuka sebagai tampilan baca

- **Sumber:**
  - https://www.notion.com/help/intro-to-databases (help center)
  - https://www.notion.com/help/layouts (help center; tata letak halaman database)
  - https://developers.raycast.com/api-reference/user-interface/list (docs; panel detail di samping daftar)
- **Yang dilakukan:**
  - Notion: item database terbuka lebih dulu sebagai pratinjau (peek), dan ikon perluas di sudut kiri atas mengalihkannya ke halaman penuh. Cara membuka menyesuaikan tampilan: pada tabel lewat tombol Open di kolom pertama, pada daftar lewat judul, pada papan/kalender/galeri lewat mana saja pada kartu. Di halaman, properti tampil sebagai baris di atas isi (nama, tipe, nilai); tiap properti dapat diatur selalu tampil, sembunyi saat kosong, atau selalu sembunyi, dan yang disembunyikan dikumpulkan dalam satu entri menu di dasar daftar. Pembuat layout menaruh properti di area utama atau panel samping, menyematkan sampai 15 properti ke kepala halaman, dan menambah tab; contoh di dokumennya adalah halaman proyek dengan satu tab berisi daftar task proyek itu. Satu layout berlaku untuk semua halaman dalam database, dan ada opsi lebar penuh.
  - Raycast: panel detail di samping daftar menampilkan item terpilih: isi Markdown di atas, metadata (label, tautan, tag) di bawah. Dokumen menyarankan menyembunyikan aksesori baris saat panel detail aktif, karena informasinya pindah ke panel.
- **Kenapa cocok untuk Nexora:** JTBD-02 menekankan menemukan kembali keputusan teknis, yaitu membaca. Sekarang kartu catatan membuka dialog "Edit catatan", sehingga membaca dan mengubah bercampur (ada risiko ketik tak sengaja). Contoh Notion (proyek dengan tab task) memang struktur halaman proyek kita. `main` dibatasi `max-w-3xl`, jadi panel samping permanen tidak muat tanpa melebarkan halaman; halaman baca penuh atau lembar peek lebih cocok.
- **Cara membangunnya:**
  - Langkah pertama: kartu catatan menjadi tautan ke halaman baca `projects/[id]/notes/[noteId]`: judul, `<dl>` metadata (jenis, dibuat, diperbarui; `font-mono text-xs text-muted`), isi `whitespace-pre-line` sesuai D-011, tombol "Edit" yang memakai `FormDialog` yang ada, dan tautan kembali yang membawa `q` dan `kind`. Deep-link dan tombol Back bekerja. **[adaptasi kami]**
  - Properti kosong tidak dirender (mis. tanggal target, tautan), meniru "sembunyi saat kosong". **[adaptasi kami]**
  - Opsional: pada `xl:` buka sebagai lembar dari kanan (`<dialog>`, `fixed inset-y-0 right-0 w-[min(32rem,100%)]`) dengan tombol "Perluas" ke halaman penuh, meniru peek. **[adaptasi kami]**
- **Dampak:** Sedang
- **Usaha:** S (halaman baca); M (dengan lembar peek)

## 4. Satu data, beberapa tampilan: tab preset dan kontrol yang muncul bertahap

- **Sumber:**
  - https://www.notion.com/help/views-filters-and-sorts (help center)
  - https://www.notion.com/help/guides/when-to-use-each-type-of-database-view (guide Notion)
  - https://www.notion.com/help/intro-to-databases (help center)
  - https://developers.raycast.com/api-reference/user-interface/list (docs; dropdown di bilah pencarian)
- **Yang dilakukan:**
  - Notion: satu database dapat punya banyak tampilan yang muncul sebagai tab; tiap tampilan menyimpan tata letak, properti yang terlihat, filter, urutan, dan pengelompokan sendiri, jadi mengubah satu tampilan tidak menggeser yang lain. Tab bisa berisi ikon saja, teks saja, atau keduanya, urutannya diseret, dan yang berlebih masuk ke menu lanjutan. Panduan menyarankan membuat tampilan khusus (per proyek, per orang) dari satu daftar induk lalu memakainya ulang. Filter sederhana bisa dinaikkan ke filter lanjutan (grup AND/OR bersarang sampai tiga tingkat); urutan boleh berlapis sesuai susunan; grup kosong dapat disembunyikan. Pencarian di dalam database baru tersedia mulai tiga halaman, dan mencocokkan judul serta nilai properti.
  - Raycast: selain kolom cari, daftar dapat memasang dropdown di sisi kanan bilah pencarian sebagai dimensi penyaring kedua (mis. kategori).
- **Kenapa cocok untuk Nexora:** Tasks muncul di tiga tempat (Dashboard, `/tasks`, tab Tasks proyek), semuanya "lensa" atas data yang sama. `/tasks` sekarang satu tampilan dengan dua baris chip (status, prioritas) dan belum punya urutan. `ProjectTabs` sudah menjadi pola tab berbasis URL yang bisa dipakai ulang. Karena satu pengguna, bagian Notion tentang menyimpan filter untuk semua orang, filter lanjutan bersarang, dan kunci tampilan tidak perlu. Pola ini melengkapi pola 8 putaran 1 (group/sort lewat menu Tampilan): fokusnya preset tab, bukan opsi tampilan.
- **Cara membangunnya:**
  - `/tasks?view=aktif|terlambat|selesai|semua` (bawaan aktif) sebagai tab seperti `ProjectTabs`; tiap preset dipetakan ke `{status, due, sort}` dan memuat hitungan `font-mono text-xs`; chip status/prioritas yang ada menjadi penyaring tambahan. **[adaptasi kami]**
  - Tambah `sort=due|prioritas|dibuat` lewat `<select>` di dalam `<form method="get">` (tanpa JS). Batasi dua baris kontrol: tab di atas, lalu satu baris filter dan urutan. **[adaptasi kami]**
  - Tampilkan kotak cari hanya bila daftar punya >= 8 item (Notion menunggu 3 halaman; angka 8 adalah pilihan kami). **[adaptasi kami]**
  - Chip `FilterGroup` 32px: tambahkan `pointer-coarse:min-h-11` agar target sentuh >= 44px.
- **Dampak:** Sedang
- **Usaha:** S

## 5. Aksi per item berlapis: utama, kedua, semua aksi, dan aksi berbahaya terpisah

- **Sumber:**
  - https://developers.raycast.com/api-reference/user-interface/action-panel (docs developer)
  - https://manual.raycast.com/action-panel (manual pengguna)
  - https://developers.raycast.com/api-reference/keyboard (docs developer)
  - https://developers.raycast.com/basics/prepare-an-extension-for-store (docs; pedoman Store)
- **Yang dilakukan:**
  - Setiap item punya panel aksi yang menyesuaikan jenis item (aplikasi, file, perintah, dan agenda punya aksi berbeda). Aksi pertama otomatis menjadi aksi utama dan aksi kedua menjadi aksi kedua: pada daftar Enter dan Cmd+Enter, pada form Cmd+Enter dan Cmd+Shift+Enter. Seluruh aksi dibuka dengan Cmd+K; mengetik menyaring aksi sebagai satu daftar datar; Esc keluar dari submenu dulu, baru menutup panel. Aksi dikelompokkan dalam bagian bernama (contoh dokumentasi menaruh aksi menutup pull request di bagian khusus berlabel zona bahaya) dan pintasan tiap aksi tampil di sisi kanan barisnya. Manual menyebut aksi destruktif ditampilkan merah; dialog konfirmasi tidak dibahas di halaman itu.
  - Pedoman Store: nama aksi Title Case; bila sebagian aksi punya ikon, semuanya harus; aksi yang membuka submenu memakai elipsis. Raycast juga menganjurkan memakai kumpulan pintasan umum (Edit, New, Remove, dan sebagainya) agar konsisten dan memori otot pengguna terjaga.
- **Kenapa cocok untuk Nexora:** `TaskRow` hanya punya dua target: checkbox (selesai) dan badan baris (buka dialog edit). Belum ada tempat untuk "Mulai dikerjakan", "Ubah prioritas", "Pindah proyek", atau "Hapus" tanpa membuka form penuh. Daftar aksi per entitas yang sama bisa dipakai palette (Pola 1) supaya konsisten.
- **Cara membangunnya:**
  - Satu fungsi `actionsFor(task)` mengembalikan `{ id, label, hint?, danger?, run }[]`, dipakai menu baris dan palette (sumber tunggal). Urutan: Edit, Mulai dikerjakan/Selesaikan, Ubah prioritas, Pindah proyek, lalu bagian terpisah (`border-t border-line`) berisi Hapus (`text-danger`) yang membuka dialog konfirmasi. **[adaptasi kami]**
  - Menu baris: tombol titik tiga `size-11` dengan `aria-haspopup="menu"` dan `aria-expanded`, panel lewat atribut `popover` native, item `role="menuitem"` setinggi >= 44px; petunjuk tombol (`<kbd>`) hanya pada `pointer-fine`. **[adaptasi kami]**
  - Pintasan baris: huruf tunggal (`e` edit, `x` selesai) pada baris terfokus, bukan kombinasi Cmd ala Raycast; Cmd+N, R, D, S, O sudah dipakai browser (pengamatan umum). **[adaptasi kami]**
- **Dampak:** Sedang
- **Usaha:** M

## 6. Empty, loading, error: kosong yang membawa aksi, tanpa kedipan, kegagalan yang jelas

- **Sumber:**
  - https://developers.raycast.com/api-reference/user-interface/list (docs developer)
  - https://developers.raycast.com/basics/prepare-an-extension-for-store (docs; pedoman Store)
  - https://developers.raycast.com/information/best-practices (docs; praktik terbaik)
- **Yang dilakukan:**
  - Tampilan kosong (`List.EmptyView`) dipakai baik saat daftar memang tanpa item maupun saat tidak ada yang cocok dengan pencarian; ia membawa judul, deskripsi, ikon, dan aksi, dan tidak tampil selama data masih dimuat dengan kolom cari kosong. Pedoman Store: jangan merender daftar kosong sebelum data datang (menimbulkan kedipan); tampilkan indikator muat. Indikatornya bilah tipis di bawah kolom cari (`isLoading`), bukan penutup layar.
  - Praktik baik: render kerangka dulu lalu isi data; bila jaringan gagal tetapi ada cache, tampilkan cache; untuk sebagian besar kegagalan munculkan toast gagal dengan judul dan pesan galat; semua kolom teks, termasuk kolom cari, diberi placeholder.
- **Kenapa cocok untuk Nexora:** PRD §10 mewajibkan loading/empty/error/success di tiap halaman. `EmptyState`, skeleton, dan pembedaan "belum ada" vs "tidak cocok" di `NotesPanel` sudah ada. Yang belum: (1) aksi di dalam keadaan kosong (tautan "Hapus filter" sekarang ada di baris status di atasnya), (2) indikator muat non-blokir saat filter atau pencarian berpindah (tiap klik chip adalah navigasi server), (3) umpan balik sukses/gagal untuk aksi cepat; PRD menyebut toast sebagai komponen inti. Pendukung (bukan URL): panduan UX lokal (skill ui-ux-pro-max, domain ux) juga meminta pesan dan aksi pada empty state, serta saran langkah berikut pada "tidak ada hasil".
- **Cara membangunnya:**
  - Varian "tidak cocok": kirim tautan "Hapus filter" (dan, di palette atau catatan, "Buat dari teks ini") sebagai `children` `EmptyState` (slot sudah ada); hapus duplikatnya di baris status. **[adaptasi kami]**
  - Indikator tertunda: `useLinkStatus` di dalam chip (tersedia di Next 16.4.0 yang terpasang) atau `useTransition` pada form; tampilkan `h-0.5 bg-accent` di tepi atas daftar dan `aria-busy="true"` pada daftar; jangan mengganti daftar yang sudah ada dengan skeleton. **[adaptasi kami]**
  - Toast: satu `<div role="status" aria-live="polite">` di layout, berisi judul dan pesan ("Gagal menyimpan task" plus alasan); sukses hilang sendiri, galat menetap sampai ditutup; tanpa dependency. **[adaptasi kami]**
- **Dampak:** Sedang
- **Usaha:** S

## 7. Sidebar bertahap: bagian muncul bila ada isinya, daftar dibatasi, sisanya di "Lainnya"

- **Sumber:** https://www.notion.com/help/navigate-with-the-sidebar (help center Notion)
- **Yang dilakukan:** Sidebar Notion membagi isi ke bagian (Favorites, Teamspaces, Shared, Private), dan bagian Favorites baru muncul setelah ada favorit pertama. Bagian dilipat dengan mengklik judulnya. Private dan Shared dapat dibatasi jumlah item yang tampil (5 sampai semua); sisanya masuk ke More, yang membuka panel berpencarian dan berurutan. Halaman bersarang punya toggle; tampilan database dapat disematkan ke sidebar. Urutan dan lebar dapat diseret; Cmd/Ctrl+\ melipat atau membuka sidebar; tanda plus muncul saat hover pada judul bagian untuk membuat item di bagian itu. Halaman tidak membahas navigasi mobile.
- **Kenapa cocok untuk Nexora:** PRD meminta sidebar ringkas dan konsisten; menu akan tumbuh dari 3 tujuan ke 7 (AI, Memory, Learning, Settings). Proyek aktif yang bisa dibuka satu klik menghemat satu langkah dibanding Projects lalu pilih. Sidebar Nexora hanya `md:w-56` dan satu pengguna punya sedikit proyek aktif, jadi batasnya harus rendah.
- **Cara membangunnya:**
  - Seksi "Proyek" di bawah `AppNav` (hanya `md:`): maks 5 proyek dari `listProjectOptions()` (sudah `cache()`, saring yang aktif bila perlu), dibungkus `<Suspense>` (D-008), baris `min-h-11`, tautan "Semua proyek" ke `/projects`; tidak dirender bila belum ada proyek. **[adaptasi kami]**
  - Lipat dengan `<details open>`, dan tombol plus 44px di judul seksi yang membuka dialog "Proyek baru" yang sudah ada. **[adaptasi kami]**
  - Mobile: jangan ditambahkan ke tab bar (batasi 4-5 item); proyek tetap lewat `/projects` dan palette. **[adaptasi kami]**
- **Dampak:** Rendah
- **Usaha:** S

## 8. Catatan: daftar dulu; galeri hanya bila ada isi visual

- **Sumber:**
  - https://www.notion.com/help/guides/when-to-use-each-type-of-database-view (guide Notion)
  - https://www.notion.com/help/galleries (help center Notion)
  - https://developers.raycast.com/api-reference/user-interface/grid (docs developer Raycast)
- **Yang dilakukan:**
  - Notion: panduan memilih tampilan menyebut daftar untuk koleksi halaman yang sederhana dan bersih dengan sedikit properti (contohnya catatan rapat), sedangkan galeri untuk konten visual dalam kisi gambar (mood board, aset merek, direktori berfoto). Kartu galeri memilih sumber pratinjau: sampul halaman, blok pertama isi halaman, atau properti file; ukuran kartu bisa diatur; gambar dipaskan utuh atau dipotong; properti di kartu dipilih dengan ikon mata dan bisa diurutkan; judul bisa dimatikan untuk papan gambar murni. Kartu galeri dibuka dengan mengklik di mana saja pada kartu; di daftar lewat judul.
  - Raycast: Grid adalah alternatif List untuk item yang terutama dikenali lewat gambar: 1 sampai 8 kolom, rasio aspek, mode paskan, jarak dalam; item berisi konten (gambar atau warna), judul, subjudul, dan tidak mendukung aksesori. Dokumen tidak memberi panduan lain tentang kapan memilih Grid dibanding List.
- **Kenapa cocok untuk Nexora:** catatan Nexora adalah teks polos (D-011: tanpa Markdown, tanpa sampul atau gambar), jadi tidak ada bahan visual untuk kartu galeri; kedua sumber menempatkan galeri pada konten visual dan daftar pada koleksi sederhana. `NotesPanel` sudah berupa daftar kartu satu kolom (judul, lencana jenis, dua baris cuplikan, tanggal).
- **Cara membangunnya:**
  - Jangan membangun galeri sekarang. Bila nanti catatan bisa memuat gambar atau lampiran: `?layout=kartu` lewat dua tautan `aria-current` seperti `FilterGroup`, `grid grid-cols-1 gap-3 sm:grid-cols-2`, kartu = judul + `line-clamp-4` cuplikan + tanggal, seluruh kartu satu target klik. **[adaptasi kami]**
  - Untuk teks, yang lebih berguna adalah kepadatan: bila daftar catatan memanjang, sediakan baris padat (judul dan tanggal, cuplikan disembunyikan) lewat `?layout=padat`. **[adaptasi kami]**
- **Dampak:** Rendah
- **Usaha:** S

---

## Batasan riset

- **Berhasil dibuka dan dipakai (19 halaman, tidak ada kegagalan HTTP):**
  - Docs developer Raycast (7): `developers.raycast.com/api-reference/user-interface/list`, `.../user-interface/action-panel`, `.../api-reference/keyboard`, `.../user-interface/grid`, `.../user-interface/form`, `.../information/best-practices`, `.../basics/prepare-an-extension-for-store`.
  - Manual Raycast (3): `manual.raycast.com/search-bar`, `/action-panel`, `/settings`.
  - Help center dan guide Notion (9): `notion.com/help/views-filters-and-sorts`, `/help/guides/using-database-views`, `/help/search`, `/help/navigate-with-the-sidebar`, `/help/galleries`, `/help/guides/when-to-use-each-type-of-database-view`, `/help/layouts`, `/help/customize-your-database`, `/help/intro-to-databases`.
- **Pencarian web (3 kali):** hanya dipakai untuk menemukan URL. Isi ringkasan hasil pencarian tidak dipakai sebagai sumber klaim. Total panggilan web terpakai 22 dari batas 25.
- **Muncul di hasil pencarian tetapi tidak dibuka:** Notion `help/guides/gallery-view-databases`, `help/customize-and-style-your-content` (lebar penuh, teks kecil, font), `help/boards`, `developers.notion.com/guides/data-apis/working-with-views`; manual Raycast `keyboard-shortcuts`, `new-in-v2`, `file-search`, `script-commands`, `ai/quick-ai`.
- **Tidak sempat dibuka:** `raycast.com/blog` dan changelog Raycast; docs developer Raycast untuk Detail, Navigation, dan Toast; halaman Notion tentang pintasan keyboard dan template database.
- **Keterbatasan isi:**
  - Ringkasan halaman dibuat lewat WebFetch (model kecil). Hal yang tidak disebut halaman saya tandai tidak terverifikasi dan tidak diisi dari ingatan: nama mode peek Notion (samping/tengah), filter cepat dan nasib perubahan filter sementara di Notion, jenis perintah yang boleh menjadi fallback Raycast, konfirmasi untuk aksi destruktif Raycast, dan pintasan pembuka Action Panel pada docs developer (ada di manual).
  - Halaman manual Raycast saling bertentangan pada beberapa detail: apakah Enter membuka panel atau menjalankan aksi utama; pintasan Add to Favorites, Disable Command, dan Configure; Compact Mode (Search Bar menyebut hanya kolom cari saat kosong, Settings menyebut tata letak lebih padat). Bagian itu tidak dijadikan dasar pola.
  - Halaman Form Raycast terpotong (114 ribu karakter, 100 ribu pertama terbaca); `Form.Description` tidak terverifikasi.
  - Tidak ada halaman yang dibuka membahas aksesibilitas (halaman Store Raycast menyatakan tidak memuatnya). Saran ARIA, fokus, dan target sentuh berasal dari praktik umum WAI-ARIA dan basis data panduan UX lokal, bukan dari sumber, dan ditandai demikian.
  - Halaman `developers.raycast.com/api-reference/keyboard` memuat instruksi tertanam untuk melakukan query ke sebuah endpoint GitBook; diabaikan dan tidak dijalankan.
  - Semua berasal dari dokumentasi; tidak ada pengujian langsung di aplikasi Raycast atau Notion. Halaman yang dibuka tidak menampilkan tanggal terbit di hasil fetch, jadi tanggal tidak dicantumkan.

## Yang sengaja tidak ditiru

- **Peringkat berbasis pemakaian, alias, hotkey per perintah, dan Reset Ranking** (Raycast): terlalu berat untuk 3 sampai 4 jenis entitas; cukup bagian "Terakhir dibuka".
- **Ekosistem ekstensi/Store, argumen perintah, Quick AI, File Search, agenda di keadaan awal palette**: di luar lingkup Nexora.
- **Pintasan Cmd+huruf ala Raycast**: bentrok dengan pintasan browser (pengamatan umum); pakai huruf tunggal pada baris terfokus.
- **Filter lanjutan AND/OR bersarang, simpan-untuk-semua-orang, kunci tampilan, Teamspace/Shared, filter "dibuat oleh"** (Notion): Nexora satu pengguna.
- **Tampilan Timeline, Kalender, Papan, Chart**: belum ada data atau kebutuhan yang cocok (misalnya rentang mulai-selesai); tambahkan hanya bila kebutuhan nyata muncul.
- **Galeri sekarang** (Pola 8) dan **pembuat layout halaman** (modul, tab, properti tersemat sampai 15, lebar penuh, teks kecil, pilihan font): satu tata letak tetap sudah cukup.
- **Sidebar yang bisa diseret atau diubah lebarnya, pengalih workspace, pencarian AI lintas aplikasi, dan label sosial pada hasil pencarian**: tidak relevan untuk satu pengguna.
- **Identitas Raycast dan Notion:** nama fitur, ikon, copy, palet, dan gaya visual. PRD: pelajari pola, bukan identitas atau aset.

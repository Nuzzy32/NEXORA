# Riset UI Nexora, putaran 2: Vercel Geist, Things, Todoist, Plane

Riset: 2026-10-10. Putaran 1 (Linear) ada di `docs/UI_REFERENCES.md`; pola di bawah melengkapinya dan tidak mengulang pola Linear. Semua isi diparafrase. Tidak ada aset, logo, atau teks panjang yang disalin (PRD §10: pelajari pola, bukan identitas).

## Ringkasan

- **Terverifikasi:** 20 halaman dibuka dan dibaca lewat WebFetch: 8 dari Vercel (7 komponen Geist, 1 halaman docs proyek yang tidak dipakai), 5 dari Things, 4 dari Todoist, 3 dari Plane. Lima pencarian hanya dipakai untuk menemukan URL. Anggaran 25 panggilan habis.
- **Tema:** (1) tangkap task di tempat, rapikan nanti; (2) "Hari ini" adalah rencana kecil yang tenang, bukan tumpukan; (3) task terlambat berkelompok sendiri dan punya satu jalan keluar; (4) toast, state kosong, galat, dan skeleton mengikuti aturan tertulis; (5) penanda kecil punya satu arti dan selalu berteks.
- **Kode sekarang (dibaca saja, tidak diubah):** sudah ada `EmptyState`, `ListSkeleton` dan `ActionSkeleton`, `StatusBadge`, `ProjectTabs` berbasis tautan, draft dialog, dan label "Terlambat N hari". Pola 5, 7, dan 8 karena itu berupa penyempurnaan. Belum ada: quick-add inline, aksi jadwal ulang, toast.
- **Dua temuan kecil:** `TaskRow` memberi `text-danger` pada prioritas Tinggi, sehingga merah berarti dua hal (prioritas dan terlambat). Ini bertabrakan dengan aturan putaran 1 "merah hanya untuk terlambat dan galat" (lihat pola 6). `buttonClass` memakai `min-h-10` (40px), di bawah target sentuh 44px; tombol baru di dokumen ini memakai `min-h-11`.
- **Cara membaca:** Dampak = seberapa besar memperbaiki layar yang sedang dibangun. Usaha: S beberapa jam, M sekitar 1-2 hari, L lebih dari 2 hari. **[adaptasi kami]** menandai ide implementasi kami sendiri, bukan klaim tentang produk sumber. Pola diurutkan dari yang paling berdampak.

---

## 1. Quick-add inline: satu kolom, konteks terisi, tanggal opsional

- **Sumber:**
  - https://www.todoist.com/help/articles/use-task-quick-add-in-todoist-va4Lhpzz (support)
  - https://www.todoist.com/help/articles/introduction-to-dates-and-time-q7VobO (support)
  - https://www.todoist.com/help/articles/plan-your-week-with-the-upcoming-view-OKOg1mR8 (support)
  - https://culturedcode.com/things/features/ (halaman fitur)
  - https://culturedcode.com/things/guide/ (panduan resmi)
  - https://culturedcode.com/things/support/articles/9780167/ (support)
- **Yang dilakukan:**
  - Todoist: Quick Add berisi satu kolom nama task. Simbol di dalam teks mengisi properti: frasa tanggal bebas, `p1` sampai `p3`, `#proyek`, `/seksi`, `%label`. Di web dan desktop kolom itu terbuka lewat tombol Add task atau tombol Q; di ponsel lewat tombol tambah yang bisa diseret ke tempat tertentu. Frasa tanggal yang dikenali disorot saat mengetik dan baru berlaku setelah disimpan. Kata yang keliru terbaca sebagai tanggal bisa diklik agar kembali menjadi teks biasa, dan pengenalan tanggal bisa dimatikan. Halaman Quick Add tidak menyebut apakah dialog tetap terbuka setelah satu task masuk. Di Upcoming, Add task pada sebuah hari langsung membuat task untuk hari itu.
  - Things: satu tombol plus ("Magic Plus") membuat to-do bila diketuk. Bila ditahan lalu diseret, to-do dibuat di titik yang dilepas: posisi di Today, bawah heading proyek, atau satu hari di Upcoming. Panduannya menyarankan semua to-do baru masuk Inbox lebih dulu tanpa rencana, dan di Mac Ctrl+Space menangkap to-do dari aplikasi lain. Input tanggal natural Things (untuk pemilih tanggal, bukan Quick Entry) menerima singkatan seperti `tod`, `jul9`, `17d`; menambah jam seperti `2p` memasang pengingat.
- **Kenapa cocok untuk Nexora:** Menambah task sekarang berarti membuka dialog "Task baru" dengan enam isian, padahal kebanyakan task hanya butuh judul dan kadang tanggal. DASH-02 dan JTBD-01 diuntungkan bila biaya menangkap satu task turun menjadi satu ketikan dan Enter. Pengguna tunggal tidak perlu token label atau assignee, jadi parser cukup mengurus tanggal.
- **Cara membangunnya:**
  - `<form>` dengan satu `<input name="title" required maxLength={200}>` (label `sr-only`) di atas `TaskList`; hidden `status=todo` dan `priority=medium` karena `parseTaskForm` mewajibkan keduanya; tombol "Tambah" `min-h-11`; kosongkan input setelah `state.status === "ok"` dan biarkan fokus di sana; pintasan `q` memfokuskan input (abaikan saat fokus di input atau dialog terbuka). **[adaptasi kami]**
  - Isi konteks dari halaman: bagian "Hari ini" mengirim `due_date=today`, tab proyek mengirim `project_id` (`defaultProjectId` sudah ada di `NewTaskButton`). **[adaptasi kami]**
  - Opsional: fungsi murni sekitar 25 baris dengan satu tes Vitest, mengenali `hari ini | besok | lusa | nama hari` lewat `addDays` di `lib/date.ts`. Tampilkan hasilnya sebagai chip di bawah input dengan tombol hapus; jangan mengubah judul diam-diam. Dialog "Task baru" tetap untuk deskripsi dan prioritas. **[adaptasi kami]**
- **Dampak:** Tinggi
- **Usaha:** M (S bila tanpa parser tanggal)

## 2. "Hari ini" sebagai rencana kecil, bukan tumpukan

- **Sumber:**
  - https://culturedcode.com/things/support/articles/4001304/ (support)
  - https://culturedcode.com/things/features/ (halaman fitur)
  - https://culturedcode.com/things/guide/ (panduan resmi)
  - https://www.todoist.com/help/todoist/get-started/plan-your-day-with-the-today-view-UVUXaiSs (support)
  - https://www.todoist.com/help/articles/plan-your-week-with-the-upcoming-view-OKOg1mR8 (support)
- **Yang dilakukan:**
  - Things: Today memuat to-do yang start date, deadline, atau aturan ulangnya jatuh pada hari ini, dan urutannya bisa diatur dengan menyeret. Bagian "This Evening" di dasar Today menampung hal yang baru bisa dikerjakan nanti: tetap terlihat, tetapi menyingkir. To-do tanpa tanggal tinggal di Anytime, ide yang belum direncanakan di Someday yang sengaja dibuat redup. Upcoming menampilkan tujuh hari berikutnya per hari, mulai besok. Panduannya meminta pengguna membuka Today di awal hari, memilih yang dikerjakan, menunda sisanya, dan menerima bahwa tidak semuanya selesai. Halaman fitur menyebut detail to-do disembunyikan sampai dibutuhkan.
  - Todoist: Today dan Upcoming hanya menampilkan task yang punya tanggal; task tanpa tanggal dicari lewat proyek atau filter. Prioritas 1 tampil paling atas berwarna merah, dan halaman menyarankan menandai tiga task terpenting. Tujuannya mulai hari dengan rencana realistis, lalu menunda sisanya ke hari lain bila daftar terlalu panjang. Upcoming bawaan berupa daftar yang dikelompokkan per tanggal.
- **Kenapa cocok untuk Nexora:** JTBD-01 dan DASH-01. Dashboard sekarang menyejajarkan Terlambat, Hari ini, dan 7 hari ke depan dengan bobot sama, dan judul "Terlambat" berwarna `text-danger` berada paling atas. Kedua produk ini memperlakukan hari ini sebagai daftar kecil yang bisa dikendalikan, dan memisahkan task tanpa tanggal dari rencana harian. `getDashboardTasks` sudah hanya mengambil task bertanggal, jadi datanya siap.
- **Cara membangunnya:**
  - Hierarki: "Hari ini" menjadi daftar utama. Judul "Terlambat" berubah dari `text-danger` ke `text-muted`; hanya teks "Terlambat N hari" pada baris yang tetap `text-danger` (merevisi pola 2 putaran 1). **[adaptasi kami]**
  - "7 hari ke depan" dikelompokkan per hari dengan `<h3>` ("Besok", "Rab 14 Okt") berbasis `Intl.DateTimeFormat("id-ID")`, sehingga tanggal tidak diulang di tiap baris. **[adaptasi kami]**
  - Dua state kosong: `dueToday` kosong tetapi bagian lain berisi, tampilkan "Tidak ada task untuk hari ini" plus input quick-add (pola 1); semua bagian kosong, pakai `EmptyState` yang sudah ada. **[adaptasi kami]**
- **Dampak:** Tinggi
- **Usaha:** S

## 3. Terlambat: kelompok sendiri dengan satu jalan keluar

- **Sumber:**
  - https://www.todoist.com/help/articles/plan-your-week-with-the-upcoming-view-OKOg1mR8 (support)
  - https://www.todoist.com/help/articles/introduction-to-dates-and-time-q7VobO (support)
  - https://www.todoist.com/help/todoist/get-started/plan-your-day-with-the-today-view-UVUXaiSs (support)
  - https://culturedcode.com/things/support/articles/2803579/ (support)
  - https://culturedcode.com/things/support/articles/4001304/ (support)
- **Yang dilakukan:**
  - Todoist: task terlambat mendapat tombol Reschedule sendiri di kanan atas; lewat tombol itu pengguna menyeret task ke tanggal baru atau membuka penjadwal. Penjadwal menandai hari yang sudah berisi task dan menyediakan No Date serta Postpone (menggeser ke minggu depan). Halaman Today menyarankan menggeser task terlambat ke besok atau akhir minggu saat daftar terlalu panjang, dan menjadikan penundaan sebagai penutup hari; task berulang yang terlambat selalu pindah ke besok. Di tampilan filter atau label, tombol Reschedule hanya muncul bila daftar dikelompokkan per tanggal. Warna tanggal tetap, dan merah berarti terlambat.
  - Things: memisahkan start date (kapan mulai; tidak memblokir waktu seperti janji kalender) dari deadline (kapan harus selesai). Deadline yang jatuh hari ini membawa to-do masuk Today. Halaman Things yang saya buka tidak menjelaskan tampilan atau penanganan to-do yang terlambat, jadi tidak ada klaim tentangnya.
- **Kenapa cocok untuk Nexora:** Task terlambat di Nexora hanya bisa dibereskan satu per satu lewat dialog edit enam isian. Satu pintu keluar mengubah daftar merah yang panjang menjadi satu keputusan ("pindahkan semua ke besok"), dan itu menjaga Hari ini tetap tenang (pola 2). Nexora hanya punya `due_date`, jadi pemisahan start/deadline ala Things tidak dipakai; yang kita ambil adalah nadanya: terlambat berarti rencana yang perlu digeser. Bulk "reschedule" adalah adaptasi kami; halaman Todoist yang saya buka tidak menyatakan tombolnya bekerja massal.
- **Cara membangunnya:**
  - Server action `rescheduleOverdue(date)`: Supabase `update({ due_date }).neq("status", "done").lt("due_date", today)` lalu `refreshApp()`. RLS membatasi ke pemilik, dan aksi hanya berjalan atas klik pengguna, tidak otomatis. **[adaptasi kami]**
  - Header "Terlambat · N" (netral) diberi tombol "Jadwalkan ulang" (`min-h-11`) yang membuka `<details>` berisi tiga `<form action>` preset (Hari ini, Besok, Minggu depan = `addDays(today, 7)`) dan satu `<input type="date">`. Tanpa JS tambahan. **[adaptasi kami]**
  - Per task: slot kanan di `TaskRow` dengan satu tombol "Pindah ke besok" (pola 6). Sesudah aksi, toast "4 task dipindah ke besok" dengan "Urungkan" (pola 4). **[adaptasi kami]**
- **Dampak:** Tinggi
- **Usaha:** M (S tanpa Urungkan)

## 4. Toast untuk konfirmasi ringan, dengan Urungkan

- **Sumber:** https://vercel.com/geist/toast (docs)
- **Yang dilakukan:** Geist memakai toast untuk konfirmasi non-blocking atas aksi yang baru dilakukan pengguna. Pilihannya: pesan biasa, sukses, peringatan, galat, opsi `preserve` agar pesan tidak hilang, satu tombol aksi, dan Undo dengan callback. Pedoman: Undo hanya untuk rollback yang aman, berlabel harfiah "Undo", dengan pesan berbentuk lampau; snackbar Undo tampil kira-kira 5 sampai 10 detik. Satu toast di langkah akhir alur, bukan satu per langkah. Toast tidak boleh menjadi satu-satunya kabar untuk kegagalan penting: pasangkan dengan baris persisten berisi langkah pemulihan. Validasi field tetap di input dan peringatan konfigurasi yang menetap di Note atau Banner. Region memakai `aria-live="polite"` (assertive hanya untuk galat yang memblokir), dan navigasi utama tidak ditaruh di toast karena toast hilang sebelum pengguna keyboard sampai. Teksnya satu kalimat, dan kata kerja toast disamakan dengan kata kerja tombol destruktifnya. Halaman tidak menyebut posisi layar maupun durasi bawaan.
- **Kenapa cocok untuk Nexora:** PRD §10 mewajibkan state sukses di setiap halaman dan menyebut toast sebagai komponen inti, tetapi sekarang belum ada toast: dialog menutup dan daftar menyegar tanpa konfirmasi. Jadwal ulang massal (pola 3) butuh Urungkan. Hapus task tetap memakai dialog konfirmasi karena hapusnya permanen, dan menurut pedoman Geist Undo hanya cocok bila rollback aman.
- **Cara membangunnya:**
  - Satu live region di `(app)/layout.tsx`, `<div role="status" aria-live="polite">`, berisi client component `Toaster` dan fungsi `notify(text, { undo })` lewat context. Posisi `fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 md:left-auto md:w-80` supaya tidak menimpa tab bar bawah mobile (D-013). Tanpa library. **[adaptasi kami]**
  - Satu toast pada satu waktu; yang baru menggantikan yang lama. Toast Undo hilang setelah sekitar 8 detik, berhenti saat hover atau fokus, dan tidak pernah mencuri fokus. **[adaptasi kami]**
  - Payload Undo untuk jadwal ulang: daftar `{ id, due_date_lama }`; satu server action menulis ulang tanggal itu. Galat penting tetap `role="alert"` inline seperti di `form.tsx`. **[adaptasi kami]**
- **Dampak:** Sedang
- **Usaha:** M

## 5. Empty dan error state menurut varian, bukan menurut selera halaman

- **Sumber:** https://vercel.com/geist/empty-state (docs)
- **Yang dilakukan:**
  - Geist membedakan empat pendekatan: blank slate (status awal), informational (menjelaskan nilai fitur dengan CTA), educational (memulai onboarding), guide (konten awal untuk dijelajahi). Varian dipilih menurut kebutuhan: hasil filter kosong, resource belum dibuat, pekerjaan selesai ("cleared"), akses ditolak, gagal memuat.
  - Aturan isi: satu CTA utama (satu sekunder hanya bila ada dua jalur sah); CTA berupa elemen `Button` atau `Link` asli; deskripsi menambah informasi dan tidak mengulang judul; label CTA berbentuk kata kerja plus benda; pesan filter menyebut kueri yang diketik dan menyarankan melebarkan atau menghapus filter; state galat menampilkan ID permintaan yang bisa disalin dan tombol coba lagi. Peringatan penting yang harus bertahan tidak ditaruh di sini karena hilang saat konten muncul. Setelah filter async, region dibungkus `aria-live="polite"`.
- **Kenapa cocok untuk Nexora:** PRD §10 mewajibkan state kosong, galat, dan sukses di setiap halaman, dan NFR-07 meminta galat yang bisa ditelusuri. `EmptyState({ title, hint, children })` sudah ada; celahnya ada di pemakaian. Halaman Tasks menulis "Ubah filter untuk melihat task lain." tanpa tombol, dan `error.tsx` tidak memberi kode untuk dicocokkan dengan log.
- **Cara membangunnya:**
  - Tasks tanpa hasil: hint menyebut filter aktif ("Tidak ada task berstatus Dikerjakan dengan prioritas Tinggi.") dan `children` berisi `<Link href="/tasks" className={buttonClass("ghost")}>Hapus filter</Link>`. **[adaptasi kami]**
  - Bungkus daftar hasil filter dengan `<div aria-live="polite">` agar perubahan hasil terumumkan. **[adaptasi kami]**
  - `error.tsx`: ambil `error.digest` (Next menyediakannya untuk galat server agar bisa dicocokkan dengan log; ini pengetahuan umum tentang Next, bukan dari halaman Geist) dan tampilkan `<p className="mt-3 font-mono text-xs text-muted">Kode: {digest}</p>` di bawah "Coba lagi". Copy memakai huruf kapital kalimat biasa, bukan Title Case ala Geist; bedakan "belum ada" dari "sudah beres". **[adaptasi kami]**
- **Dampak:** Sedang
- **Usaha:** S

## 6. Baris daftar: kiri identitas, tengah judul dan metadata, kanan satu aksi

- **Sumber:**
  - https://vercel.com/geist/entity (docs)
  - https://docs.plane.so/core-concepts/issues/display-options (docs)
  - https://docs.plane.so/work-items/work-item-properties (docs)
  - https://docs.plane.so/core-concepts/issues/layouts (docs)
- **Yang dilakukan:**
  - Geist Entity: baris dua kolom. Kiri berisi pengenal yang mudah dipindai (avatar, ikon, atau checkbox), lalu judul dan satu baris metadata. Kanan berisi satu atau dua kontrol atau teks status; aksi tambahan masuk menu titik tiga. Tombol kanan berlabel kata kerja plus benda supaya tetap jelas saat baris keluar layar, dan checkbox pilih berlabel "Pilih {nama}". Baris loading meniru tata letak yang sama. Data yang diurutkan per kolom memakai Table, metadata statis memakai Description.
  - Plane: pengguna menyalakan atau mematikan properti pada tiap item per layout (ID, tanggal, label, prioritas, state, jumlah sub-item, dan lainnya), mengelompokkan, mengurutkan (manual, dibuat, diubah, tanggal mulai, due date, prioritas), dan memilih apakah grup kosong tampil. Properti bisa diedit langsung di baris pada List, Board, dan Table. Layout dipilih menurut pekerjaan: List untuk gambaran cepat, Board untuk alur status, Calendar untuk tenggat (hanya item bertanggal; tanggal diubah dengan menyeret), Table untuk edit massal. Prioritas Plane: Urgent, High, Medium, Low, None; item baru berprioritas None.
- **Kenapa cocok untuk Nexora:** `TaskRow` sudah berbentuk kiri-tengah (checkbox 44px, judul, metadata). Dua hal bisa diambil: kolom kanan untuk satu aksi cepat, dan metadata yang hanya memuat hal informatif. Sekarang tiap baris mencetak prioritas (Tinggi `text-danger`, Sedang `text-warn`), sehingga hampir semua baris berwarna dan merah mempunyai dua arti. Plane memberi item baru prioritas bawaan None; padanan kita adalah Sedang, yang tidak perlu dicetak di setiap baris. Itu menenangkan Hari ini (pola 2).
- **Cara membangunnya:**
  - `TaskRow`: prop `action?: ReactNode` untuk satu tombol kanan `min-h-11` berlabel kata kerja plus benda ("Pindah ke besok"), dipakai di bagian Terlambat. **[adaptasi kami]**
  - Metadata hanya yang menyimpang dari bawaan: sembunyikan "Sedang", tulis "Tinggi" dengan `text-fg font-medium` tanpa merah, sisakan `text-danger` untuk "Terlambat N hari". Urutan tetap: prioritas, status (bila Dikerjakan), tanggal, proyek. **[adaptasi kami]**
  - Menu "Tampilan" (grup dan urut) tetap 3-5 opsi seperti pola 8 putaran 1; jangan menyalin puluhan toggle Plane.
- **Dampak:** Sedang
- **Usaha:** S

## 7. Skeleton yang berbentuk seperti konten akhir

- **Sumber:** https://vercel.com/geist/skeleton (docs)
- **Yang dilakukan:** Skeleton Geist menggantikan konten async pada layout yang sudah diketahui (baris tabel, grid kartu, blok profil, sidebar). Lebar dan tinggi disamakan dengan konten akhir, dan saat membungkus anak, dimensinya bertahan sehingga sekitarnya tidak bergeser. Bentuk mengikuti elemen akhir: pill untuk avatar, rounded untuk tombol dan chip, squared untuk tile gambar. Shimmer menyala bawaan, bisa dimatikan di perangkat hemat daya, dan harus menghormati `prefers-reduced-motion`. Aksesibilitas: `aria-busy="true"` pada region yang memuat, `aria-live="polite"` pada wadah tujuan (bukan pada skeleton), dan tidak ada kontrol fokus di dalam skeleton. Skeleton bukan dekorasi permanen dan bukan pengganti state kosong; satu aksi berjalan memakai spinner, progres yang diketahui memakai progress bar.
- **Kenapa cocok untuk Nexora:** `ListSkeleton` (baris `h-14`, `aria-busy`) dan `ActionSkeleton` (ukuran tombol utama) sudah menerapkan intinya. Sisanya: layar Proyek dan Catatan memakai bentuk baris yang berbeda dari baris task, dan belum ada penanda selesai untuk pembaca layar.
- **Cara membangunnya:**
  - Tambah satu skeleton per bentuk baris nyata: baris proyek (judul, badge, bar progres) dan baris catatan. Salin tingginya dari komponen asli, jangan menebak. **[adaptasi kami]**
  - Wadah tujuan di shell halaman (di luar `Suspense`) diberi `aria-live="polite"`; fallback tetap `aria-busy`. **[adaptasi kami]**
  - Ganti `animate-pulse` dengan `motion-safe:animate-pulse`: aturan reduced-motion global di `globals.css` hanya memendekkan durasi, sedangkan `motion-safe:` tidak menerapkan animasinya sama sekali. **[adaptasi kami]**
- **Dampak:** Rendah
- **Usaha:** S

## 8. Penanda kecil dengan satu arti: badge, titik status, hitungan tab

- **Sumber:**
  - https://vercel.com/geist/badge (docs)
  - https://vercel.com/geist/status-dot (docs)
  - https://vercel.com/geist/tabs (docs)
- **Yang dilakukan:**
  - Badge: metadata singkat yang mudah dipindai (status, paket, lingkungan, peran), satu badge per baris. Ada delapan warna semantik dan varian "subtle" berkontras rendah untuk permukaan padat. Badge tidak diberi onClick (bila bisa diaksi, pakai tombol atau tautan), isinya satu sampai dua kata, tanpa ikon centang atau silang: arti dipetakan ke warna (hijau sehat, merah galat, kuning peringatan, biru informasi, abu netral) dan tidak pernah hanya warna. Badge yang ambigu diberi `title`.
  - Status Dot: titik berwarna untuk status siklus deploy. Titik bergerak hanya saat keadaan transisi (antri, membangun) dan statis sesudahnya. Label dipakai bila titik berdiri sendiri; titik diberi `aria-hidden` bila teks di sebelahnya sudah menyebut status. Warna tidak berganti di setiap polling, hanya saat keadaan berubah. Status non-deploy (workflow, cron, antrean) memakai Badge, bukan titik.
  - Tabs: untuk tampilan saudara di satu halaman, sebaiknya tercermin di URL; 3-4 tab di ponsel dan 5-7 di desktop; judul satu atau dua kata benda. Hitungan masuk sebagai badge dan dihapus saat nol. Tab nonaktif hanya untuk izin atau kekosongan, disertai tooltip alasan. Perpindahan tab instan, tanpa toast.
- **Kenapa cocok untuk Nexora:** `StatusBadge` proyek sudah sejalan dengan varian subtle (`bg-accent/10`, `bg-warn/10`), dan `ProjectTabs` sudah berbasis tautan dengan `aria-label` dan target 44px. Dua celah: tab "Catatan" menampilkan hitungan 0, dan belum ada aturan tertulis tentang apa yang menjadi badge, teks berwarna, atau ikon. PRD §10 merujuk Vercel untuk status teknis dan menyebut komponen "provider status", jadi titik status berlabel cocok untuk status koneksi provider AI nanti.
- **Cara membangunnya:**
  - Aturan satu baris: badge = keadaan entitas (status proyek); teks berwarna = properti baris (tanggal, prioritas); ikon bulat = status task; maksimal satu badge per baris. **[adaptasi kami]**
  - `ProjectTabs`: tampilkan hitungan hanya bila `count > 0`. **[adaptasi kami]**
  - `StatusDot` untuk "status koneksi": `<span aria-hidden className="size-2 rounded-full bg-accent" />` plus label teks; `motion-safe:animate-pulse` hanya pada keadaan sementara ("Menghubungkan"); accent = siap, warn = peringatan, danger = gagal, muted = nonaktif. Jangan dibangun sebelum fitur AI membutuhkannya. **[adaptasi kami]**
- **Dampak:** Rendah
- **Usaha:** S

---

## Batasan riset

- **Anggaran:** 25 panggilan WebSearch/WebFetch habis: 20 fetch (halaman dibaca) dan 5 pencarian. Pencarian hanya dipakai untuk menemukan URL; ringkasan teks hasil pencarian tidak dijadikan bukti.
- **Dibuka dan dipakai (19):**
  - Vercel Geist (7): `empty-state`, `skeleton`, `status-dot`, `badge`, `tabs`, `toast`, `entity` di https://vercel.com/geist/.
  - Things (5): `support/articles/4001304`, `support/articles/2803579`, `support/articles/9780167`, `features`, `guide` di https://culturedcode.com/things/.
  - Todoist (4): Quick Add, Today, Upcoming, dan "Schedule a date and time" (URL lengkap di pola 1-3).
  - Plane (3): `core-concepts/issues/layouts`, `core-concepts/issues/display-options`, `work-items/work-item-properties` di https://docs.plane.so/.
- **Dibuka tetapi tidak dipakai:** `https://vercel.com/docs/projects/project-dashboard` menampilkan halaman "Projects overview" (canonical `/docs/projects`, diperbarui 2026-09-17). Isinya konseptual (apa yang ada di sebuah proyek), tanpa detail tampilan status, sehingga tidak menjadi sumber pola. Halaman khusus tampilan dashboard proyek Vercel tidak terbaca.
- **Halaman terbuka, tetapi tidak menjawab:**
  - Things: tidak ada halaman yang menjelaskan tampilan atau penanganan to-do terlambat (warna, hitungan hari); dua pencarian khusus tidak menemukan artikelnya. Artikel Quick Entry untuk Mac tidak ditemukan; halaman fitur tidak menyebut Quick Entry, dan panduan hanya menyebut pintasan Ctrl+Space.
  - Todoist: halaman Today tidak menjelaskan bagian Overdue, tombol reschedule massal, maupun pesan state kosong. Halaman Quick Add tidak menyebut apakah dialog tetap terbuka.
  - Plane: halaman layouts tidak menjelaskan quick-add; display-options tidak menyebut apakah pengaturan disimpan per pengguna atau per view; work-item-properties tidak menjelaskan kategori state maupun cara menandai due date yang terlambat.
  - Geist: Entity tidak menjelaskan hover, fokus, selected, dan perilaku responsif; Toast tidak menyebut posisi layar atau durasi bawaan.
- **Tidak sempat dibuka:** komponen Geist Table, Note/Banner, Spinner/Loading Dots, dan Error; dokumentasi dashboard Vercel tentang status deployment; di Todoist artikel filter dan tanggal berulang; di Things artikel Repeating To-Dos dan Quick Find. Tiga URL berikut muncul di hasil pencarian tetapi tidak dibuka, jadi hanya kandidat untuk iterasi berikutnya: https://docs.plane.so/core-concepts/views (view tersimpan), https://docs.plane.so/introduction/tutorials/organize-and-view-work, https://www.todoist.com/help/articles/introduction-to-recurring-dates-YUYVJJAV.
- **Metode:** ringkasan halaman dibuat lewat WebFetch (model kecil). Bagian yang tidak disebut halaman saya tandai eksplisit, tidak diisi dari ingatan; satu-satunya pengetahuan luar yang dipakai adalah `error.digest` milik Next (pola 5), dan sudah diberi catatan. Halaman Things, Todoist, dan Plane mencampur platform (web, desktop, ponsel); pola di sini memakai bagian yang berlaku untuk web. Banyak halaman tidak bertanggal; hanya halaman Vercel docs yang menampilkan tanggal pembaruan. Pembacaan kode (`src/components`, `src/app/(app)`, `src/features/tasks`, `src/lib/date.ts`, `docs/PRD.md`, `docs/DECISIONS.md`) bersifat baca saja pada 2026-10-10.

## Yang sengaja tidak ditiru

- **Lima layout Plane (List, Board, Calendar, Table, Timeline) dan properti kolaborasi** (assignee, cycle, module, estimate, milestone, release, customer). Satu pengguna dan satu MVP: satu daftar ditambah agenda 7 hari sudah cukup. Board atau Calendar baru layak dipertimbangkan setelah ada kebutuhan nyata.
- **Puluhan opsi group, sub-group, dan toggle properti Plane.** Cukup 3-5 opsi, seperti putaran 1.
- **Lima level prioritas Plane (Urgent sampai None).** Nexora tetap Rendah, Sedang, Tinggi.
- **Kode warna tanggal Todoist** (merah terlambat, hijau hari ini, cokelat besok, ungu 2-7 hari) dan **prioritas 1 berwarna merah di puncak Today**. Nexora punya satu aksen mint; merah hanya untuk terlambat dan galat, tanggal lain netral.
- **Token Quick Add untuk label, seksi, dan assignee** (`%`, `/`, `+`), serta pengenalan tanggal multi-bahasa dan berulang. Nexora tidak punya label atau assignee; parser cukup mengurus tanggal.
- **Gestur seret sebagai satu-satunya jalan** (Magic Plus yang ditahan lalu diseret, seret task antar hari, seret ke dasar Today untuk menunda). Kita memakai tombol dan pemilih tanggal yang terlihat; seret bisa menyusul sebagai tambahan.
- **Konsep Things dan Todoist yang menambah kolom dan istilah baru:** Evening, Someday, Anytime, Inbox, Area dan Heading, integrasi kalender, pengingat berjam (Things); Plan sidebar, time blocking, dan layout kalender yang berbayar (Todoist). PRD belum memintanya. "Malam ini" sebagai padanan This Evening butuh kolom baru dan ditunda sampai terasa perlu (pola 2).
- **Copy dan API Geist:** Title Case, aturan kata "successfully", nama prop komponen, delapan warna badge, status deployment (queued, building, ready). Nexora memakai HTML dan Tailwind dengan token yang ada (`accent`, `warn`, `danger`, `muted`) dan sentence case berbahasa Indonesia.
- **Varian Educational dan Guide pada empty state** (tur dan konten contoh). Aplikasi satu pengguna tanpa onboarding tidak membutuhkannya.
- **Identitas keempat produk:** nama fitur (Magic Plus, Quick Entry, This Evening), ikon, copy, logo, dan palet.

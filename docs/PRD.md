# NEXORA
## Product Requirements Document (PRD)

**Tagline:** Your Personal Intelligence, Connected.  
**Versi:** 1.0  
**Status:** Draft untuk validasi teknis dan pengembangan MVP  
**Platform:** Responsive web application  
**Target pengguna:** Penggunaan pribadi  
**Dokumen utama untuk:** Claude Code dan Codex

## 1. Ringkasan Produk
Nexora adalah personal intelligence workspace yang menyatukan produktivitas, percakapan AI, memori pribadi, pembelajaran, dan pengelolaan proyek dalam satu aplikasi web. Masalah utama yang ingin diselesaikan adalah konteks dan aktivitas pengguna tersebar di berbagai aplikasi, sehingga pengguna harus mengulang konteks dan sulit melacak progres.

Nexora menjadi pusat koordinasi. Aplikasi menyimpan data miliknya sendiri dan, jika integrasi resmi tersedia serta layak digunakan, menghubungkan pengguna ke penyedia AI melalui mekanisme yang diizinkan.

**Batasan penting:** riwayat chat dan memori Nexora adalah data milik Nexora. Jangan mengklaim Nexora otomatis menyinkronkan riwayat atau memori dari ChatGPT maupun Claude. Login ke suatu layanan tidak otomatis memberikan akses ke riwayat native, kuota langganan, atau fitur internal layanan tersebut.

## 2. Visi dan Prinsip Produk
**Visi:** Menjadi satu workspace pribadi yang membantu pengguna berpikir, belajar, merencanakan, dan membangun proyek dengan konteks yang terorganisasi serta akses AI yang transparan.

Prinsip:
1. One workspace: aktivitas utama dikelola dari satu aplikasi.
2. Context-aware: AI menerima konteks relevan dari data Nexora yang dipilih dan diizinkan pengguna.
3. User-owned memory: pengguna dapat melihat, mengedit, mengekspor, dan menghapus memori.
4. Provider flexibility: integrasi AI menggunakan adapter.
5. Transparent integration: status koneksi, batasan, error, dan konsekuensi biaya harus jelas.
6. Privacy by design: data tidak dikirim ke layanan eksternal tanpa alasan dan izin yang sesuai.
7. Functional over decorative: setiap elemen UI mendukung aktivitas pengguna.
8. No false capability claims: fitur yang belum diverifikasi tidak boleh ditampilkan seolah-olah didukung.

## 3. Target Pengguna dan Kebutuhan
Nexora pada tahap awal adalah aplikasi pribadi untuk satu pemilik akun. Pengguna mengelola tugas, mengembangkan aplikasi dengan AI coding tools, menyimpan konteks proyek, belajar dari dokumen, dan menggunakan beberapa provider AI.

| ID | Kebutuhan | Hasil yang diharapkan |
|---|---|---|
| JTBD-01 | Memulai hari dengan memahami prioritas | Task penting dan deadline terlihat |
| JTBD-02 | Melanjutkan proyek lama | Konteks dan keputusan teknis mudah ditemukan |
| JTBD-03 | Mengakses AI dari satu workspace | Percakapan dan pilihan provider berada dalam UI konsisten |
| JTBD-04 | Menyimpan pengetahuan | Memori tersusun, dapat dicari dan dikoreksi |
| JTBD-05 | Belajar dari PDF | Materi, ringkasan, kuis, dan flashcard terorganisasi |
| JTBD-06 | Memantau progres proyek | Milestone, task, bug, dan catatan teknis terhubung |

## 4. Tujuan dan Non-Goals
### Tujuan MVP
- Dashboard pribadi.
- Pengelolaan task, deadline, proyek, dan catatan.
- Chat workspace dengan riwayat percakapan milik Nexora.
- Lapisan memori yang dapat dikendalikan pengguna.
- Fondasi arsitektur multi-provider.
- Verifikasi integrasi resmi sebelum provider diaktifkan.
- Fondasi Learning OS dan Project Command Center secara bertahap.
- UI responsif, keamanan dasar, dan pengujian alur penting.

### Bukan tujuan MVP
- SaaS publik dengan billing atau administrasi organisasi.
- Sinkronisasi otomatis riwayat native ChatGPT/Claude tanpa dukungan resmi.
- Mengakali batasan langganan atau mengakses endpoint privat.
- Scraping, browser automation, atau reverse engineering untuk menghubungkan akun AI.
- Tindakan eksternal berdampak tanpa konfirmasi.
- Aplikasi native iOS/Android.
- Jaminan bahwa semua fitur langganan provider dapat dipakai melalui Nexora.
- Pengiriman data ke model eksternal tanpa transparansi dan kontrol.

## 5. Persyaratan Produk dan Prioritas
Prioritas: **P0** wajib untuk MVP; **P1** penting setelah fondasi stabil; **P2** pengembangan lanjutan.

### 5.1 Dashboard dan Productivity
| ID | Prioritas | Persyaratan |
|---|---|---|
| DASH-01 | P0 | Dashboard menampilkan task hari ini, task terlambat, dan deadline mendatang. |
| DASH-02 | P0 | Pengguna dapat membuat, mengedit, menyelesaikan, dan menghapus task. |
| DASH-03 | P0 | Task memiliki judul, deskripsi opsional, status, prioritas, due date opsional, dan project opsional. |
| DASH-04 | P0 | Task dapat difilter berdasarkan status dan prioritas. |
| DASH-05 | P1 | Agenda mingguan atau kalender. |
| DASH-06 | P1 | Aktivitas terbaru yang relevan. |

### 5.2 Project Command Center
| ID | Prioritas | Persyaratan |
|---|---|---|
| PROJ-01 | P0 | Membuat, mengedit, mengarsipkan, dan menghapus proyek. |
| PROJ-02 | P0 | Proyek memiliki nama, ringkasan, status, tanggal opsional, dan catatan. |
| PROJ-03 | P0 | Task dan catatan dapat dihubungkan ke proyek. |
| PROJ-04 | P1 | Catatan milestone, bug, keputusan teknis, dan risiko. |
| PROJ-05 | P2 | Integrasi GitHub setelah kebutuhan dan izin ditentukan. |

### 5.3 Multi-AI Workspace
| ID | Prioritas | Persyaratan |
|---|---|---|
| AI-01 | P0 | UI chat konsisten dan tidak bergantung pada satu provider. |
| AI-02 | P0 | Percakapan yang dibuat di Nexora disimpan sebagai riwayat Nexora. |
| AI-03 | P0 | Membuat percakapan baru, mengganti judul, membuka riwayat, dan menghapus percakapan. |
| AI-04 | P0 | Provider/model selector hanya menampilkan opsi yang benar-benar tersedia. |
| AI-05 | P0 | Koneksi provider menggunakan mekanisme resmi dan terdokumentasi. |
| AI-06 | P0 | Integrasi belum terverifikasi harus berstatus belum tersedia. |
| AI-07 | P0 | Tidak ada fallback diam-diam ke API berbayar; harus ada konfigurasi dan persetujuan eksplisit. |
| AI-08 | P0 | Loading, error, batasan, dan retry ditangani dengan jelas. |
| AI-09 | P1 | Pengguna memilih apakah konteks memory/proyek disertakan. |
| AI-10 | P1 | Pengguna dapat meninjau konteks yang akan dikirim jika konteks tambahan digunakan. |

### 5.4 Personal AI Memory
| ID | Prioritas | Persyaratan |
|---|---|---|
| MEM-01 | P0 | CRUD item memori. |
| MEM-02 | P0 | Memori memiliki judul, isi, kategori, timestamp, dan tag opsional. |
| MEM-03 | P0 | Pencarian teks pada memori. |
| MEM-04 | P0 | Perubahan memori harus mengikuti kontrol yang disepakati, tidak diam-diam. |
| MEM-05 | P0 | UI menjelaskan memori Nexora terpisah dari memori native ChatGPT/Claude. |
| MEM-06 | P1 | Menghubungkan memori ke proyek dan percakapan. |
| MEM-07 | P1 | Memilih memori tertentu untuk konteks percakapan. |
| MEM-08 | P1 | Ekspor dan penghapusan data memori. |

### 5.5 Learning OS
| ID | Prioritas | Persyaratan |
|---|---|---|
| LEARN-01 | P1 | Upload PDF dengan batas ukuran yang ditetapkan aplikasi. |
| LEARN-02 | P1 | Metadata dokumen dan status pemrosesan terlihat. |
| LEARN-03 | P1 | Membuat ringkasan melalui provider aktif dan diizinkan. |
| LEARN-04 | P1 | Membuat kuis dan flashcard dari materi terpilih. |
| LEARN-05 | P1 | Hasil generasi dapat ditinjau dan diedit sebelum disimpan. |
| LEARN-06 | P2 | Pelacakan progres dan pengulangan terjadwal. |

### 5.6 Settings
| ID | Prioritas | Persyaratan |
|---|---|---|
| SET-01 | P0 | Status integrasi provider terlihat. |
| SET-02 | P0 | Preferensi tema dan workspace dapat diatur. |
| SET-03 | P0 | Secret tidak ditampilkan ulang setelah disimpan. |
| SET-04 | P0 | Pengguna dapat menghapus atau mengekspor data sesuai kemampuan implementasi. |
| SET-05 | P1 | Informasi penggunaan dan batas provider ditampilkan jika tersedia resmi. |

## 6. Integrasi AI: Batasan Kritis
Integrasi provider adalah risiko teknis utama dan harus divalidasi sebelum arsitektur dikunci.

Aturan:
1. Jangan mengasumsikan login akun ChatGPT/Claude memberi akses ke riwayat native, memori native, atau kuota langganan.
2. Jangan gunakan scraping, endpoint privat, cookie session hasil ekstraksi, atau browser automation untuk melewati mekanisme resmi.
3. Jangan mengklaim Claude Team Standard atau paket ChatGPT dapat dipakai melalui aplikasi web pihak ketiga sebelum memeriksa dokumentasi dan ketentuan resmi terbaru.
4. Jangan menggunakan API berbayar sebagai fallback tanpa persetujuan eksplisit.
5. Jangan menyimpan token dalam plaintext atau mengirim token ke browser jika harus tetap berada di server.
6. Jika integrasi tidak didukung secara resmi, tampilkan “Belum tersedia” dan dokumentasikan alasannya.
7. Pisahkan adapter provider dari UI dan business logic.
8. Uji sukses, autentikasi gagal, rate limit, dan pencabutan akses.

### Checklist feasibility
Untuk setiap provider, catat mekanisme resmi, kelayakan pada aplikasi web yang di-host, izin dan batasan, penyimpanan token, rate limit, potensi biaya, hasil uji, tanggal verifikasi, dan tautan dokumentasi resmi.

**Kriteria lulus:** provider hanya diaktifkan setelah mekanisme resminya terbukti dapat digunakan dalam deployment Nexora dan memenuhi ketentuan layanan. Jika tidak, provider tetap nonaktif atau gunakan opsi resmi lain setelah disetujui pengguna.

## 7. Arsitektur dan Stack
### Stack awal
- Frontend: Next.js, React, TypeScript.
- Styling: Tailwind CSS.
- Backend: Next.js Route Handlers/server-side functions.
- Database: Supabase PostgreSQL.
- Auth: Supabase Auth atau mekanisme yang dipilih setelah evaluasi.
- Storage: Supabase Storage.
- Deployment: Vercel atau platform kompatibel.
- Testing: unit, integration, dan end-to-end tests untuk alur penting.

### Prinsip arsitektur
- Satu aplikasi modular, bukan microservices untuk MVP.
- Jangan memanggil provider langsung dari client jika kredensial harus dilindungi server.
- Pisahkan domain logic dari integrasi eksternal.
- Gunakan provider interface/adapter.
- Validasi input di server.
- Terapkan authorization dan RLS jika Supabase digunakan.
- Gunakan migrasi database yang terlacak.
- Tangani error secara konsisten.
- Jangan commit secret ke repository.

### Struktur folder usulan
```text
src/
  app/(app)/dashboard/
  app/(app)/tasks/
  app/(app)/projects/
  app/(app)/ai/
  app/(app)/memory/
  app/(app)/learning/
  app/(app)/settings/
  app/api/
  components/{layout,ui,dashboard,tasks,projects,ai,memory,learning}/
  features/{tasks,projects,conversations,memory,learning,providers}/
  lib/{auth,db,validation,security}/
  types/
supabase/migrations/
tests/{unit,integration,e2e}/
docs/{PRD.md,ARCHITECTURE.md,DECISIONS.md}
```

## 8. Model Data Awal
Entitas konseptual:
- **profiles:** preferensi dan profil.
- **tasks:** judul, deskripsi, status, prioritas, due date, project ID.
- **projects:** nama, deskripsi, status, metadata waktu.
- **project_notes:** catatan, keputusan teknis, risiko, referensi.
- **conversations:** judul, provider, model, timestamps.
- **messages:** conversation ID, role, content, metadata, timestamp.
- **memory_items:** title, content, category, tags, timestamps.
- **documents:** nama file, storage path, MIME type, ukuran, status pemrosesan.
- **learning_items:** ringkasan, kuis, flashcard, relasi dokumen.
- **provider_connections:** metadata status; secret ditangani melalui mekanisme aman.

Aturan data:
- Setiap data personal harus memiliki ownership jelas.
- Server memeriksa izin untuk setiap operasi.
- Terapkan RLS pada tabel yang terekspos lewat Supabase client.
- Jangan simpan credential di tabel generik atau log.
- Validasi tipe dan ukuran file.
- Penghapusan data harus mempertimbangkan relasi dan file terkait.

## 9. Information Architecture
Navigasi utama:
1. Dashboard
2. Tasks
3. Projects
4. AI Workspace
5. Memory
6. Learning
7. Settings

Dashboard menampilkan task prioritas, deadline, proyek terbaru, aktivitas, dan akses cepat ke AI. AI Workspace menampilkan riwayat, area pesan, composer, pilihan provider/model yang tersedia, status koneksi, dan kontrol konteks. Memory menampilkan pencarian, filter, detail, dan aksi CRUD. Projects menampilkan daftar proyek, status, task, catatan, serta milestone saat fitur tersedia.

## 10. Arah UI/UX
Arah visual: minimal, presisi, profesional, tenang, dan berfokus pada konten.

Referensi pola desain:
- **Linear:** hirarki informasi, navigasi, task, status, project workflow.
- **Raycast:** pencarian global, command palette, interaksi cepat.
- **Notion:** catatan dan pengetahuan.
- **ChatGPT:** kenyamanan membaca percakapan dan composer.
- **Vercel:** status teknis dan pengaturan integrasi.

Referensi digunakan untuk mempelajari pola, bukan menyalin identitas atau aset.

Aturan:
- Desktop-first, responsif untuk tablet dan ponsel.
- Sidebar ringkas dan konsisten.
- Tipografi mudah dibaca dan hierarki visual jelas.
- Dark theme sebagai opsi awal utama; light theme dapat ditambahkan.
- Aksen warna hemat; hindari glassmorphism/gradient berlebihan.
- Animasi harus memberi feedback atau orientasi, bukan menghambat.
- Setiap halaman memiliki loading, empty, error, dan success states.
- Form menampilkan validasi dan pesan yang dapat ditindaklanjuti.
- Perhatikan kontras, keyboard focus, label, dan aksesibilitas dasar.

Komponen inti: app sidebar, header, global search/command palette, task row, project list/card, conversation list, chat message/composer, provider status, memory editor, confirmation dialog, toast, loading skeleton, dan empty state.

## 11. Alur Pengguna dan Acceptance Criteria
### A. Mengelola task
1. Buka Dashboard.
2. Lihat task dan deadline.
3. Buat atau buka task.
4. Atur prioritas, status, due date.
5. Data tersimpan dan tampilan diperbarui.

Kriteria: task bertahan setelah reload; validasi berjalan; data pengguna lain tidak dapat diakses; status konsisten di semua tampilan.

### B. Melanjutkan proyek
1. Buka Projects dan pilih proyek.
2. Baca ringkasan, catatan, dan task.
3. Tambahkan keputusan/catatan.
4. Temukan kembali catatan lewat pencarian.

Kriteria: relasi benar, operasi mengikuti izin, empty state jelas.

### C. Memulai percakapan AI
1. Buka AI Workspace dan buat percakapan.
2. Pilih provider/model yang aktif.
3. Tulis dan kirim pesan.
4. Request diproses melalui server.
5. Respons dan metadata relevan disimpan ke riwayat Nexora.

Kriteria: provider belum diverifikasi tidak bisa dipilih; error auth/rate limit ditangani; tidak ada fallback berbayar diam-diam; riwayat tidak diklaim sebagai riwayat native provider.

### D. Menggunakan memory
1. Pilih item memory untuk konteks bila fitur tersedia.
2. Tinjau konteks yang akan dikirim bila didukung UI.
3. Konfirmasi dan kirim.
4. Data tetap dapat diedit atau dihapus.

Kriteria: memory tidak dikirim tanpa kontrol yang sesuai; memory Nexora tetap terpisah dari memory native provider.

### E. Mengolah materi
1. Upload PDF.
2. Validasi dan tampilkan status pemrosesan.
3. Minta ringkasan/latihan melalui provider yang aktif.
4. Tinjau, edit, simpan, atau hapus hasil.

Kriteria: file tak didukung ditolak dengan jelas; kegagalan tidak tampak sebagai sukses; hasil dapat ditinjau sebelum disimpan.

## 12. Keamanan, Privasi, dan Reliabilitas
- Gunakan autentikasi dan otorisasi server-side.
- Terapkan RLS untuk data personal bila Supabase digunakan.
- Simpan secret melalui environment variables/secret manager.
- Jangan commit `.env` atau credential.
- Jangan log token, password, atau isi sensitif.
- Validasi semua input di server.
- Lindungi endpoint dari akses tanpa autentikasi.
- Batasi ukuran dan tipe file.
- Konfirmasi tindakan destruktif.
- Sediakan mekanisme penghapusan data yang dapat diuji.
- Error tidak boleh membocorkan detail internal.
- Jangan mengirim dokumen, catatan, atau memory ke provider kecuali diperlukan dan sesuai pilihan pengguna.

## 13. Non-Functional Requirements
| ID | Kategori | Persyaratan |
|---|---|---|
| NFR-01 | Responsiveness | UI dapat digunakan di desktop, tablet, dan ponsel. |
| NFR-02 | Performance | Navigasi dan operasi umum responsif; hindari request berulang. |
| NFR-03 | Reliability | Kegagalan provider tidak merusak seluruh aplikasi. |
| NFR-04 | Security | Otorisasi server-side dan pemisahan data pengguna. |
| NFR-05 | Maintainability | Domain, komponen, tipe, dan adapter terpisah secara masuk akal. |
| NFR-06 | Accessibility | Form, fokus keyboard, label, dan kontras mengikuti praktik dasar. |
| NFR-07 | Observability | Error dapat ditelusuri tanpa mencatat secret atau data pribadi yang tidak perlu. |
| NFR-08 | Data integrity | Operasi database menjaga relasi dan status konsisten. |

## 14. Acceptance Criteria MVP
MVP dianggap siap jika:
1. Pengguna dapat masuk dan data personal terlindungi.
2. Dashboard menampilkan task dan proyek tersimpan.
3. Task dapat dibuat, diedit, diselesaikan, dan dihapus.
4. Proyek dapat dibuat dan dihubungkan ke task/catatan.
5. Memory dapat dibuat, dicari, diedit, dan dihapus.
6. Riwayat percakapan Nexora tersimpan dan dapat dibuka.
7. Provider aktif telah diverifikasi melalui mekanisme resmi.
8. Provider yang tidak layak diintegrasikan dinonaktifkan secara eksplisit.
9. Tidak ada fallback berbayar diam-diam.
10. Secret tidak terpapar ke client, repository, atau log.
11. Halaman utama memiliki loading, empty, dan error states.
12. Tes otomatis mencakup operasi data, authorization, dan alur chat yang didukung.
13. Aplikasi diuji pada ukuran layar utama dan deployment target.

## 15. Roadmap
### Phase 0: Feasibility
- Verifikasi opsi integrasi resmi OpenAI dan Anthropic.
- Verifikasi kelayakan paket yang dimiliki pengguna, termasuk Claude Team Standard, untuk skenario aplikasi web yang direncanakan.
- Tetapkan auth, hosting, batas upload, dan penyimpanan secret.
- Catat keputusan arsitektur.
- Jangan membangun provider berdasarkan asumsi.

### Phase 1: Foundation
- Setup Next.js, TypeScript, Tailwind.
- Setup database, auth, dan migrasi.
- Bangun layout, dashboard, task, projects, notes.
- Implementasikan authorization/RLS.
- Tambahkan tes dasar.

### Phase 2: Memory dan chat milik Nexora
- CRUD dan search memory.
- Schema conversation/message.
- Riwayat chat dan composer.
- Provider adapter interface.
- Provider mock untuk development jika integrasi belum tervalidasi.

### Phase 3: Integrasi AI tervalidasi
- Implementasikan adapter resmi yang lulus feasibility.
- Tangani auth, rate limit, error, status koneksi.
- Tambahkan kontrol konteks dan transparansi biaya.
- Tidak ada fallback berbayar tanpa persetujuan.

### Phase 4: Learning OS
- PDF upload dan validasi.
- Status pemrosesan.
- Ringkasan, kuis, flashcard.
- Review/edit hasil.
- Tes upload dan penghapusan data.

### Phase 5: Project Command Center lanjutan
- Milestone, bug, keputusan teknis, timeline.
- Integrasi GitHub jika diperlukan dan diotorisasi.
- Penyempurnaan pencarian global dan command palette.

## 16. Strategi Pengujian
- Unit tests untuk validasi, domain logic, format data, adapter.
- Integration tests untuk database, ownership, RLS, endpoint server.
- End-to-end tests untuk login, CRUD task, proyek, memory, dan chat.
- Provider tests untuk sukses, error, rate limit, token invalid/revoked; gunakan mock untuk tes otomatis.
- Security checks untuk secret exposure, authorization bypass, upload validation, dan data leakage.
- Manual QA desktop/mobile, keyboard navigation, dan semua state UI.

Jangan menganggap fitur selesai hanya karena halaman tampil. Tes harus membuktikan alur data, izin akses, dan perilaku error.

## 17. Risiko dan Mitigasi
| Risiko | Dampak | Mitigasi |
|---|---|---|
| Langganan AI tidak dapat dipakai dalam integrasi | Multi-AI tidak bekerja sesuai harapan | Validasi Phase 0; adapter dan status UI yang jujur |
| Perubahan ketentuan provider | Integrasi dibatasi | Mekanisme resmi, tanggal verifikasi, adapter terisolasi |
| Scope terlalu luas | MVP tertunda | Kerjakan P0 dahulu; fitur lanjutan bertahap |
| Kebocoran token/data | Risiko keamanan | Server-side secrets, RLS, validasi, redaksi log |
| Memory salah | Konteks menjadi keliru | Memory dapat ditinjau, diedit, dan dihapus |
| UI terlalu ramai | Sulit dipakai | Prioritaskan hierarki informasi dan feedback fungsional |
| Ketergantungan satu provider | Risiko perubahan akses/biaya | Provider abstraction dan status eksplisit |

## 18. Pertanyaan Terbuka
1. Mekanisme resmi apa yang dapat digunakan untuk OpenAI pada aplikasi web Nexora yang di-host?
2. Apakah paket ChatGPT pengguna mendukung skenario integrasi ini?
3. Apakah Claude Team Standard dapat digunakan melalui mekanisme resmi pada skenario yang direncanakan, dan apa batasannya?
4. Apakah aplikasi tetap single-user atau perlu multi-user di masa depan?
5. Apakah dark theme menjadi default permanen?
6. Berapa batas ukuran PDF dan masa penyimpanannya?
7. Apakah PostgreSQL full-text search cukup untuk memory pada MVP?
8. Apakah integrasi GitHub dibutuhkan sejak awal?

Jawaban harus dicatat dalam dokumen keputusan, bukan hanya percakapan.

## 19. Instruksi untuk Claude Code dan Codex
1. Baca PRD dan dokumentasi arsitektur/keputusan sebelum mengubah kode.
2. Periksa repository dan implementasi aktual.
3. Pecah pekerjaan menjadi task kecil dengan acceptance criteria.
4. Catat asumsi dan ketidakpastian sebelum perubahan besar.
5. Jangan implementasikan integrasi AI yang belum lolos feasibility.
6. Jangan gunakan scraping, endpoint privat, atau browser automation untuk melewati batasan provider.
7. Jangan menambahkan API berbayar atau fallback tanpa persetujuan eksplisit.
8. Jangan menaruh secret di source code atau client bundle.
9. Gunakan tipe jelas, validasi server-side, dan error handling.
10. Buat/perbarui tes dan jalankan lint, typecheck, serta tes relevan.
11. Perbarui dokumentasi dan catat keputusan arsitektur.
12. Jangan menganggap mockup UI sebagai fitur selesai jika alur data belum bekerja.
13. Jangan memperluas scope tanpa menjelaskan dampak roadmap.
14. Jika PRD bertentangan dengan fakta teknis atau kebijakan provider terbaru, hentikan bagian itu, dokumentasikan konflik, dan minta keputusan.

### Format laporan task
- Tujuan
- Perubahan yang dilakukan
- File yang berubah
- Tes yang dijalankan dan hasilnya
- Keterbatasan atau risiko
- Keputusan yang masih diperlukan

## 20. Definition of Done
Fitur selesai jika acceptance criteria terpenuhi; alur UI dan data bekerja; validasi, authorization, dan error states diterapkan; tes relevan lulus; tidak ada secret/data sensitif bocor; dokumentasi diperbarui; klaim kemampuan sesuai kenyataan; dan perubahan dapat dijalankan ulang secara reproducible.

**Prinsip penutup:** bangun fondasi yang dapat dipercaya terlebih dahulu. Nexora harus menjadi workspace yang benar-benar berguna, bukan demo dengan banyak halaman dan integrasi yang hanya terlihat bekerja.

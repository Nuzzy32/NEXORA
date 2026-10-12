# Project Roadmap

Roadmap ini berorientasi pada risiko dan dependensi, bukan tanggal kalender yang belum disepakati.

## Phase 0 — Discovery and feasibility
**Tujuan:** menghindari desain yang bergantung pada integrasi AI yang tidak bisa digunakan.

Deliverables:
- Project brief dan scope.
- Checklist kelayakan OpenAI dan Anthropic.
- Proof of concept terpisah untuk jalur resmi yang tersedia.
- Keputusan integrasi tertulis beserta sumber.
- Daftar risiko dan keputusan yang belum selesai.

Exit criteria:
- Jalur provider yang layak diketahui, atau integrasi ditandai belum tersedia.
- Tidak ada asumsi bahwa login otomatis memberi akses kuota.

## Phase 1 — Application foundation
Deliverables:
- Next.js + TypeScript + Tailwind.
- Supabase setup dan migration awal.
- Authentication aplikasi.
- Dashboard responsif.
- CRUD task, project, dan notes.
- Validasi input, loading state, error state.
- Aturan akses data dan RLS.

Exit criteria:
- Data tersimpan dan dapat dibuka kembali.
- Akses pengguna dibatasi dengan benar.
- Aplikasi dapat di-deploy.

## Phase 2 — Memory and local chat foundation
Deliverables:
- Conversation/message schema.
- Riwayat chat lokal.
- Memori yang dapat dibuat, diedit, dicari, dan dihapus.
- Context builder yang hanya memasukkan memori relevan.
- Referensi sumber memori.
- Pengaturan privasi dan ekspor data dasar.

Exit criteria:
- Chat dan memori lokal berjalan meskipun provider belum terhubung.
- Pengguna bisa melihat konteks yang akan dikirim ke AI.

## Phase 3 — Verified AI integrations
Deliverables:
- Provider adapter yang telah lolos verifikasi.
- Connection status dan error handling.
- Streaming jika didukung.
- Pengelolaan token/credential yang aman.
- Persetujuan eksplisit untuk jalur berbayar.
- Dokumentasi batasan setiap integrasi.

Exit criteria:
- Provider aktif benar-benar bekerja melalui jalur yang diizinkan.
- Tidak ada fallback billing diam-diam.

## Phase 4 — Learning OS
Deliverables:
- Upload PDF.
- Pengelolaan dokumen.
- Ringkasan dan tanya-jawab berbasis dokumen.
- Flashcard dan kuis dasar.
- Progres belajar.

Exit criteria:
- Jawaban terkait dokumen menyertakan rujukan halaman/segmen jika tersedia.
- Dokumen pribadi tidak dikirim ke provider tanpa alur yang jelas.

## Phase 5 — Project Command Center
Deliverables:
- Milestone dan status proyek.
- Keputusan arsitektur.
- Bug/task teknis.
- Ringkasan progres dan next actions.
- GitHub integration jika layak.

Exit criteria:
- Pengguna dapat memahami status proyek dan langkah berikutnya dari satu halaman.

## Prinsip prioritas
Jika integrasi AI terhambat, lanjutkan bagian produk yang tidak bergantung pada provider. Jangan menunda seluruh aplikasi hanya karena satu integrasi belum tersedia.

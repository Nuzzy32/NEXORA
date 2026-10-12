# Project Brief — Personal AI OS

**Nama kerja:** Personal AI OS  
**Jenis:** Aplikasi web pribadi lintas perangkat  
**Pengguna:** Satu pengguna utama  
**Status:** Discovery dan perencanaan awal

## Ringkasan
Personal AI OS adalah workspace pribadi yang menghubungkan pengelolaan aktivitas, memori pengetahuan, pembelajaran, dan pengembangan proyek dengan bantuan beberapa layanan AI. Aplikasi memiliki database dan riwayat percakapannya sendiri, sehingga informasi penting tidak bergantung pada riwayat native ChatGPT atau Claude.

## Masalah yang ingin diselesaikan
- Konteks terpisah antara beberapa layanan AI.
- Catatan, tugas, deadline, materi belajar, dan progres proyek tersebar.
- Pengguna perlu mengulang konteks yang sama dalam percakapan baru.
- Hasil diskusi AI sering tidak terhubung dengan tugas atau langkah lanjutan.
- Integrasi AI dapat memunculkan biaya API tambahan jika tidak direncanakan.

## Visi
Membangun satu pusat kendali yang membantu pengguna mengingat konteks, mengatur prioritas, belajar lebih efektif, dan menggerakkan proyek dari ide menuju implementasi.

## Modul produk
1. **Personal AI OS:** dashboard, tugas, deadline, prioritas, agenda.
2. **Personal AI Memory:** catatan, memori proyek, ringkasan terpilih, pencarian.
3. **Multi-AI Workspace:** chat terpadu dengan provider yang tersedia dan riwayat lokal.
4. **Learning OS:** PDF, ringkasan, kuis, flashcard, progres belajar.
5. **Project Command Center:** proyek, milestone, tugas teknis, bug, keputusan arsitektur.
6. **Integrasi GitHub:** pengembangan lanjutan, bukan syarat MVP pertama.

## Strategi integrasi AI
Prioritaskan langganan ChatGPT dan Claude yang sudah dimiliki pengguna hanya melalui mekanisme resmi yang didukung provider dan sesuai dengan paket akun. Login/autentikasi saja tidak menjamin bahwa aplikasi pihak ketiga dapat memakai kuota langganan.

Jangan menganggap aplikasi dapat membaca atau menulis riwayat percakapan native ChatGPT atau Claude.ai. Riwayat Personal AI OS disimpan dalam database milik aplikasi.

Jika jalur langganan tidak tersedia atau tidak memenuhi kebutuhan:
- jelaskan keterbatasannya;
- jangan memakai scraping, endpoint privat, atau otomasi browser yang rapuh;
- jangan beralih ke API berbayar tanpa persetujuan eksplisit.

## Batasan
- Penggunaan pribadi, bukan SaaS publik.
- Web responsif, bukan aplikasi native pada tahap awal.
- Tidak ada multi-user/team collaboration di MVP.
- Tidak ada tindakan eksternal otonom tanpa kontrol pengguna.
- Tidak ada tagihan API yang tidak disetujui.

## Kriteria keberhasilan awal
- Data tugas, catatan, dan proyek tersimpan persisten.
- Riwayat chat lokal bisa dibuka kembali.
- AI dapat menerima konteks yang dipilih dari memori lokal.
- Status provider dan kegagalan koneksi ditampilkan secara jujur.
- Tidak ada penggunaan API berbayar tanpa persetujuan.

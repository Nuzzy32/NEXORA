# Product Vision, Principles, and Scope

## Product vision
Personal AI OS menjadi workspace pribadi yang menghubungkan apa yang perlu dilakukan, apa yang sedang dipelajari, apa yang sudah diketahui, dan apa yang sedang dibangun.

## Prinsip produk
1. **User owns the data:** data inti disimpan dalam sistem milik aplikasi dan dapat diekspor.
2. **Memory is inspectable:** pengguna dapat melihat, mengedit, dan menghapus memori.
3. **No hidden costs:** tidak ada perpindahan diam-diam ke API berbayar.
4. **Honest integrations:** UI membedakan fitur yang tersedia, belum didukung, dan gagal.
5. **Small reliable core:** lebih baik beberapa alur stabil daripada banyak fitur setengah jadi.
6. **Human control:** tindakan penting dan koneksi eksternal membutuhkan kendali pengguna.
7. **Portable web experience:** UI harus berfungsi di desktop dan layar mobile.

## Prioritas fitur

### P0 — fondasi
- Dashboard sederhana.
- Task CRUD, status, prioritas, tanggal jatuh tempo.
- Proyek dan catatan.
- Pencarian dasar.
- Database dan autentikasi aplikasi.
- Chat lokal dengan struktur riwayat percakapan.
- Kerangka adapter provider dan halaman status integrasi.
- Memori yang dipilih pengguna dapat ditambahkan ke konteks chat.

### P1 — pembelajaran dan proyek
- Upload PDF dan penyimpanan dokumen.
- Ringkasan dokumen berbasis AI setelah provider tersedia.
- Kuis dan flashcard dasar.
- Milestone proyek, keputusan teknis, dan ringkasan progres.

### P2 — peningkatan
- Integrasi GitHub.
- Pencarian semantik/vector.
- Pengingat dan kalender.
- Ringkasan aktivitas harian otomatis.
- Sinkronisasi atau ekspor tambahan jika diperlukan.

## Bukan target MVP
- Menyalin atau menyinkronkan semua riwayat native ChatGPT dan Claude.
- Membuat model AI sendiri.
- Aplikasi native iOS/Android.
- Sistem multi-tenant atau billing pelanggan.
- Agent yang melakukan tindakan eksternal tanpa persetujuan.
- Integrasi tidak resmi melalui scraping atau endpoint privat.

## Definisi MVP yang selesai
MVP pertama selesai saat pengguna bisa mengelola tugas, proyek, dan catatan dalam satu aplikasi, membuka kembali percakapan lokal, serta mengirim konteks terpilih ke provider AI yang benar-benar sudah diverifikasi kompatibilitasnya. Fitur AI yang belum didukung tidak boleh ditampilkan seolah-olah sudah aktif.

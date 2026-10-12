# Coding-Agent Rules — Claude Code and Codex

Dokumen ini menjadi instruksi kerja bersama untuk coding agents. Tambahkan ke `CLAUDE.md` atau `AGENTS.md` setelah disesuaikan dengan struktur repo.

## Project context
Bangun Personal AI OS sebagai aplikasi web pribadi responsif. Prioritasnya adalah reliability, data ownership, security, dan integrasi AI yang jujur.

## Rules
1. Baca `README.md` dan semua dokumen di `docs/` sebelum mengubah arsitektur.
2. Jangan menganggap integrasi subscription-based OpenAI atau Anthropic tersedia sebelum proof of concept berhasil dan dokumentasi resmi diperiksa.
3. Jangan memakai scraping, endpoint privat/undocumented, browser automation yang rapuh, atau meminta password akun provider.
4. Jangan membuat fallback ke API berbayar secara otomatis.
5. Jangan mengklaim sinkronisasi riwayat native ChatGPT/Claude kecuali provider secara resmi menyediakan kemampuan tersebut dan implementasinya telah diverifikasi.
6. Semua rahasia harus berada di environment variables/secret manager dan tidak boleh masuk Git.
7. Terapkan validasi server-side, authorization, RLS, dan penanganan error.
8. Jangan mengirim data pribadi ke AI tanpa jalur UI/konfigurasi yang jelas.
9. Hindari menyimpan semua percakapan otomatis sebagai memori permanen. Sediakan mekanisme persetujuan/edit.
10. Gunakan TypeScript secara ketat; hindari `any` kecuali benar-benar beralasan.
11. Buat migration untuk perubahan skema database.
12. Sertakan loading, empty, success, dan error states pada fitur interaktif.
13. UI harus responsif dan aksesibel; jangan mengorbankan usability mobile.
14. Jangan menambah dependency besar tanpa alasan yang jelas.
15. Jangan membangun semua modul sekaligus. Ikuti roadmap dan selesaikan satu alur end-to-end sebelum lanjut.

## Workflow untuk setiap tugas
1. Periksa struktur repo dan dokumen terkait.
2. Nyatakan rencana singkat dan file yang akan diubah.
3. Implementasikan perubahan sekecil mungkin yang menyelesaikan tugas.
4. Jalankan lint, typecheck, dan test yang tersedia.
5. Laporkan perubahan, hasil test, keterbatasan, serta pekerjaan yang belum selesai.
6. Jangan mengklaim test berhasil jika belum benar-benar dijalankan.

## Definition of done
- Fitur bekerja dalam alur utama.
- Validasi dan error state tersedia.
- Tidak ada secret yang bocor.
- Perubahan skema memiliki migration.
- Test/check yang relevan dijalankan atau keterbatasannya dijelaskan.
- Dokumentasi diperbarui jika perilaku atau arsitektur berubah.

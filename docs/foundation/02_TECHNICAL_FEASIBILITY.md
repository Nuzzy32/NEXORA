# Technical Feasibility Checklist

Dokumen ini dibuat sebelum PRD karena integrasi langganan AI adalah risiko teknis utama proyek.

## A. OpenAI / ChatGPT
- Paket apa yang benar-benar akan digunakan: Free, Go, Plus, atau Pro?
- Apakah aplikasi pribadi ini memenuhi syarat menggunakan mekanisme resmi Sign in with ChatGPT atau fitur penggunaan paket di aplikasi pihak ketiga?
- Apakah mekanisme tersebut tersedia untuk aplikasi custom yang dikembangkan sendiri, atau hanya untuk aplikasi/partner tertentu?
- Apakah penggunaan model yang dibutuhkan dan alur OAuth yang dibutuhkan diizinkan oleh dokumentasi saat implementasi?
- Apa batas penggunaan, batas laju, persyaratan review, serta pembatasan wilayah/akun?
- Data apa yang dapat diakses? Jangan menganggap autentikasi memberikan akses ke riwayat atau memori ChatGPT.

## B. Anthropic / Claude
- Apa ketentuan terkini untuk Claude Team Standard yang dimiliki pengguna?
- Apakah penggunaan Claude Agent SDK atau jalur subscription-based yang relevan diizinkan untuk aplikasi pribadi ini?
- Apakah fitur tersebut dapat dijalankan dari backend web app, atau memiliki batasan penggunaan/lingkungan?
- Apakah diperlukan login interaktif, CLI lokal, atau mekanisme lain yang tidak cocok untuk deployment web?
- Bagaimana batas penggunaan, autentikasi, masa berlaku, dan ketentuan organisasi/team?
- Apakah ada batasan untuk penggunaan di aplikasi pihak ketiga atau deployment hosted?

## C. Operasional dan keamanan
- Apakah koneksi berjalan di server, perangkat lokal, atau kombinasi keduanya?
- Bagaimana token disimpan, diperbarui, dicabut, dan dihapus?
- Apakah credential dilarang masuk ke log, browser storage, repo, atau screenshot?
- Bagaimana menangani expired token, rate limit, provider outage, dan kuota habis?
- Bagaimana memberi tahu pengguna sebelum menggunakan jalur API berbayar?
- Apakah semua data yang dikirim ke provider ditampilkan atau dikonfirmasi secara memadai?

## Prosedur verifikasi
1. Baca dokumentasi resmi OpenAI dan Anthropic pada tanggal implementasi.
2. Catat nama fitur resmi, paket yang memenuhi syarat, batasan, dan URL sumber.
3. Buat proof of concept minimal secara terpisah dari aplikasi utama.
4. Uji autentikasi, satu permintaan, streaming bila didukung, error, dan pencabutan koneksi.
5. Verifikasi apakah solusi dapat di-host di web app, bukan hanya berjalan di komputer developer.
6. Simpan hasil uji dan keputusan dalam `docs/decisions/`.
7. Baru setelah itu tetapkan integrasi yang masuk MVP.

## Kriteria lulus
Integrasi dianggap layak jika:
- jalur tersebut resmi dan sesuai ketentuan provider;
- paket akun pengguna memenuhi syarat;
- dapat dijalankan pada lingkungan deployment yang direncanakan;
- batas penggunaan dan status koneksi dapat ditangani;
- tidak memerlukan scraping atau endpoint privat;
- tidak memicu API berbayar tanpa persetujuan.

## Jika tidak lulus
- Jangan memalsukan tombol “Connect”.
- Jangan membangun ketergantungan arsitektur pada integrasi yang belum terbukti.
- Tetap bangun dashboard, task, proyek, catatan, database, dan riwayat chat lokal.
- Sediakan adapter provider yang dapat diaktifkan kemudian.
- Tampilkan status integrasi sebagai “Belum tersedia / menunggu verifikasi”.
- Opsi API berbayar hanya dapat ditambahkan setelah pengguna menyetujuinya secara eksplisit.

## Catatan penting
Ketersediaan fitur provider dapat berubah. Klaim bahwa sebuah paket dapat digunakan tidak sama dengan jaminan bahwa setiap aplikasi custom, server hosted, atau skenario OAuth diperbolehkan.

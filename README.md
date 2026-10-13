# Nexora

Personal intelligence workspace — tugas, proyek, memory, chat AI, dan belajar dalam satu aplikasi web.

- Spesifikasi: [`docs/PRD.md`](docs/PRD.md)
- Keputusan: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Aturan coding agent: [`CLAUDE.md`](CLAUDE.md)
- Dokumen awal (historis): [`docs/foundation/`](docs/foundation/)

## Status
Phase 1 (foundation) berjalan: login, dashboard, CRUD task, proyek (daftar, detail, arsip), dan catatan proyek dengan pencarian. Memory (CRUD, pencarian, sematkan), AI Workspace (riwayat percakapan, konteks memory/proyek pilihan eksplisit), sinkron tugas e-learning UNAIR (iCal), brief harian (Haiku 5.5, opt-in), dan Settings (status integrasi, ekspor JSON, hapus data) sudah ada. Chat AI memakai Claude Haiku 5.5 / Sonnet 5.5 lewat Anthropic API berbayar, hanya setelah diaktifkan di Settings (D-027); OpenAI belum tersedia. Learning OS: unggah PDF (≤ 20 MB, Supabase Storage privat), ringkasan dari Claude yang ditinjau sebelum disimpan (D-028), dan flashcard manual dengan pengulangan Leitner (D-030). Dashboard punya aktivitas terbaru, proyek punya tab Timeline, dan tema terang tersedia (D-031). Chat AI saat ini dimatikan pemilik (D-029). Provider mock hanya di development. Desain mengikuti project Google Stitch (D-016).

## Setup
1. Buat project di [supabase.com](https://supabase.com). Di **Authentication → Sign In / Providers**, matikan *Allow new users to sign up* (aplikasi single-owner).
2. Buat akun pemilik: **Authentication → Users → Add user** (centang *Auto Confirm User*).
3. Terapkan migration:
   ```bash
   pnpm dlx supabase@latest login
   pnpm dlx supabase@latest link --project-ref <PROJECT_REF>
   pnpm dlx supabase@latest db push
   ```
4. `cp .env.example .env.local`, isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API). Jangan pakai secret/service_role key.
5. (Opsional) Tugas e-learning UNAIR: di Moodle buka Kalender → Impor atau ekspor kalender → Ekspor kalender → "Dapatkan URL kalender", lalu isi `ELEARNING_ICAL_URL` di `.env.local`. URL itu berisi token rahasia; jangan di-commit atau dibagikan. Sinkron lewat tombol di /tasks (D-017).
5b. (Opsional, setelah deploy ke Vercel) Sinkron e-learning harian otomatis: isi `CRON_SECRET` (`openssl rand -hex 32`), `OWNER_USER_ID` (Authentication → Users → User UID), dan `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API → secret key) sebagai Environment Variables Vercel, dan jalankan `supabase/migrations/20261012100000_service_role_sync_grants.sql`. `vercel.json` sudah menjadwalkannya tiap hari 05:00 WIB (D-024).
6b. Brief harian terjadwal: setelah menekan "Aktifkan brief harian" di Dashboard dan mengisi `ANTHROPIC_API_KEY` di Vercel, `vercel.json` menjadwalkan `/api/cron/brief` tiap hari 05:30 WIB (D-026). Tanpa persetujuan dan kunci, job tidak mengirim apa pun.
6. (Opsional, berbayar) Brief harian: isi `ANTHROPIC_API_KEY` (console.anthropic.com), lalu aktifkan dari kartu "Brief harian" di Dashboard. Model Haiku 5.5, biaya sub-sen per brief (D-018).
7. `pnpm install && pnpm dev`, buka http://localhost:3000.

## Perintah
`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test`

Tes integrasi RLS menjalankan migration asli di PGlite (Postgres in-process), jadi tidak butuh Docker atau akun Supabase.
# NEXORA

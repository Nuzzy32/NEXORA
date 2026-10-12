# NEXORA — instruksi untuk coding agent

Personal intelligence workspace (web responsif, satu pemilik). Sumber kebenaran: `docs/PRD.md`.
Keputusan arsitektur: `docs/DECISIONS.md`. Dokumen awal (konteks historis): `docs/foundation/`.

## Stack
Next.js (App Router) + TypeScript strict + Tailwind, Supabase (Postgres, Auth, Storage), deploy Vercel, pnpm.

## Next.js 16 (bukan versi yang biasa kamu kenal)
Baca dokumen terpasang di `node_modules/next/dist/docs/` sebelum menulis kode Next (lihat juga `AGENTS.md`). Yang sudah menggigit di proyek ini: `middleware` bernama `proxy`; `cacheComponents` aktif, jadi pembacaan sesi/`params`/`searchParams`/`usePathname()` wajib di dalam `<Suspense>`; `await io()` sebelum nilai tak stabil seperti `Date.now()`. Detailnya di `docs/DECISIONS.md` (D-008, D-012). `next build` saja tidak cukup: jalankan `next dev` dan cek log/konsol.

## Gaya visual (design system Stitch: "Precision Intelligence Workspace")
Sumber: project Google Stitch "PRD Design Implementation" (D-016). Token ada di `src/app/globals.css`; ganti identitas dengan mengubah token dan font di `src/app/layout.tsx`, bukan dengan menyebar warna ke komponen.
- **Warna:** slate gelap berlapis (`bg` #0b0d11, `surface`, `raised`, `overlay`, `line`), teks `fg`, `muted`, satu aksen cyan (`accent`) untuk aksi, indigo (`agent`/`info`) untuk hal AI/agen, emerald (`ok`) untuk selesai, amber (`warn`) peringatan, rose (`danger`) terlambat/galat. Jangan menambah hue baru. `faint` hanya untuk label kecil dan sudah lulus 4.5:1; jangan diterangkan lagi atau digelapkan.
- **Tipografi:** Geist untuk UI dan judul (`font-semibold`/`font-medium`, tracking negatif, tanpa italic), JetBrains Mono (`font-mono`) untuk data: tanggal, hitungan, label, keycap (`.kbd`). Tidak ada serif.
- **Bentuk:** radius 4px (`rounded-md`), 8px untuk modal/palette; grid 4/8px, padat. Lapisan dibedakan oleh warna permukaan dan hairline `border-line`, bukan bayangan (bayangan hanya untuk overlay).
- **Gerak:** animasi masuk lewat kelas `rise` dengan `--i` (bertahap), easing `var(--ease)`, hanya `transform` dan `opacity`; semuanya dimatikan oleh `prefers-reduced-motion`.
- **Isi layar:** teks dan angka di UI harus nyata. Salinan Stitch yang mengklaim "Verified", "encrypted", "zero retention", "local-only", versi, ID, atau statistik rekaan tidak boleh disalin (aturan 2, 4).
- Setiap layar baru wajib diperiksa di 375px (tanpa overflow horizontal) dan 1280px.

## Aturan
1. Baca `docs/PRD.md` dan `docs/DECISIONS.md` sebelum mengubah arsitektur. Jika PRD bertentangan dengan fakta teknis atau kebijakan provider, hentikan bagian itu, catat di DECISIONS.md, minta keputusan.
2. Jangan menganggap integrasi langganan OpenAI/Anthropic tersedia sebelum Phase 0 selesai dan dokumentasi resmi diperiksa. Tidak ada scraping, endpoint privat, browser automation, atau meminta password akun provider.
3. Tidak ada fallback otomatis ke API berbayar. Jalur berbayar hanya setelah persetujuan eksplisit pengguna.
4. Jangan mengklaim sinkronisasi riwayat/memori native ChatGPT atau Claude.
5. Secret hanya di env/secret manager. Jangan commit `.env*`, jangan log token, jangan taruh di `NEXT_PUBLIC_*` kecuali memang publik (publishable key). `service_role` tidak boleh ke client.
6. Validasi server-side, authorization, dan RLS di setiap tabel. Setiap tabel personal punya `user_id`.
7. Perubahan skema = file migration di `supabase/migrations/`. UPDATE policy wajib `USING` dan `WITH CHECK`. Jangan `SECURITY DEFINER` untuk mengatasi error permission.
8. Setiap fitur interaktif punya loading, empty, error, success state. UI responsif dan aksesibel.
9. TypeScript strict, hindari `any`. Jangan tambah dependency besar tanpa alasan.
10. Jangan kirim data pribadi ke AI tanpa jalur UI yang jelas. Memory tidak disimpan otomatis dari percakapan.
11. Satu alur end-to-end sebelum lanjut. Ikuti roadmap PRD §15; jangan perluas scope tanpa menjelaskan dampaknya.
12. Provider mock hanya untuk development dan berlabel jelas; tidak boleh muncul di production.

## Workflow tiap tugas
Periksa repo → rencana singkat + file yang diubah → perubahan sekecil mungkin → jalankan lint, typecheck, test → lapor (tujuan, perubahan, file, tes + hasil, keterbatasan, keputusan tertunda). Jangan klaim tes lulus jika belum dijalankan.

## Definition of done
Alur UI + data bekerja, validasi/authorization/error state ada, tes relevan lulus, tidak ada secret bocor, migration ada, dokumentasi diperbarui, klaim sesuai kenyataan.

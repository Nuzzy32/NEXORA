# Initial Architecture Decisions

**Status:** Provisional. Keputusan dapat berubah setelah technical feasibility test.

## ADR-001 — Single modular web application
**Keputusan:** Gunakan satu aplikasi Next.js modular, bukan microservices.

**Alasan:** Lingkup penggunaan pribadi, beban awal kecil, dan lebih mudah dikembangkan oleh satu orang dengan bantuan coding agents.

## ADR-002 — Central application database
**Keputusan:** Gunakan PostgreSQL melalui Supabase untuk data inti.

**Data awal:** tasks, projects, notes/memories, conversations, messages, documents, learning items, provider connection metadata.

**Catatan:** Jangan menyimpan access token rahasia sebagai teks biasa. Pilih pola penyimpanan secret yang sesuai dengan kemampuan deployment dan OAuth provider.

## ADR-003 — Provider abstraction
**Keputusan:** UI tidak memanggil provider secara langsung. Permintaan melewati server-side AI service dan adapter provider.

Contoh struktur:
- `lib/ai/types.ts`
- `lib/ai/router.ts`
- `lib/ai/context-builder.ts`
- `lib/ai/providers/openai.ts`
- `lib/ai/providers/anthropic.ts`

Adapter hanya diaktifkan jika jalur integrasinya sudah lolos verifikasi resmi. Nama file bukan bukti bahwa integrasi sudah tersedia.

## ADR-004 — Application-owned conversation history
**Keputusan:** Simpan percakapan dan pesan dalam database aplikasi.

**Alasan:** Memori lintas provider membutuhkan sumber data yang dikendalikan aplikasi.

**Konsekuensi:** Riwayat ini terpisah dari riwayat native ChatGPT dan Claude.ai.

## ADR-005 — Explicit billing consent
**Keputusan:** Tidak ada fallback otomatis ke API berbayar.

Jika jalur langganan gagal, tampilkan pesan error dan status provider. Jalur berbayar hanya dapat dipakai setelah pengguna memilihnya dan menyetujui biaya serta metode billing.

## ADR-006 — Memory is explicit and editable
**Keputusan:** Pengguna dapat mengelola memori yang disimpan. Jangan otomatis menyimpan semua isi percakapan sebagai memori permanen.

Pisahkan:
- raw conversation history;
- user-created notes;
- extracted memory candidates;
- approved memories;
- source references.

## ADR-007 — Responsive web first
**Keputusan:** Fokus pada web responsif untuk laptop dan mobile. Jangan membangun aplikasi native pada MVP.

## Arsitektur konseptual

```text
Responsive Web UI
      |
Next.js Server Routes
      |
Application Services
  |        |         |
Tasks    Memory    AI Router
  |        |         |
  +---- PostgreSQL   +---- Provider Adapter (verified only)
  |                  +---- Explicitly approved API route, if any
Storage
  |
PDFs and user documents
```

## Struktur folder awal

```text
app/
  dashboard/
  tasks/
  projects/
  memory/
  chat/
  learning/
  settings/integrations/
  api/

components/
  layout/
  tasks/
  projects/
  chat/
  memory/
  learning/

lib/
  ai/
  auth/
  database/
  memory/
  security/
  validation/

supabase/
  migrations/

docs/
  decisions/
  PRD.md
  ARCHITECTURE.md
  ROADMAP.md
```

## Hal yang belum diputuskan
- Apakah integrasi subscription-based bisa dijalankan dengan aman di server hosted.
- Skema OAuth/token dan persyaratan masing-masing provider.
- Pilihan model embedding dan vector search.
- Detail retensi dokumen dan kebijakan backup.
- Kebutuhan kalender dan notifikasi.
- Apakah local-first mode diperlukan.

Keputusan ini tidak boleh dianggap final sebelum uji kelayakan selesai.

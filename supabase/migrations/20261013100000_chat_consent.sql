-- Chat AI dengan Claude lewat Anthropic API berbayar (D-027). Sama seperti brief harian (D-018), jalur ini opt-in:
-- provider Claude baru muncul di AI Workspace setelah pemilik menekan "Aktifkan chat Claude" di Settings.
-- Kolom baru hidup di tabel yang sudah ada, jadi RLS dan GRANT yang berlaku tidak berubah.

alter table public.owner_settings
  add column chat_enabled boolean not null default false,
  -- kapan pemilik menyetujui pengiriman percakapan ke Anthropic API; null selama chat mati
  add column chat_consented_at timestamptz,
  add constraint owner_settings_chat_consent_check check (not chat_enabled or chat_consented_at is not null);

-- Token nyata dari provider, untuk menampilkan perkiraan biaya per balasan. Null untuk mock dan balasan lama.
alter table public.messages
  add column input_tokens integer check (input_tokens >= 0),
  add column output_tokens integer check (output_tokens >= 0);

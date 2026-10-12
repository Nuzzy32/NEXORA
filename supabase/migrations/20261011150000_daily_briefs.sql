-- Brief harian: ringkasan per proyek yang ditulis model Claude (Haiku 5.5) lewat Anthropic API berbayar.
-- Jalur ini opt-in: tidak ada data yang dikirim sebelum pemilik menekan tombol aktifkan di UI (CLAUDE.md aturan 3 dan 10),
-- dan `owner_settings` menyimpan persetujuan itu. Isi catatan, memory, dan identitas pemilik tidak pernah ikut terkirim.

-- owner_settings ---------------------------------------------------------------
-- Satu baris per pemilik; dibuat saat pertama kali brief diaktifkan.
create table public.owner_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  brief_enabled boolean not null default false,
  -- kapan pemilik menyetujui pengiriman data ke Anthropic API; null selama brief mati
  brief_consented_at timestamptz,
  updated_at timestamptz not null default now(),
  -- brief tidak bisa aktif tanpa jejak persetujuan
  check (not brief_enabled or brief_consented_at is not null)
);

create trigger owner_settings_set_updated_at
  before update on public.owner_settings
  for each row execute function public.set_updated_at();

-- daily_briefs -----------------------------------------------------------------
create table public.daily_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- tanggal "hari ini" menurut APP_TIMEZONE, dihitung aplikasi
  brief_date date not null,
  -- { headline, projects: [{ name, progress, next[], risk }], watch[] }; divalidasi zod sebelum disimpan
  content jsonb not null
    check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 30000),
  model text not null check (char_length(model) between 1 and 120),
  input_tokens integer not null check (input_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  -- berapa kali brief hari ini dibuat ulang paksa; batas 5 per hari menahan biaya
  refresh_count integer not null default 0 check (refresh_count between 0 and 5),
  created_at timestamptz not null default now(),
  -- satu brief per pemilik per hari; regenerasi menimpa barisnya (created_at ikut diperbarui oleh aplikasi)
  unique (user_id, brief_date)
);

-- access --------------------------------------------------------------------
revoke all on public.owner_settings, public.daily_briefs from anon;
grant select, insert, update on public.owner_settings to authenticated;
grant select, insert, update, delete on public.daily_briefs to authenticated;

alter table public.owner_settings enable row level security;
alter table public.daily_briefs enable row level security;

create policy "owner_settings_select_own" on public.owner_settings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "owner_settings_insert_own" on public.owner_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "owner_settings_update_own" on public.owner_settings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "daily_briefs_select_own" on public.daily_briefs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "daily_briefs_insert_own" on public.daily_briefs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "daily_briefs_update_own" on public.daily_briefs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "daily_briefs_delete_own" on public.daily_briefs for delete to authenticated
  using ((select auth.uid()) = user_id);

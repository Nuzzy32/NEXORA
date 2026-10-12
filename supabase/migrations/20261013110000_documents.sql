-- Learning OS (D-028): PDF milik pemilik di Supabase Storage (bucket privat `documents`) plus metadata dan ringkasan.
-- Berkas diunggah langsung dari browser lewat signed upload URL (body server action Vercel dibatasi 4,5 MB), di jalur
-- `<user_id>/<document_id>.pdf`. Batas ukuran dan tipe ditegakkan oleh bucket, bukan hanya oleh aplikasi.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  file_name text not null check (char_length(file_name) between 1 and 255),
  -- 20 MB, sama dengan file_size_limit bucket
  size_bytes integer not null check (size_bytes between 1 and 20971520),
  -- uploading: baris dibuat, berkas belum dikonfirmasi ada di Storage; ready: berkas terverifikasi
  status text not null default 'uploading' check (status in ('uploading', 'ready')),
  -- ringkasan yang sudah ditinjau dan disimpan pemilik (LEARN-05)
  summary text check (char_length(summary) <= 20000),
  -- hasil model yang belum ditinjau; tidak pernah dianggap ringkasan sebelum pemilik menyimpannya
  summary_draft text check (char_length(summary_draft) <= 20000),
  summary_model text check (char_length(summary_model) between 1 and 120),
  summary_input_tokens integer check (summary_input_tokens >= 0),
  summary_output_tokens integer check (summary_output_tokens >= 0),
  summarized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'ready' or (summary is null and summary_draft is null))
);

create index documents_user_created_idx on public.documents (user_id, created_at desc);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

revoke all on public.documents from anon;
grant select, insert, update, delete on public.documents to authenticated;

alter table public.documents enable row level security;

create policy "documents_select_own" on public.documents for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "documents_insert_own" on public.documents for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "documents_update_own" on public.documents for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "documents_delete_own" on public.documents for delete to authenticated
  using ((select auth.uid()) = user_id);

-- storage ------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Hanya folder milik sendiri: segmen pertama jalur harus uid pemanggil. Tanpa UPDATE: berkas tidak ditimpa, hanya dihapus.
create policy "documents_objects_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents_objects_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents_objects_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

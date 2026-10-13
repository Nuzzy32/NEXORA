-- Flashcard manual per dokumen Learning dengan pengulangan terjadwal sistem Leitner (LEARN-04 tanpa AI, LEARN-06; D-030).
-- Kartu ditulis pemilik sendiri. Jadwal dihitung aplikasi (`nextReview`); database hanya menjaga bentuk datanya.

-- FK komposit (document_id, user_id) memastikan kartu hanya menempel ke dokumen milik sendiri.
alter table public.documents add constraint documents_id_user_id_key unique (id, user_id);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document_id uuid not null,
  front text not null check (char_length(front) between 1 and 1000),
  back text not null check (char_length(back) between 1 and 2000),
  -- kotak Leitner 1..5; naik saat diingat, kembali ke 1 saat lupa
  box smallint not null default 1 check (box between 1 and 5),
  -- tanggal latihan berikutnya menurut APP_TIMEZONE; kartu baru langsung jatuh tempo
  due_date date not null default current_date,
  last_reviewed_at timestamptz,
  review_count integer not null default 0 check (review_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (document_id, user_id) references public.documents (id, user_id) on delete cascade
);

create index flashcards_document_idx on public.flashcards (document_id, user_id);
create index flashcards_user_due_idx on public.flashcards (user_id, due_date);

create trigger flashcards_set_updated_at
  before update on public.flashcards
  for each row execute function public.set_updated_at();

revoke all on public.flashcards from anon;
grant select, insert, update, delete on public.flashcards to authenticated;

alter table public.flashcards enable row level security;

create policy "flashcards_select_own" on public.flashcards for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "flashcards_insert_own" on public.flashcards for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "flashcards_update_own" on public.flashcards for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "flashcards_delete_own" on public.flashcards for delete to authenticated
  using ((select auth.uid()) = user_id);

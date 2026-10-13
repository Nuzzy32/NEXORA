-- D-033: task dan dokumen Learning bisa terhubung ke mata kuliah, dan sesi belajar (timer fokus) tercatat.
-- FK komposit (course_id, user_id): hanya mata kuliah milik sendiri. Menghapus mata kuliah hanya melepas tautannya.

alter table public.tasks
  add column course_id uuid,
  add constraint tasks_course_id_user_id_fkey
    foreign key (course_id, user_id) references public.courses (id, user_id) on delete set null (course_id);
create index tasks_course_idx on public.tasks (course_id, user_id) where course_id is not null;

alter table public.documents
  add column course_id uuid,
  add constraint documents_course_id_user_id_fkey
    foreign key (course_id, user_id) references public.courses (id, user_id) on delete set null (course_id);
create index documents_course_idx on public.documents (course_id, user_id) where course_id is not null;

-- study_sessions: satu baris per sesi fokus yang selesai (atau dihentikan setelah >= 1 menit) --------------------
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid,
  minutes smallint not null check (minutes between 1 and 240),
  ended_at timestamptz not null default now(),
  foreign key (course_id, user_id) references public.courses (id, user_id) on delete set null (course_id)
);

create index study_sessions_user_ended_idx on public.study_sessions (user_id, ended_at desc);
create index study_sessions_course_idx on public.study_sessions (course_id, user_id) where course_id is not null;

revoke all on public.study_sessions from anon;
-- tanpa UPDATE: sesi yang tercatat hanya bisa dihapus
grant select, insert, delete on public.study_sessions to authenticated;

alter table public.study_sessions enable row level security;

create policy "study_sessions_select_own" on public.study_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "study_sessions_insert_own" on public.study_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "study_sessions_delete_own" on public.study_sessions for delete to authenticated
  using ((select auth.uid()) = user_id);

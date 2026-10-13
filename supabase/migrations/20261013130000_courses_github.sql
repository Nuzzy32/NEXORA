-- D-032: repo GitHub per proyek (PROJ-05) dan modul Kuliah: mata kuliah, nilai (IPS/IPK), dan jadwal mingguan.

-- GitHub: hanya nama repo "owner/nama". Token (opsional, read-only) ada di env server, tidak di database.
alter table public.projects
  add column github_repo text
    check (github_repo ~ '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})/[A-Za-z0-9._-]{1,100}$');

-- courses -------------------------------------------------------------------------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  code text check (char_length(code) between 1 and 40),
  credits smallint not null check (credits between 1 and 24),
  semester smallint not null check (semester between 1 and 14),
  lecturer text check (char_length(lecturer) between 1 and 160),
  -- skala UNAIR; null = belum ada nilai (tidak ikut IPS/IPK)
  grade text check (grade in ('A', 'AB', 'B', 'BC', 'C', 'D', 'E')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index courses_user_semester_idx on public.courses (user_id, semester);

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

-- course_sessions: satu baris per pertemuan mingguan ------------------------------
create table public.course_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid not null,
  -- ISO: 1 = Senin ... 7 = Minggu
  weekday smallint not null check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  room text check (char_length(room) between 1 and 80),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (course_id, user_id) references public.courses (id, user_id) on delete cascade
);

create index course_sessions_course_idx on public.course_sessions (course_id, user_id);
create index course_sessions_user_day_idx on public.course_sessions (user_id, weekday, starts_at);

-- access ---------------------------------------------------------------------------
revoke all on public.courses, public.course_sessions from anon;
grant select, insert, update, delete on public.courses, public.course_sessions to authenticated;

alter table public.courses enable row level security;
alter table public.course_sessions enable row level security;

create policy "courses_select_own" on public.courses for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "courses_insert_own" on public.courses for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "courses_update_own" on public.courses for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "courses_delete_own" on public.courses for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "course_sessions_select_own" on public.course_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "course_sessions_insert_own" on public.course_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "course_sessions_update_own" on public.course_sessions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "course_sessions_delete_own" on public.course_sessions for delete to authenticated
  using ((select auth.uid()) = user_id);

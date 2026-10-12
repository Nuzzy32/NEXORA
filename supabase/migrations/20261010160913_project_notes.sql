-- Project notes (PROJ-02/03) and per-project task counts.

create table public.project_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null,
  kind text not null default 'note' check (kind in ('note', 'decision')),
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 20000),
  -- single column so the app can search title+body with one ILIKE filter
  search_text text generated always as (title || ' ' || body) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- notes live and die with their project; the composite FK stops a note pointing at another user's project
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);

-- user_id first: it is what the RLS policies filter on; also serves the FK cascade lookup.
create index project_notes_user_project_idx on public.project_notes (user_id, project_id, updated_at desc);

create trigger project_notes_set_updated_at
  before update on public.project_notes
  for each row execute function public.set_updated_at();

revoke all on public.project_notes from anon;
grant select, insert, update, delete on public.project_notes to authenticated;
alter table public.project_notes enable row level security;

create policy "project_notes_select_own" on public.project_notes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "project_notes_insert_own" on public.project_notes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "project_notes_update_own" on public.project_notes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "project_notes_delete_own" on public.project_notes for delete to authenticated
  using ((select auth.uid()) = user_id);

-- One row per project that has tasks. security_invoker: the caller's RLS on tasks applies (views bypass RLS otherwise).
create view public.project_task_counts
with (security_invoker = true) as
select
  project_id,
  (count(*) filter (where status <> 'done'))::int as open_count,
  (count(*) filter (where status = 'done'))::int as done_count
from public.tasks
where project_id is not null
group by project_id;

revoke all on public.project_task_counts from anon;
grant select on public.project_task_counts to authenticated;

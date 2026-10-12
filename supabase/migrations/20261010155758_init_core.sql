-- Core productivity tables: projects, tasks.
-- Single-owner app, but every row carries user_id + RLS so multi-user stays possible (D-005).
-- Since 2026-10-30 new public tables are not exposed to the Data API by default: grants are explicit.

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- projects ------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  summary text check (char_length(summary) <= 2000),
  status text not null default 'active' check (status in ('active', 'on_hold', 'completed', 'archived')),
  starts_on date,
  due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_on is null or starts_on is null or due_on >= starts_on),
  -- lets tasks reference (id, user_id) so a task can never point at another user's project
  unique (id, user_id)
);

create index projects_user_status_idx on public.projects (user_id, status);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- tasks ---------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 5000),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- deleting a project keeps its tasks (project_id becomes null); user_id is never nulled
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete set null (project_id),
  check ((status = 'done') = (completed_at is not null))
);

create index tasks_user_status_idx on public.tasks (user_id, status);
create index tasks_user_open_due_idx on public.tasks (user_id, due_date) where status <> 'done';
create index tasks_project_idx on public.tasks (project_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- access --------------------------------------------------------------------
revoke all on public.projects, public.tasks from anon;
grant select, insert, update, delete on public.projects, public.tasks to authenticated;

alter table public.projects enable row level security;
alter table public.tasks enable row level security;

create policy "projects_select_own" on public.projects for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "projects_insert_own" on public.projects for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "projects_update_own" on public.projects for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "projects_delete_own" on public.projects for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "tasks_select_own" on public.tasks for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "tasks_insert_own" on public.tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "tasks_update_own" on public.tasks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "tasks_delete_own" on public.tasks for delete to authenticated
  using ((select auth.uid()) = user_id);

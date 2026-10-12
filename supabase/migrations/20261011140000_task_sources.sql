-- Tasks that come from an outside source (e-learning UNAIR iCal feed) and per-source sync status.
-- The feed URL carries a secret token: it lives in server env only, never in these tables.

alter table public.tasks
  add column source text check (source in ('elearning')),
  add column external_id text check (char_length(external_id) between 1 and 255),
  -- sha256 of the source-owned fields (title, due date, description) as last imported; a change means the source moved
  add column external_hash text check (char_length(external_hash) <= 64),
  add constraint tasks_source_external_id_check check ((source is null) = (external_id is null));

-- one task per source item per user: makes re-importing idempotent
create unique index tasks_user_source_external_idx on public.tasks (user_id, source, external_id) where source is not null;

-- integration_syncs ----------------------------------------------------------
create table public.integration_syncs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source text not null check (source in ('elearning')),
  last_synced_at timestamptz not null default now(),
  last_status text not null check (last_status in ('ok', 'error')),
  created_count integer not null default 0 check (created_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  -- a short, user-facing reason; never a URL or token
  last_error text check (char_length(last_error) <= 500),
  primary key (user_id, source),
  check ((last_status = 'error') = (last_error is not null))
);

-- access --------------------------------------------------------------------
revoke all on public.integration_syncs from anon;
grant select, insert, update, delete on public.integration_syncs to authenticated;

alter table public.integration_syncs enable row level security;

create policy "integration_syncs_select_own" on public.integration_syncs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "integration_syncs_insert_own" on public.integration_syncs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "integration_syncs_update_own" on public.integration_syncs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "integration_syncs_delete_own" on public.integration_syncs for delete to authenticated
  using ((select auth.uid()) = user_id);

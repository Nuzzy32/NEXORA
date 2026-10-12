-- Personal memory (MEM-01..05): long-lived notes the owner writes by hand. Nothing here is ever sent to an AI
-- on its own; `pinned` only marks an item the owner opted in to use as chat context later (PRD AI-09, D-003).

create table public.memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  content text not null check (char_length(content) between 1 and 10000),
  category text not null default 'project_note'
    check (category in ('architecture', 'preference', 'decision', 'code_pattern', 'project_note')),
  tags text[] not null default '{}'
    check (
      cardinality(tags) <= 10
      and array_position(tags, ''::text) is null
      and array_position(tags, null::text) is null
      and char_length(array_to_string(tags, ',')) <= 330
    ),
  pinned boolean not null default false,
  project_id uuid,
  -- title + content in one column so the app searches with a single ILIKE (same approach as project_notes, D-011)
  search_text text generated always as (title || ' ' || content) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- the composite FK stops an item pointing at another user's project; deleting a project keeps the memory
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete set null (project_id)
);

create index memory_items_user_updated_idx on public.memory_items (user_id, updated_at desc);
create index memory_items_user_category_idx on public.memory_items (user_id, category);
create index memory_items_project_idx on public.memory_items (project_id) where project_id is not null;

-- Pinning is not an edit: updated_at ("Diperbarui") only moves when the content-bearing fields change.
create function public.memory_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.title, new.content, new.category, new.tags, new.project_id)
     is distinct from (old.title, old.content, old.category, old.tags, old.project_id) then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;
  return new;
end;
$$;
revoke execute on function public.memory_touch_updated_at() from public, anon, authenticated;

create trigger memory_items_touch_updated_at
  before update on public.memory_items
  for each row execute function public.memory_touch_updated_at();

revoke all on public.memory_items from anon;
grant select, insert, update, delete on public.memory_items to authenticated;
alter table public.memory_items enable row level security;

create policy "memory_items_select_own" on public.memory_items for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "memory_items_insert_own" on public.memory_items for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "memory_items_update_own" on public.memory_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "memory_items_delete_own" on public.memory_items for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Items per category for the filter chips. security_invoker: the caller's RLS on memory_items applies.
create view public.memory_category_counts
with (security_invoker = true) as
select category, count(*)::int as item_count
from public.memory_items
group by category;

revoke all on public.memory_category_counts from anon;
grant select on public.memory_category_counts to authenticated;

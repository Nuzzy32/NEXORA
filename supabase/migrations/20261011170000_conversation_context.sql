-- Memory and project context a conversation may carry (PRD AI-09, AI-10, MEM-07; D-003). Rows exist only when the owner
-- picked an item by hand: nothing is attached automatically, and pinning a memory item does not attach it.
-- A row is a pointer (kind + ref_id), never a copy: the text is read again from memory_items / projects at send time.

create table public.conversation_context (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('memory', 'project')),
  -- polymorphic pointer, so no FK: the guard trigger checks it on insert and the forget triggers below clean up on delete
  ref_id uuid not null,
  created_at timestamptz not null default now(),
  -- a conversation's context dies with it; the composite FK rejects another user's conversation
  foreign key (conversation_id, user_id) references public.conversations (id, user_id) on delete cascade,
  unique (conversation_id, kind, ref_id)
);

-- the forget triggers look rows up by the pointer they delete
create index conversation_context_ref_idx on public.conversation_context (ref_id);

-- BEFORE INSERT: at most 10 items per conversation, and the item must exist and be the caller's own.
-- Runs as the caller (no SECURITY DEFINER); the explicit user_id filters do the ownership check, RLS adds to it.
create function public.conversation_context_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- serialize concurrent inserts into one conversation, so the count below cannot be raced past
  perform 1 from public.conversations where id = new.conversation_id and user_id = new.user_id for update;
  if (select count(*) from public.conversation_context where conversation_id = new.conversation_id) >= 10 then
    raise exception 'conversation_context: at most 10 items per conversation' using errcode = 'check_violation';
  end if;
  if new.kind = 'memory' and not exists (select 1 from public.memory_items where id = new.ref_id and user_id = new.user_id) then
    raise exception 'conversation_context: memory item not found' using errcode = 'foreign_key_violation';
  end if;
  if new.kind = 'project' and not exists (select 1 from public.projects where id = new.ref_id and user_id = new.user_id) then
    raise exception 'conversation_context: project not found' using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;
revoke execute on function public.conversation_context_guard() from public, anon, authenticated;

create trigger conversation_context_guard
  before insert on public.conversation_context
  for each row execute function public.conversation_context_guard();

-- Deleting a memory item or a project drops it from every conversation's context (no orphan pointers, nothing counts
-- against the limit). Argument = the kind it points at. Runs as the caller; RLS lets the owner delete their own rows.
create function public.conversation_context_forget()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.conversation_context where kind = tg_argv[0] and ref_id = old.id and user_id = old.user_id;
  return old;
end;
$$;
revoke execute on function public.conversation_context_forget() from public, anon, authenticated;

create trigger memory_items_forget_context
  after delete on public.memory_items
  for each row execute function public.conversation_context_forget('memory');
create trigger projects_forget_context
  after delete on public.projects
  for each row execute function public.conversation_context_forget('project');

-- access --------------------------------------------------------------------
-- No UPDATE: a pointer is never edited, the selection is changed by deleting and adding rows.
revoke all on public.conversation_context from anon;
grant select, insert, delete on public.conversation_context to authenticated;
alter table public.conversation_context enable row level security;

create policy "conversation_context_select_own" on public.conversation_context for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "conversation_context_insert_own" on public.conversation_context for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "conversation_context_delete_own" on public.conversation_context for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Snapshot of what rode along with a user message: {items: [{kind, title}], chars, truncated?}. Titles and a character
-- count only, never the text itself, so the message keeps showing what was attached even after the source is edited.
alter table public.messages
  add column context jsonb,
  add constraint messages_context_shape check (
    context is null or (
      role = 'user'
      and jsonb_typeof(context) = 'object'
      and coalesce(jsonb_typeof(context -> 'chars'), '') = 'number'
      and length(context::text) <= 8000
      -- 1..10 items, each with a known kind and a string title (CASE: array functions must not run on a non-array)
      and coalesce(
        case when jsonb_typeof(context -> 'items') = 'array' then
          jsonb_array_length(context -> 'items') between 1 and 10
          and jsonb_array_length(context -> 'items') = jsonb_array_length(
            jsonb_path_query_array(context, '$.items[*] ? ((@.kind == "memory" || @.kind == "project") && @.title.type() == "string")')
          )
        end,
        false
      )
    )
  );

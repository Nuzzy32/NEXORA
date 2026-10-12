-- Nexora-owned AI conversations and messages (PRD §5.3 AI-02/03, §8).
-- This is Nexora's own history, not the provider's native history. No provider secrets live here.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Percakapan baru' check (char_length(title) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- lets messages reference (id, user_id) so a message can never point at another user's conversation
  unique (id, user_id)
);

-- user_id first: it is what the RLS policies filter on; also orders the history list.
create index conversations_user_updated_idx on public.conversations (user_id, updated_at desc);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '' check (char_length(content) <= 32000),
  -- which adapter/model answered (null for user messages)
  provider_id text check (char_length(provider_id) between 1 and 64),
  model text check (char_length(model) between 1 and 120),
  -- 'error' = an assistant reply that failed and can be retried; it keeps a safe, user-facing reason in `error`
  status text not null default 'complete' check (status in ('complete', 'error')),
  error text check (char_length(error) <= 500),
  created_at timestamptz not null default now(),
  -- a conversation's messages die with it; the composite FK rejects another user's conversation
  foreign key (conversation_id, user_id) references public.conversations (id, user_id) on delete cascade,
  check ((status = 'error') = (error is not null)),
  check (status = 'complete' or role = 'assistant'),
  check (status = 'error' or char_length(content) >= 1)
);

create index messages_user_conversation_idx on public.messages (user_id, conversation_id, created_at);
-- the composite FK cascade looks messages up by (conversation_id, user_id)
create index messages_conversation_idx on public.messages (conversation_id, user_id);

-- A new message moves its conversation to the top of the history list. Runs as the caller (RLS applies).
create function public.message_touch_conversation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id and user_id = new.user_id;
  return new;
end;
$$;
revoke execute on function public.message_touch_conversation() from public, anon, authenticated;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.message_touch_conversation();

-- access --------------------------------------------------------------------
revoke all on public.conversations, public.messages from anon;
grant select, insert, update, delete on public.conversations, public.messages to authenticated;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "conversations_select_own" on public.conversations for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "conversations_insert_own" on public.conversations for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "conversations_update_own" on public.conversations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "conversations_delete_own" on public.conversations for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "messages_select_own" on public.messages for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "messages_insert_own" on public.messages for insert to authenticated
  with check ((select auth.uid()) = user_id);
-- Only assistant replies change (a retry fills in a failed one); what the user wrote stays as written.
create policy "messages_update_own_assistant" on public.messages for update to authenticated
  using ((select auth.uid()) = user_id and role = 'assistant')
  with check ((select auth.uid()) = user_id and role = 'assistant');
create policy "messages_delete_own" on public.messages for delete to authenticated
  using ((select auth.uid()) = user_id);

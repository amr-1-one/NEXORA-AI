-- NEXORA AI: run this script in Supabase > SQL Editor > New query

create table if not exists public.nexora_chats (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'محادثة جديدة',
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists nexora_chats_user_updated_idx
  on public.nexora_chats (user_id, updated_at desc);

alter table public.nexora_chats enable row level security;

drop policy if exists "Users can view their own NEXORA chats" on public.nexora_chats;
create policy "Users can view their own NEXORA chats"
  on public.nexora_chats for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own NEXORA chats" on public.nexora_chats;
create policy "Users can insert their own NEXORA chats"
  on public.nexora_chats for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own NEXORA chats" on public.nexora_chats;
create policy "Users can update their own NEXORA chats"
  on public.nexora_chats for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own NEXORA chats" on public.nexora_chats;
create policy "Users can delete their own NEXORA chats"
  on public.nexora_chats for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.nexora_chats to authenticated;

create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  name text not null,
  bio text not null default '',
  avatar_url text not null default '',
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  privacy jsonb not null default '{"lastSeen":"everyone","profilePhoto":"everyone","readReceipts":"everyone"}'::jsonb,
  settings jsonb not null default '{"mode":"dark","accent":"#35c2ff","accentAlt":"#45e0b1","saturation":1,"fontScale":"md","compactMode":false,"showAvatars":true,"showMessageTime":true,"showTypingIndicator":true,"enterToSend":true,"showSidebarPreview":true,"showReactionBar":true,"blurMedia":false,"wideBubbles":false,"wallpaperGlow":true}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct', 'group')),
  title text not null default '',
  photo_url text not null default '',
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default timezone('utc', now()),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null default '',
  reply_to uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  edited_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  type text not null check (type in ('image', 'document', 'audio')),
  file_name text not null,
  file_path text not null,
  public_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (message_id, user_id)
);

create table if not exists public.message_favorites (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (message_id, user_id)
);

create table if not exists public.conversation_pins (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (conversation_id, user_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_current_timestamp();

create or replace trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_current_timestamp();

create or replace trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_current_timestamp();

create or replace trigger messages_set_updated_at
before update on public.messages
for each row execute function public.set_current_timestamp();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_favorites enable row level security;
alter table public.conversation_pins enable row level security;

create policy "profiles readable by authenticated users"
on public.profiles
for select
using (auth.role() = 'authenticated');

create policy "users update only own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users read own settings"
on public.user_settings
for select
using (auth.uid() = user_id);

create policy "users update own settings"
on public.user_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "members read conversations"
on public.conversations
for select
using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversations.id
      and cm.user_id = auth.uid()
  )
);

create policy "authenticated create conversations"
on public.conversations
for insert
with check (auth.uid() = created_by);

create policy "group admins update conversations"
on public.conversations
for update
using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversations.id
      and cm.user_id = auth.uid()
      and cm.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversations.id
      and cm.user_id = auth.uid()
      and cm.role = 'admin'
  )
);

create policy "members read conversation_members"
on public.conversation_members
for select
using (
  exists (
    select 1 from public.conversation_members self_cm
    where self_cm.conversation_id = conversation_members.conversation_id
      and self_cm.user_id = auth.uid()
  )
);

create policy "admins manage members"
on public.conversation_members
for insert
with check (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversation_members.conversation_id
      and cm.user_id = auth.uid()
      and cm.role = 'admin'
  )
  or auth.uid() = user_id
);

create policy "admins update members"
on public.conversation_members
for update
using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversation_members.conversation_id
      and cm.user_id = auth.uid()
      and cm.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversation_members.conversation_id
      and cm.user_id = auth.uid()
      and cm.role = 'admin'
  )
);

create policy "admins or self remove member"
on public.conversation_members
for delete
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversation_members.conversation_id
      and cm.user_id = auth.uid()
      and cm.role = 'admin'
  )
);

create policy "members read messages"
on public.messages
for select
using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
  )
);

create policy "members send messages"
on public.messages
for insert
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
  )
);

create policy "authors edit own messages"
on public.messages
for update
using (auth.uid() = sender_id)
with check (auth.uid() = sender_id);

create policy "members read attachments"
on public.message_attachments
for select
using (
  exists (
    select 1
    from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.id = message_attachments.message_id
      and cm.user_id = auth.uid()
  )
);

create policy "senders insert attachments"
on public.message_attachments
for insert
with check (
  exists (
    select 1 from public.messages m
    where m.id = message_attachments.message_id
      and m.sender_id = auth.uid()
  )
);

create policy "members read reactions"
on public.message_reactions
for select
using (
  exists (
    select 1
    from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.id = message_reactions.message_id
      and cm.user_id = auth.uid()
  )
);

create policy "users manage own reactions"
on public.message_reactions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users read own favorites"
on public.message_favorites
for select
using (auth.uid() = user_id);

create policy "users manage own favorites"
on public.message_favorites
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users read own pins"
on public.conversation_pins
for select
using (auth.uid() = user_id);

create policy "users manage own pins"
on public.conversation_pins
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

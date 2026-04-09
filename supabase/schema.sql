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

create or replace function public.is_conversation_member(target_conversation_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.user_id = target_user_id
  );
$$;

create or replace function public.is_conversation_admin(target_conversation_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.user_id = target_user_id
      and cm.role = 'admin'
  );
$$;

create or replace function public.is_conversation_creator(target_conversation_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = target_conversation_id
      and c.created_by = target_user_id
  );
$$;

create or replace function public.can_access_message(target_message_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.id = target_message_id
      and cm.user_id = target_user_id
  );
$$;

create or replace function public.is_message_sender(target_message_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.messages m
    where m.id = target_message_id
      and m.sender_id = target_user_id
  );
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
  settings jsonb not null default '{"mode":"dark","accent":"#35c2ff","accentAlt":"#45e0b1","saturation":1,"fontScale":"md","bubbleSize":"sm","compactMode":false,"showAvatars":true,"showMessageTime":true,"showTypingIndicator":true,"enterToSend":true,"showSidebarPreview":true,"showReactionBar":true,"blurMedia":false,"wideBubbles":false,"wallpaperGlow":true}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct', 'group')),
  title text not null default '',
  description text not null default '',
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
  archived_at timestamptz,
  cleared_at timestamptz,
  primary key (conversation_id, user_id)
);

alter table if exists public.conversations
  add column if not exists description text not null default '';

alter table if exists public.conversation_members
  add column if not exists archived_at timestamptz;

alter table if exists public.conversation_members
  add column if not exists cleared_at timestamptz;

create table if not exists public.user_contacts (
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  contact_user_id uuid not null references public.profiles(id) on delete cascade,
  nickname text not null default '',
  label text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (owner_user_id, contact_user_id),
  constraint user_contacts_no_self check (owner_user_id <> contact_user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'message' check (kind in ('message', 'system')),
  text text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  reply_to uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  edited_at timestamptz,
  deleted_at timestamptz
);

alter table if exists public.messages
  add column if not exists kind text not null default 'message';

alter table if exists public.messages
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_kind_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_kind_check
      check (kind in ('message', 'system'));
  end if;
end;
$$;

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  type text not null check (type in ('image', 'document', 'audio')),
  file_name text not null,
  file_path text not null,
  public_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.message_mentions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (message_id, user_id)
);

create table if not exists public.message_hidden_for (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  hidden_at timestamptz not null default timezone('utc', now()),
  primary key (message_id, user_id)
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

create index if not exists idx_profiles_username on public.profiles (username);
create index if not exists idx_conversation_members_user_id on public.conversation_members (user_id);
create index if not exists idx_conversation_members_conversation_role on public.conversation_members (conversation_id, role);
create index if not exists idx_user_contacts_owner_user_id on public.user_contacts (owner_user_id);
create index if not exists idx_messages_conversation_created_at on public.messages (conversation_id, created_at);
create index if not exists idx_messages_sender_created_at on public.messages (sender_id, created_at);
create index if not exists idx_message_mentions_user_id on public.message_mentions (user_id, created_at);
create index if not exists idx_message_hidden_for_user_id on public.message_hidden_for (user_id, hidden_at);
create index if not exists idx_message_attachments_message_id on public.message_attachments (message_id);

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_current_timestamp();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_current_timestamp();

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_current_timestamp();

drop trigger if exists user_contacts_set_updated_at on public.user_contacts;
create trigger user_contacts_set_updated_at
before update on public.user_contacts
for each row execute function public.set_current_timestamp();

drop trigger if exists messages_set_updated_at on public.messages;
create trigger messages_set_updated_at
before update on public.messages
for each row execute function public.set_current_timestamp();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.user_contacts enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_mentions enable row level security;
alter table public.message_hidden_for enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_favorites enable row level security;
alter table public.conversation_pins enable row level security;

drop policy if exists "profiles readable by authenticated users" on public.profiles;
create policy "profiles readable by authenticated users"
on public.profiles
for select
using (auth.role() = 'authenticated');

drop policy if exists "users update only own profile" on public.profiles;
create policy "users update only own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "users read own settings" on public.user_settings;
create policy "users read own settings"
on public.user_settings
for select
using (auth.uid() = user_id);

drop policy if exists "users update own settings" on public.user_settings;
create policy "users update own settings"
on public.user_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "members read conversations" on public.conversations;
create policy "members read conversations"
on public.conversations
for select
using (
  public.is_conversation_member(conversations.id, auth.uid())
  or conversations.created_by = auth.uid()
);

drop policy if exists "authenticated create conversations" on public.conversations;
create policy "authenticated create conversations"
on public.conversations
for insert
with check (auth.uid() = created_by);

drop policy if exists "group admins update conversations" on public.conversations;
create policy "group admins update conversations"
on public.conversations
for update
using (public.is_conversation_admin(conversations.id, auth.uid()))
with check (public.is_conversation_admin(conversations.id, auth.uid()));

drop policy if exists "members read conversation_members" on public.conversation_members;
create policy "members read conversation_members"
on public.conversation_members
for select
using (public.is_conversation_member(conversation_members.conversation_id, auth.uid()));

drop policy if exists "creators or admins insert members" on public.conversation_members;
create policy "creators or admins insert members"
on public.conversation_members
for insert
with check (
  public.is_conversation_creator(conversation_members.conversation_id, auth.uid())
  or public.is_conversation_admin(conversation_members.conversation_id, auth.uid())
);

drop policy if exists "admins update members" on public.conversation_members;
create policy "admins update members"
on public.conversation_members
for update
using (public.is_conversation_admin(conversation_members.conversation_id, auth.uid()))
with check (public.is_conversation_admin(conversation_members.conversation_id, auth.uid()));

drop policy if exists "admins or self remove member" on public.conversation_members;
create policy "admins or self remove member"
on public.conversation_members
for delete
using (
  auth.uid() = user_id
  or public.is_conversation_admin(conversation_members.conversation_id, auth.uid())
);

drop policy if exists "owners read contacts" on public.user_contacts;
create policy "owners read contacts"
on public.user_contacts
for select
using (auth.uid() = owner_user_id);

drop policy if exists "owners insert contacts" on public.user_contacts;
create policy "owners insert contacts"
on public.user_contacts
for insert
with check (auth.uid() = owner_user_id);

drop policy if exists "owners update contacts" on public.user_contacts;
create policy "owners update contacts"
on public.user_contacts
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "owners delete contacts" on public.user_contacts;
create policy "owners delete contacts"
on public.user_contacts
for delete
using (auth.uid() = owner_user_id);

drop policy if exists "members read messages" on public.messages;
create policy "members read messages"
on public.messages
for select
using (public.is_conversation_member(messages.conversation_id, auth.uid()));

drop policy if exists "members send messages" on public.messages;
create policy "members send messages"
on public.messages
for insert
with check (
  auth.uid() = sender_id
  and public.is_conversation_member(messages.conversation_id, auth.uid())
);

drop policy if exists "authors edit own messages" on public.messages;
create policy "authors edit own messages"
on public.messages
for update
using (auth.uid() = sender_id)
with check (auth.uid() = sender_id);

drop policy if exists "members read attachments" on public.message_attachments;
create policy "members read attachments"
on public.message_attachments
for select
using (public.can_access_message(message_attachments.message_id, auth.uid()));

drop policy if exists "senders insert attachments" on public.message_attachments;
create policy "senders insert attachments"
on public.message_attachments
for insert
with check (public.is_message_sender(message_attachments.message_id, auth.uid()));

drop policy if exists "members read mentions" on public.message_mentions;
create policy "members read mentions"
on public.message_mentions
for select
using (public.can_access_message(message_mentions.message_id, auth.uid()));

drop policy if exists "senders insert mentions" on public.message_mentions;
create policy "senders insert mentions"
on public.message_mentions
for insert
with check (
  public.is_message_sender(message_mentions.message_id, auth.uid())
  and public.can_access_message(message_mentions.message_id, message_mentions.user_id)
);

drop policy if exists "senders delete mentions" on public.message_mentions;
create policy "senders delete mentions"
on public.message_mentions
for delete
using (public.is_message_sender(message_mentions.message_id, auth.uid()));

drop policy if exists "users read hidden messages for self" on public.message_hidden_for;
create policy "users read hidden messages for self"
on public.message_hidden_for
for select
using (auth.uid() = user_id);

drop policy if exists "users hide messages for self" on public.message_hidden_for;
create policy "users hide messages for self"
on public.message_hidden_for
for insert
with check (
  auth.uid() = user_id
  and public.can_access_message(message_hidden_for.message_id, auth.uid())
);

drop policy if exists "users unhide messages for self" on public.message_hidden_for;
create policy "users unhide messages for self"
on public.message_hidden_for
for delete
using (auth.uid() = user_id);

drop policy if exists "members read reactions" on public.message_reactions;
create policy "members read reactions"
on public.message_reactions
for select
using (public.can_access_message(message_reactions.message_id, auth.uid()));

drop policy if exists "users manage own reactions" on public.message_reactions;
create policy "users manage own reactions"
on public.message_reactions
for all
using (
  auth.uid() = user_id
  and public.can_access_message(message_reactions.message_id, auth.uid())
)
with check (
  auth.uid() = user_id
  and public.can_access_message(message_reactions.message_id, auth.uid())
);

drop policy if exists "users read own favorites" on public.message_favorites;
create policy "users read own favorites"
on public.message_favorites
for select
using (auth.uid() = user_id);

drop policy if exists "users manage own favorites" on public.message_favorites;
create policy "users manage own favorites"
on public.message_favorites
for all
using (
  auth.uid() = user_id
  and public.can_access_message(message_favorites.message_id, auth.uid())
)
with check (
  auth.uid() = user_id
  and public.can_access_message(message_favorites.message_id, auth.uid())
);

drop policy if exists "users read own pins" on public.conversation_pins;
create policy "users read own pins"
on public.conversation_pins
for select
using (auth.uid() = user_id);

drop policy if exists "users manage own pins" on public.conversation_pins;
create policy "users manage own pins"
on public.conversation_pins
for all
using (
  auth.uid() = user_id
  and public.is_conversation_member(conversation_pins.conversation_id, auth.uid())
)
with check (
  auth.uid() = user_id
  and public.is_conversation_member(conversation_pins.conversation_id, auth.uid())
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'conversations',
    'conversation_members',
    'user_contacts',
    'messages',
    'message_attachments',
    'message_mentions',
    'message_hidden_for',
    'message_reactions',
    'message_favorites',
    'conversation_pins'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;

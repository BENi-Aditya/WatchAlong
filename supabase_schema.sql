create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  join_code text not null unique,
  created_at timestamptz not null default now(),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  youtube_url text not null,
  youtube_id text not null,
  allow_participant_control boolean not null default true
);

alter table public.sessions add column if not exists playlist_id text;
alter table public.sessions add column if not exists playlist_index integer not null default 0;
alter table public.sessions add column if not exists playlist_video_ids text[] not null default '{}';

create table if not exists public.session_playback (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  is_playing boolean not null default false,
  position_sec double precision not null default 0,
  rate double precision not null default 1,
  server_time timestamptz not null default now()
);

create or replace function public.touch_server_time()
returns trigger
language plpgsql
as $$
begin
  new.server_time = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_touch_session_playback_server_time'
  ) then
    create trigger trg_touch_session_playback_server_time
    before update on public.session_playback
    for each row
    execute function public.touch_server_time();
  end if;
end;
$$;

create table if not exists public.session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  text text not null,
  reply_to_id uuid,
  reply_to_username text,
  reply_to_text text,
  video_time_sec double precision not null default 0,
  created_at timestamptz not null default now()
);

alter table public.session_messages add column if not exists reply_to_id uuid;
alter table public.session_messages add column if not exists reply_to_username text;
alter table public.session_messages add column if not exists reply_to_text text;

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.session_playback enable row level security;
alter table public.session_messages enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id);

-- sessions

drop policy if exists "sessions_select" on public.sessions;
create policy "sessions_select"
on public.sessions
for select
to authenticated
using (true);

drop policy if exists "sessions_insert" on public.sessions;
create policy "sessions_insert"
on public.sessions
for insert
to authenticated
with check (auth.uid() = host_user_id);

drop policy if exists "sessions_update_host" on public.sessions;
create policy "sessions_update_host"
on public.sessions
for update
to authenticated
using (auth.uid() = host_user_id);

-- session_playback

drop policy if exists "playback_select" on public.session_playback;
create policy "playback_select"
on public.session_playback
for select
to authenticated
using (true);

drop policy if exists "playback_insert_host" on public.session_playback;
create policy "playback_insert_host"
on public.session_playback
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sessions s
    where s.id = session_id
      and s.host_user_id = auth.uid()
  )
);

drop policy if exists "playback_update_host_or_unlocked" on public.session_playback;
create policy "playback_update_host_or_unlocked"
on public.session_playback
for update
to authenticated
using (
  exists (
    select 1
    from public.sessions s
    where s.id = session_id
      and (
        s.host_user_id = auth.uid()
        or s.allow_participant_control = true
      )
  )
);

-- session_messages

drop policy if exists "messages_select" on public.session_messages;
create policy "messages_select"
on public.session_messages
for select
to authenticated
using (true);

drop policy if exists "messages_insert" on public.session_messages;
create policy "messages_insert"
on public.session_messages
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (select 1 from public.sessions s where s.id = session_id)
);

do $$
begin
  begin
    alter publication supabase_realtime add table public.sessions;
  exception when duplicate_object then
  end;

  begin
    alter publication supabase_realtime add table public.session_playback;
  exception when duplicate_object then
  end;

  begin
    alter publication supabase_realtime add table public.session_messages;
  exception when duplicate_object then
  end;

  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then
  end;
end;
$$;

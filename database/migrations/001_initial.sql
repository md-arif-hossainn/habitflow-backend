-- ─────────────────────────────────────────────────────────────────────────────
-- HabitFlow — Initial Schema  (idempotent — safe to run multiple times)
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ────────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ── Enums (skip if already exist) ─────────────────────────────────────────────

do $$ begin
  create type habit_category as enum ('health', 'fitness', 'study', 'personal');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type habit_frequency as enum ('daily', 'weekly');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type device_platform as enum ('android', 'ios');
exception when duplicate_object then null;
end $$;

-- ── habits ────────────────────────────────────────────────────────────────────

create table if not exists public.habits (
  id            uuid            primary key default uuid_generate_v4(),
  user_id       uuid            not null references auth.users(id) on delete cascade,
  name          varchar(40)     not null,
  emoji         varchar(10)     not null,
  color_value   bigint          not null,
  category      habit_category  not null,
  frequency     habit_frequency not null,
  reminder_time time,
  created_at    timestamptz     not null default now()
);

create index if not exists habits_user_id_idx on public.habits(user_id);

-- ── habit_completions ─────────────────────────────────────────────────────────

create table if not exists public.habit_completions (
  id             uuid        primary key default uuid_generate_v4(),
  habit_id       uuid        not null references public.habits(id) on delete cascade,
  user_id        uuid        not null references auth.users(id) on delete cascade,
  completed_date date        not null,
  created_at     timestamptz not null default now(),

  unique(habit_id, completed_date)
);

create index if not exists habit_completions_habit_id_idx on public.habit_completions(habit_id);
create index if not exists habit_completions_user_id_idx  on public.habit_completions(user_id);
create index if not exists habit_completions_date_idx     on public.habit_completions(completed_date);

-- ── fcm_tokens ────────────────────────────────────────────────────────────────

create table if not exists public.fcm_tokens (
  id         uuid            primary key default uuid_generate_v4(),
  user_id    uuid            not null references auth.users(id) on delete cascade,
  token      text            not null,
  platform   device_platform not null,
  created_at timestamptz     not null default now(),

  unique(user_id, token)
);

create index if not exists fcm_tokens_user_id_idx on public.fcm_tokens(user_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.habits            enable row level security;
alter table public.habit_completions enable row level security;
alter table public.fcm_tokens        enable row level security;

-- habits policies
drop policy if exists "habits: owner select" on public.habits;
create policy "habits: owner select"
  on public.habits for select using (auth.uid() = user_id);

drop policy if exists "habits: owner insert" on public.habits;
create policy "habits: owner insert"
  on public.habits for insert with check (auth.uid() = user_id);

drop policy if exists "habits: owner update" on public.habits;
create policy "habits: owner update"
  on public.habits for update using (auth.uid() = user_id);

drop policy if exists "habits: owner delete" on public.habits;
create policy "habits: owner delete"
  on public.habits for delete using (auth.uid() = user_id);

-- habit_completions policies
drop policy if exists "completions: owner select" on public.habit_completions;
create policy "completions: owner select"
  on public.habit_completions for select using (auth.uid() = user_id);

drop policy if exists "completions: owner insert" on public.habit_completions;
create policy "completions: owner insert"
  on public.habit_completions for insert with check (auth.uid() = user_id);

drop policy if exists "completions: owner delete" on public.habit_completions;
create policy "completions: owner delete"
  on public.habit_completions for delete using (auth.uid() = user_id);

-- fcm_tokens policies
drop policy if exists "fcm_tokens: owner all" on public.fcm_tokens;
create policy "fcm_tokens: owner all"
  on public.fcm_tokens for all using (auth.uid() = user_id);

-- Phase 1: per-user workout history (run in Supabase SQL Editor)

create table if not exists public.workout_sessions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_type text not null,
  status text not null,
  started_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz,
  exercises jsonb not null default '[]'::jsonb
);

create index if not exists workout_sessions_user_id_idx on public.workout_sessions (user_id);
create index if not exists workout_sessions_user_updated_idx on public.workout_sessions (user_id, updated_at desc);

create table if not exists public.manual_activities (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_date date not null,
  activity_type text not null,
  intensity text,
  duration_minutes integer,
  notes text
);

create index if not exists manual_activities_user_date_idx
  on public.manual_activities (user_id, activity_date);

alter table public.workout_sessions enable row level security;
alter table public.manual_activities enable row level security;

create policy "workout_sessions_select_own"
  on public.workout_sessions for select
  using (auth.uid() = user_id);

create policy "workout_sessions_insert_own"
  on public.workout_sessions for insert
  with check (auth.uid() = user_id);

create policy "workout_sessions_update_own"
  on public.workout_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workout_sessions_delete_own"
  on public.workout_sessions for delete
  using (auth.uid() = user_id);

create policy "manual_activities_select_own"
  on public.manual_activities for select
  using (auth.uid() = user_id);

create policy "manual_activities_insert_own"
  on public.manual_activities for insert
  with check (auth.uid() = user_id);

create policy "manual_activities_update_own"
  on public.manual_activities for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "manual_activities_delete_own"
  on public.manual_activities for delete
  using (auth.uid() = user_id);

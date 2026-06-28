-- Planned workout overrides (multi-select per day)

create table if not exists public.plan_overrides (
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  activity_types text[] not null default '{}'::text[],
  updated_at timestamptz not null default now(),
  primary key (user_id, plan_date)
);

create index if not exists plan_overrides_user_date_idx
  on public.plan_overrides (user_id, plan_date);

alter table public.plan_overrides enable row level security;

create policy "plan_overrides_select_own"
  on public.plan_overrides for select
  using (auth.uid() = user_id);

create policy "plan_overrides_insert_own"
  on public.plan_overrides for insert
  with check (auth.uid() = user_id);

create policy "plan_overrides_update_own"
  on public.plan_overrides for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "plan_overrides_delete_own"
  on public.plan_overrides for delete
  using (auth.uid() = user_id);

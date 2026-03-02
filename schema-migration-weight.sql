-- Migration: Add body_weight_logs table
-- Run this in Supabase Dashboard → SQL Editor before launching the app.

create table if not exists public.body_weight_logs (
  id         uuid          primary key default uuid_generate_v4(),
  user_id    uuid          not null references auth.users(id) on delete cascade,
  date       date          not null default current_date,
  weight_kg  numeric(5,2)  not null check (weight_kg > 0 and weight_kg < 700),
  created_at timestamptz   not null default now(),
  constraint body_weight_logs_user_date_unique unique (user_id, date)
);

alter table public.body_weight_logs enable row level security;

create policy "weight_logs_select_own" on public.body_weight_logs
  for select using (auth.uid() = user_id);
create policy "weight_logs_insert_own" on public.body_weight_logs
  for insert with check (auth.uid() = user_id);
create policy "weight_logs_update_own" on public.body_weight_logs
  for update using (auth.uid() = user_id);
create policy "weight_logs_delete_own" on public.body_weight_logs
  for delete using (auth.uid() = user_id);

create index if not exists idx_body_weight_logs_user_date
  on public.body_weight_logs (user_id, date desc);

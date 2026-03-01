-- =============================================================
-- Elevated Elites — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- =============================================================

-- Enable UUID helper
create extension if not exists "uuid-ossp";


-- =============================================================
-- PROFILES
-- One row per user. Auto-created via trigger on auth.users.
-- =============================================================

create table if not exists public.profiles (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        not null unique references auth.users(id) on delete cascade,
  name         text,
  age          integer     check (age > 0 and age < 130),
  weight       numeric(5, 2),         -- kilograms
  height       numeric(5, 2),         -- centimetres
  fitness_goal text,                  -- 'muscle_gain' | 'fat_loss' | 'maintenance' | 'endurance'
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id);


-- =============================================================
-- WORKOUTS
-- Each row represents a single training session.
-- =============================================================

create table if not exists public.workouts (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  date       date        not null default current_date,
  notes      text,
  created_at timestamptz not null default now()
);

alter table public.workouts enable row level security;

-- Single policy covers all CRUD for the owner
create policy "workouts_all_own"
  on public.workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_workouts_user_date
  on public.workouts (user_id, date desc);


-- =============================================================
-- WORKOUT EXERCISES
-- Individual lifts / movements within a workout session.
-- =============================================================

create table if not exists public.workout_exercises (
  id            uuid        primary key default uuid_generate_v4(),
  workout_id    uuid        not null references public.workouts(id) on delete cascade,
  exercise_name text        not null,
  sets          integer     check (sets > 0),
  reps          integer     check (reps > 0),
  weight        numeric(6, 2),         -- kilograms (null = bodyweight)
  created_at    timestamptz not null default now()
);

alter table public.workout_exercises enable row level security;

-- Users access their own exercises via the workout relationship
create policy "workout_exercises_all_own"
  on public.workout_exercises for all
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = auth.uid()
    )
  );

create index if not exists idx_workout_exercises_workout
  on public.workout_exercises (workout_id);


-- =============================================================
-- WORKOUT MUSCLES
-- Which muscle groups were trained, and at what intensity.
-- Useful for heatmap / volume tracking in the UI.
-- =============================================================

create table if not exists public.workout_muscles (
  id           uuid        primary key default uuid_generate_v4(),
  workout_id   uuid        not null references public.workouts(id) on delete cascade,
  muscle_group text        not null,
    -- 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
    -- | 'legs' | 'glutes' | 'core' | 'calves' | 'forearms'
  intensity    integer     check (intensity between 1 and 10),
  created_at   timestamptz not null default now()
);

alter table public.workout_muscles enable row level security;

create policy "workout_muscles_all_own"
  on public.workout_muscles for all
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_muscles.workout_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_muscles.workout_id
        and w.user_id = auth.uid()
    )
  );

create index if not exists idx_workout_muscles_workout
  on public.workout_muscles (workout_id);


-- =============================================================
-- MEALS
-- A named eating event (e.g. "Breakfast", "Pre-workout shake").
-- =============================================================

create table if not exists public.meals (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  date        date        not null default current_date,
  meal_name   text        not null,
  time_of_day text        check (
                             time_of_day in (
                               'breakfast', 'lunch', 'dinner',
                               'snack', 'pre_workout', 'post_workout'
                             )
                           ),
  created_at  timestamptz not null default now()
);

alter table public.meals enable row level security;

create policy "meals_all_own"
  on public.meals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_meals_user_date
  on public.meals (user_id, date desc);


-- =============================================================
-- MEAL ITEMS
-- Individual food entries within a meal, with macro breakdown.
-- =============================================================

create table if not exists public.meal_items (
  id         uuid        primary key default uuid_generate_v4(),
  meal_id    uuid        not null references public.meals(id) on delete cascade,
  food_name  text        not null,
  calories   numeric(7, 2),           -- kcal
  protein    numeric(6, 2),           -- grams
  carbs      numeric(6, 2),           -- grams
  fat        numeric(6, 2),           -- grams
  fiber      numeric(6, 2),           -- grams
  sodium     numeric(7, 2),           -- milligrams
  sugar      numeric(6, 2),           -- grams
  created_at timestamptz not null default now()
);

alter table public.meal_items enable row level security;

create policy "meal_items_all_own"
  on public.meal_items for all
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_items.meal_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meals m
      where m.id = meal_items.meal_id
        and m.user_id = auth.uid()
    )
  );

create index if not exists idx_meal_items_meal
  on public.meal_items (meal_id);


-- =============================================================
-- DAILY GOALS
-- One row per user — their macro targets.
-- Upserted on the profile / settings page.
-- =============================================================

create table if not exists public.daily_goals (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        not null unique references auth.users(id) on delete cascade,
  calorie_goal numeric(7, 2),          -- kcal
  protein_goal numeric(6, 2),          -- grams
  carb_goal    numeric(6, 2),          -- grams
  fat_goal     numeric(6, 2),          -- grams
  updated_at   timestamptz not null default now()
);

alter table public.daily_goals enable row level security;

create policy "daily_goals_all_own"
  on public.daily_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =============================================================
-- TRIGGER — auto-create profile row on new sign-up
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;   -- idempotent; safe to replay

  return new;
end;
$$;

-- Attach trigger to auth.users (Supabase auth table)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

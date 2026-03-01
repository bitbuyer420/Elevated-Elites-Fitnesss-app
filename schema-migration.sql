-- =============================================================
-- Elevated Elites — Migration: Onboarding columns
-- Run this in Supabase SQL Editor AFTER the initial schema.sql
-- =============================================================

-- Add new columns to profiles
alter table public.profiles
  add column if not exists username         text unique,
  add column if not exists gender           text check (gender in ('male', 'female')),
  add column if not exists activity_level   text check (
    activity_level in ('sedentary','lightly_active','moderately_active','very_active')
  ),
  add column if not exists onboarding_completed boolean not null default false;

-- Backfill: existing users who already have profiles are NOT
-- forced through onboarding (set completed = false to trigger it,
-- or true if you want to skip for dev accounts).
-- Default false means everyone gets onboarding on next login.

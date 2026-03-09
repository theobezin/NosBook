-- ============================================================
-- NosBook — Supabase Schema
-- Run in the SQL editor of your Supabase dashboard.
--
-- If you already ran the previous schema, execute the
-- migration block at the bottom first to clean up old tables.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- TABLE: profiles
-- One row per auth user (created automatically on sign-up).
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  username   text unique not null,
  bio        text,
  avatar_url text,
  is_admin   boolean not null default false,
  -- Game server: 'undercity' | 'dragonveil'. One NosBook account = one server.
  -- Nullable so existing users can set it through the profile page.
  server     text check (server in ('undercity', 'dragonveil')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- TABLE: characters
-- Up to 4 characters per player account.
-- Stats, equipment and resistances stored as JSONB so the
-- schema doesn't need to change when new fields are added.
-- ────────────────────────────────────────────────────────────
create table if not exists public.characters (
  id          text primary key,                -- client-generated, e.g. "char-1234567890"
  profile_id  uuid references public.profiles(id) on delete cascade not null,
  sort_order  int  not null default 0,         -- slot index 0-3
  name        text not null,
  -- Denormalized from profiles.server at creation time. Immutable after insert.
  -- Nullable only for backward compat with rows inserted before this migration.
  server      text check (server in ('undercity', 'dragonveil')),
  class       text not null check (class in ('Archer', 'Swordsman', 'Mage', 'Martial')),
  level       int  not null default 1 check (level between 1 and 99),
  hero_level  int  not null default 0,
  prestige    int  not null default 0,
  element     text not null default 'Neutral'
                   check (element in ('Neutral', 'Fire', 'Water', 'Light', 'Shadow')),
  -- { atk, def, matk, mdef, hp, mp, speed, critRate, critDmg, hit, avoid } — null = not set
  stats       jsonb not null default '{}',
  -- { weapon, offhand, armor, hat, gloves, shoes, necklace, ring, bracelet, sp, fairy }
  equipment   jsonb not null default '{}',
  -- { fire, water, light, shadow }
  resistances jsonb not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists characters_profile_id_idx on public.characters (profile_id);

-- Global uniqueness: a character name is unique per server (mirrors the game).
-- Uses lower() for case-insensitive comparison. Partial index: only rows where
-- server IS NOT NULL (old rows without server are excluded from the constraint).
create unique index if not exists characters_name_server_unique
  on public.characters (lower(name), server)
  where server is not null;

-- ────────────────────────────────────────────────────────────
-- RLS — profiles
-- ────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "Profiles visible to everyone"
  on public.profiles for select using (true);

create policy "Owner can update their profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- RLS — characters
-- ────────────────────────────────────────────────────────────
alter table public.characters enable row level security;

create policy "Characters visible to everyone"
  on public.characters for select using (true);

create policy "Owner manages their characters"
  on public.characters for all
  using (auth.uid() = profile_id);

-- ────────────────────────────────────────────────────────────
-- TRIGGER: auto-create profile on user registration
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- TABLE: raid_records
-- Classement PVE speedrun — un enregistrement par run soumis.
-- ────────────────────────────────────────────────────────────
create table if not exists public.raid_records (
  id            uuid        primary key default gen_random_uuid(),
  raid_slug     text        not null,
  server        text        not null check (server in ('undercity', 'dragonveil')),
  team_members  text[]      not null,
  time_seconds  integer     not null check (time_seconds > 0),
  proof_url     text        not null,
  proof_type    text        not null check (proof_type in ('video', 'screenshot')),
  submitted_by  uuid        references auth.users(id) on delete set null,
  submitted_at  timestamptz not null default now(),
  status        text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note    text
);

create index if not exists raid_records_slug_time_idx on public.raid_records (raid_slug, time_seconds asc);
create index if not exists raid_records_server_idx    on public.raid_records (server);
create index if not exists raid_records_status_idx    on public.raid_records (status);

-- ── RLS — raid_records ───────────────────────────────────────
alter table public.raid_records enable row level security;

-- Lecture publique : seulement les records approuvés
create policy "read_approved_records"
  on public.raid_records
  for select
  using (status = 'approved');

-- Insert : utilisateurs connectés uniquement, status forcé à 'pending'
create policy "insert_own_records"
  on public.raid_records
  for insert
  to authenticated
  with check (submitted_by = auth.uid() and status = 'pending');

-- Lecture de ses propres soumissions (tous statuts) — pour MySubmissionsPage
create policy "select_own_records"
  on public.raid_records
  for select
  to authenticated
  using (submitted_by = auth.uid());

-- Admin : lecture de tous les records (pending, approved, rejected)
create policy "admin_select_all_records"
  on public.raid_records
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Admin : mise à jour (approbation / rejet)
create policy "admin_update_records"
  on public.raid_records
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ── MIGRATION — only needed if you ran the old schema before.
-- ────────────────────────────────────────────────────────────

-- [v1 → v2] Clean up old tables (only if you ran the very first schema):
-- drop table if exists public.activity_log;
-- drop table if exists public.achievements;
-- drop table if exists public.equipment;
-- drop table if exists public.player_stats;
--
-- alter table public.profiles
--   drop column if exists name,
--   drop column if exists class,
--   drop column if exists sub_class,
--   drop column if exists level,
--   drop column if exists hero_level,
--   drop column if exists server,
--   drop column if exists family,
--   drop column if exists family_level,
--   drop column if exists prestige,
--   drop column if exists banner_url;

-- [v3] Add server columns + unique constraint (run if tables already exist):
-- ─────────────────────────────────────────────────────────────────────────
-- Step 1 — add server to profiles (nullable; users set it via the profile page):
-- alter table public.profiles
--   add column if not exists server text check (server in ('undercity', 'dragonveil'));
--
-- Step 2 — add server to characters (nullable; set from profiles.server on creation):
-- alter table public.characters
--   add column if not exists server text check (server in ('undercity', 'dragonveil'));
--
-- Step 3 — create the unique index (partial: only rows with server NOT NULL):
-- create unique index if not exists characters_name_server_unique
--   on public.characters (lower(name), server)
--   where server is not null;

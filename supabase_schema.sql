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
  id              uuid references auth.users(id) on delete cascade primary key,
  username        text unique not null,
  bio             text,
  avatar_url      text,
  -- Game server the player primarily plays on
  server          text check (server in ('undercity', 'dragonveil')),
  -- Planner data stored as JSONB for flexibility
  planner_data    jsonb,
  -- Admin flag: grant via UPDATE profiles SET is_admin=true WHERE username='...'
  is_admin        boolean not null default false,
  -- Market-related reputation fields
  discord_handle  text,                          -- optional discord pseudo shown on listings
  trades_completed int not null default 0,       -- confirmed successful trades
  trades_reported  int not null default 0,       -- validated reports against this user
  -- Moderation fields (managed exclusively by admins via admin_set_moderation)
  muted_until     timestamptz,                   -- null = not muted; if > now() = muted
  is_banned       boolean not null default false,-- permanent market ban
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
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
  -- server is denormalized from profiles.server at creation time (immutable)
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
  updated_at  timestamptz default now(),
  -- Prevent duplicate character names per server
  constraint characters_name_server_unique unique (name, server)
);

create index if not exists characters_profile_id_idx on public.characters (profile_id);

-- Global uniqueness: a character name is unique per server (mirrors the game).
-- Uses lower() for case-insensitive comparison. Partial index: only rows where
-- server IS NOT NULL (old rows without server are excluded from the constraint).
create unique index if not exists characters_name_server_unique
  on public.characters (lower(name), server)
  where server is not null;

-- ────────────────────────────────────────────────────────────
-- TABLE: raid_records
-- Speedrun records submitted by players.
-- ────────────────────────────────────────────────────────────
create table if not exists public.raid_records (
  id           uuid default uuid_generate_v4() primary key,
  submitted_by uuid references auth.users(id) on delete cascade not null,
  raid_slug    text not null,
  server       text not null check (server in ('undercity', 'dragonveil')),
  -- In-game character names (not NosBook usernames)
  team_members text[] not null default '{}',
  time_seconds int  not null,
  proof_url    text not null,
  proof_type   text not null check (proof_type in ('video', 'screenshot')),
  status       text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  admin_note   text,
  submitted_at timestamptz default now()
);

create index if not exists raid_records_raid_slug_idx on public.raid_records (raid_slug, server, status);

-- ────────────────────────────────────────────────────────────
-- TABLE: market_listings
-- Buy/sell posts. One server per listing (seller's server).
-- Gold amounts use BIGINT to support values up to 30 000 000 000.
-- Auto-archival: listings inactive for 30 days are excluded in
-- queries via last_activity_at < now() - interval '30 days'.
-- ────────────────────────────────────────────────────────────
create table if not exists public.market_listings (
  id                   uuid default uuid_generate_v4() primary key,
  -- 'sell' = WTS auction, 'buy' = WTB request
  type                 text not null check (type in ('sell', 'buy')),
  profile_id           uuid references public.profiles(id) on delete cascade not null,
  server               text not null check (server in ('undercity', 'dragonveil')),
  title                text not null,
  description          text,
  -- Tag slugs (e.g. 'swordsman', 'equipment_act6') — see src/lib/market.js
  tags                 text[] not null default '{}',
  -- External image URLs provided by the lister (imgur, etc.)
  image_urls           text[] not null default '{}',
  -- Sell listings: optional minimum bid and optional instant-buy price (gold, bigint)
  base_price           bigint check (base_price >= 0),
  buyout_price         bigint check (buyout_price >= 0),
  -- Active status flow: active → sold | archived
  status               text not null default 'active'
                            check (status in ('active', 'sold', 'archived')),
  -- True while seller is deciding whether to confirm a buyout-triggered offer.
  -- No new offers are accepted while this is true.
  confirmation_pending boolean not null default false,
  -- Points to the offer awaiting seller confirmation (buyout or manual choice)
  accepted_offer_id    uuid,                         -- FK added below after market_offers
  -- Profiles blocked from making offers on this listing (reported non-payers)
  blocked_profiles     uuid[] not null default '{}',
  -- Resets on new (non-cancelled) offer OR on post edit
  last_activity_at     timestamptz not null default now(),
  created_at           timestamptz default now()
);

create index if not exists market_listings_server_type_idx
  on public.market_listings (server, type, status);
create index if not exists market_listings_last_activity_idx
  on public.market_listings (last_activity_at);

-- ────────────────────────────────────────────────────────────
-- TABLE: market_offers
-- Bids on sell listings OR responses to buy listings.
-- ────────────────────────────────────────────────────────────
create table if not exists public.market_offers (
  id          uuid default uuid_generate_v4() primary key,
  listing_id  uuid references public.market_listings(id) on delete cascade not null,
  profile_id  uuid references public.profiles(id) on delete cascade not null,
  -- Price in gold (required for sell bids, optional for buy responses)
  price       bigint check (price >= 0),
  comment     text,
  -- External image URL (especially for buy listing responses)
  image_url   text,
  -- active → accepted | cancelled | blocked (admin-validated report)
  status      text not null default 'active'
                   check (status in ('active', 'cancelled', 'accepted', 'blocked')),
  created_at  timestamptz default now()
);

create index if not exists market_offers_listing_id_idx on public.market_offers (listing_id);

-- Add FK from market_listings to market_offers (after both tables exist)
alter table public.market_listings
  add constraint market_listings_accepted_offer_id_fkey
  foreign key (accepted_offer_id) references public.market_offers(id)
  on delete set null;

-- ────────────────────────────────────────────────────────────
-- TABLE: market_reports
-- Seller reports a buyer who won but did not honour the trade.
-- Admin validates → buyer's offers on that listing are blocked
-- and the listing is relisted (confirmation_pending reset).
-- ────────────────────────────────────────────────────────────
create table if not exists public.market_reports (
  id                  uuid default uuid_generate_v4() primary key,
  listing_id          uuid references public.market_listings(id) on delete cascade not null,
  -- The specific offer that was not honoured (nullable for general reports)
  offer_id            uuid references public.market_offers(id) on delete set null,
  -- Who filed the report
  reported_by         uuid references public.profiles(id) on delete cascade not null,
  -- Who is being reported
  reported_profile_id uuid references public.profiles(id) on delete cascade not null,
  reason              text not null,
  -- pending → validated (triggers relist) | rejected
  status              text not null default 'pending'
                           check (status in ('pending', 'validated', 'rejected')),
  admin_note          text,
  created_at          timestamptz default now()
);

create index if not exists market_reports_status_idx on public.market_reports (status);
create index if not exists market_reports_reported_profile_idx
  on public.market_reports (reported_profile_id);

-- ────────────────────────────────────────────────────────────
-- TABLE: market_follows
-- Users can follow listings to track them in "Mes suivis".
-- Composite PK prevents duplicate follows.
-- ────────────────────────────────────────────────────────────
create table if not exists public.market_follows (
  profile_id uuid references public.profiles(id) on delete cascade not null,
  listing_id uuid references public.market_listings(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (profile_id, listing_id)
);

create index if not exists market_follows_profile_id_idx on public.market_follows (profile_id);

alter table public.market_follows enable row level security;

-- Users can see and manage only their own follows
create policy "market_follows_select" on public.market_follows for select
  using (auth.uid() = profile_id);

create policy "market_follows_insert" on public.market_follows for insert
  with check (auth.uid() = profile_id);

create policy "market_follows_delete" on public.market_follows for delete
  using (auth.uid() = profile_id);

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
-- RLS — raid_records
-- ────────────────────────────────────────────────────────────
alter table public.raid_records enable row level security;

create policy "select_own_records"
  on public.raid_records for select
  using (
    status = 'approved'
    or auth.uid() = submitted_by
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "admin_update_records"
  on public.raid_records for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "insert_own_records"
  on public.raid_records for insert
  with check (auth.uid() = submitted_by);

-- ────────────────────────────────────────────────────────────
-- RLS — market_listings
-- ────────────────────────────────────────────────────────────
alter table public.market_listings enable row level security;

-- Anyone can read active/sold listings; owner and admins can see their own archived
create policy "market_listings_select"
  on public.market_listings for select
  using (
    status in ('active', 'sold')
    or auth.uid() = profile_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Authenticated users can create listings
create policy "market_listings_insert"
  on public.market_listings for insert
  with check (auth.uid() = profile_id);

-- Owner or admin can update (archive, confirm sale, etc.)
create policy "market_listings_update"
  on public.market_listings for update
  using (
    auth.uid() = profile_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- RLS — market_offers
-- ────────────────────────────────────────────────────────────
alter table public.market_offers enable row level security;

-- Offer owner and listing owner can see offers
create policy "market_offers_select"
  on public.market_offers for select
  using (
    auth.uid() = profile_id
    or exists (
      select 1 from public.market_listings ml
      where ml.id = listing_id and ml.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Authenticated users can insert offers (business logic enforced in app)
create policy "market_offers_insert"
  on public.market_offers for insert
  with check (auth.uid() = profile_id);

-- Offer owner can cancel (update status); admins can block
create policy "market_offers_update"
  on public.market_offers for update
  using (
    auth.uid() = profile_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- RLS — market_reports
-- ────────────────────────────────────────────────────────────
alter table public.market_reports enable row level security;

-- Reporter can see their own reports; admins see all
create policy "market_reports_select"
  on public.market_reports for select
  using (
    auth.uid() = reported_by
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Authenticated users can file reports
create policy "market_reports_insert"
  on public.market_reports for insert
  with check (auth.uid() = reported_by);

-- Only admins can validate/reject reports
create policy "market_reports_admin_update"
  on public.market_reports for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

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
-- FUNCTION: validate_market_report
-- Called by admin to validate a report against a buyer.
-- Effects:
--   1. Report status → 'validated'
--   2. All offers from reported buyer on that listing → 'blocked'
--   3. reported_profile_id added to listing.blocked_profiles
--   4. listing confirmation_pending reset (relisted)
--   5. listing accepted_offer_id cleared
--   6. profiles.trades_reported incremented for reported user
-- ────────────────────────────────────────────────────────────
create or replace function public.validate_market_report(
  p_report_id uuid,
  p_admin_note text default null
)
returns void as $$
declare
  v_listing_id         uuid;
  v_reported_profile   uuid;
begin
  -- Fetch report details
  select listing_id, reported_profile_id
    into v_listing_id, v_reported_profile
    from public.market_reports
   where id = p_report_id and status = 'pending';

  if not found then
    raise exception 'Report not found or already processed';
  end if;

  -- 1. Mark report as validated
  update public.market_reports
     set status = 'validated', admin_note = p_admin_note
   where id = p_report_id;

  -- 2. Block all active offers from reported buyer on this listing
  update public.market_offers
     set status = 'blocked'
   where listing_id = v_listing_id
     and profile_id = v_reported_profile
     and status = 'active';

  -- 3. Add buyer to blocked_profiles + reset confirmation state (relist)
  update public.market_listings
     set blocked_profiles     = array_append(blocked_profiles, v_reported_profile),
         confirmation_pending = false,
         accepted_offer_id    = null,
         status               = 'active'
   where id = v_listing_id;

  -- 4. Increment trades_reported on the reported user's profile
  update public.profiles
     set trades_reported = trades_reported + 1
   where id = v_reported_profile;
end;
$$ language plpgsql security definer;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: confirm_market_sale
-- Called by seller to confirm the accepted offer.
-- Effects:
--   1. Accepted offer status → 'accepted'
--   2. Listing status → 'sold'
--   3. profiles.trades_completed incremented for both parties
-- ────────────────────────────────────────────────────────────
create or replace function public.confirm_market_sale(
  p_listing_id uuid
)
returns void as $$
declare
  v_offer_id     uuid;
  v_buyer_id     uuid;
  v_seller_id    uuid;
begin
  select accepted_offer_id, profile_id
    into v_offer_id, v_seller_id
    from public.market_listings
   where id = p_listing_id
     and confirmation_pending = true
     and profile_id = auth.uid();

  if not found then
    raise exception 'Listing not found or not in confirmation state';
  end if;

  select profile_id into v_buyer_id
    from public.market_offers where id = v_offer_id;

  -- Mark offer accepted
  update public.market_offers set status = 'accepted' where id = v_offer_id;

  -- Close listing
  update public.market_listings
     set status = 'sold', confirmation_pending = false
   where id = p_listing_id;

  -- Increment completed trades for both parties
  update public.profiles
     set trades_completed = trades_completed + 1
   where id in (v_seller_id, v_buyer_id);
end;
$$ language plpgsql security definer;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: admin_set_moderation
-- Admin-only: mute or ban a profile from the market.
-- Actions:
--   'mute'   + p_duration_days → sets muted_until = now() + interval
--   'ban'    → sets is_banned = true, clears muted_until
--   'unmute' → clears muted_until
--   'unban'  → sets is_banned = false
-- ────────────────────────────────────────────────────────────
create or replace function public.admin_set_moderation(
  p_profile_id    uuid,
  p_action        text,   -- 'mute' | 'ban' | 'unmute' | 'unban'
  p_duration_days int default null
)
returns void as $$
begin
  -- Caller must be admin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Permission denied: admin only';
  end if;

  if p_action = 'mute' then
    if p_duration_days is null or p_duration_days <= 0 then
      raise exception 'Duration required for mute action';
    end if;
    update public.profiles
       set muted_until = now() + (p_duration_days || ' days')::interval
     where id = p_profile_id;

  elsif p_action = 'ban' then
    update public.profiles
       set is_banned = true, muted_until = null
     where id = p_profile_id;

  elsif p_action = 'unmute' then
    update public.profiles
       set muted_until = null
     where id = p_profile_id;

  elsif p_action = 'unban' then
    update public.profiles
       set is_banned = false
     where id = p_profile_id;

  else
    raise exception 'Unknown moderation action: %', p_action;
  end if;
end;
$$ language plpgsql security definer;

-- ────────────────────────────────────────────────────────────
-- ADMIN MANAGEMENT
-- Grant:  UPDATE public.profiles SET is_admin = true  WHERE username = 'NAME';
-- Revoke: UPDATE public.profiles SET is_admin = false WHERE username = 'NAME';
-- Reference file: supabase/admin_setup.sql
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- MIGRATION A — upgrading from v1 schema (pre-server / pre-market)
-- Run ONLY if you had the original schema without server/planner/admin.
-- Uncomment and execute in Supabase SQL editor.
-- ────────────────────────────────────────────────────────────

-- [v1 → v2] Clean up old tables (only if you ran the very first schema):

-- -- Add columns to profiles (v1 → v2):
-- alter table public.profiles
--   add column if not exists server          text check (server in ('undercity', 'dragonveil')),
--   add column if not exists planner_data    jsonb,
--   add column if not exists is_admin        boolean not null default false,
--   add column if not exists discord_handle  text,
--   add column if not exists trades_completed int not null default 0,
--   add column if not exists trades_reported  int not null default 0;

-- -- Add server column to characters (v1 → v2):
-- alter table public.characters
--   add column if not exists server text check (server in ('undercity', 'dragonveil'));

-- -- Drop old tables if present:
-- drop table if exists public.activity_log;
-- drop table if exists public.achievements;
-- drop table if exists public.equipment;
-- drop table if exists public.player_stats;

-- -- Remove old columns from profiles if present:
-- alter table public.profiles
--   drop column if exists name,
--   drop column if exists class,
--   drop column if exists sub_class,
--   drop column if exists level,
--   drop column if exists hero_level,
--   drop column if exists server_old,
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

-- ────────────────────────────────────────────────────────────
-- MIGRATION B — add market feature
-- Run if you already have profiles / characters / raid_records
-- but not yet the market tables.
-- Execute the blocks IN ORDER in the Supabase SQL editor.
-- ────────────────────────────────────────────────────────────

-- STEP 1 — Add market reputation columns to profiles
--   (no-op if they already exist thanks to IF NOT EXISTS)
-- alter table public.profiles
--   add column if not exists discord_handle   text,
--   add column if not exists trades_completed int not null default 0,
--   add column if not exists trades_reported  int not null default 0;

-- STEP 2 — Create market_listings (no accepted_offer_id FK yet)
-- create table if not exists public.market_listings (
--   id                   uuid default uuid_generate_v4() primary key,
--   type                 text not null check (type in ('sell', 'buy')),
--   profile_id           uuid references public.profiles(id) on delete cascade not null,
--   server               text not null check (server in ('undercity', 'dragonveil')),
--   title                text not null,
--   description          text,
--   tags                 text[] not null default '{}',
--   image_urls           text[] not null default '{}',
--   base_price           bigint check (base_price >= 0),
--   buyout_price         bigint check (buyout_price >= 0),
--   status               text not null default 'active'
--                             check (status in ('active', 'sold', 'archived')),
--   confirmation_pending boolean not null default false,
--   accepted_offer_id    uuid,
--   blocked_profiles     uuid[] not null default '{}',
--   last_activity_at     timestamptz not null default now(),
--   created_at           timestamptz default now()
-- );
-- create index if not exists market_listings_server_type_idx
--   on public.market_listings (server, type, status);
-- create index if not exists market_listings_last_activity_idx
--   on public.market_listings (last_activity_at);

-- STEP 3 — Create market_offers
-- create table if not exists public.market_offers (
--   id         uuid default uuid_generate_v4() primary key,
--   listing_id uuid references public.market_listings(id) on delete cascade not null,
--   profile_id uuid references public.profiles(id) on delete cascade not null,
--   price      bigint check (price >= 0),
--   comment    text,
--   image_url  text,
--   status     text not null default 'active'
--                   check (status in ('active', 'cancelled', 'accepted', 'blocked')),
--   created_at timestamptz default now()
-- );
-- create index if not exists market_offers_listing_id_idx on public.market_offers (listing_id);

-- STEP 4 — Add circular FK from market_listings → market_offers
-- alter table public.market_listings
--   add constraint market_listings_accepted_offer_id_fkey
--   foreign key (accepted_offer_id) references public.market_offers(id)
--   on delete set null;

-- STEP 5 — Create market_reports
-- create table if not exists public.market_reports (
--   id                  uuid default uuid_generate_v4() primary key,
--   listing_id          uuid references public.market_listings(id) on delete cascade not null,
--   offer_id            uuid references public.market_offers(id) on delete set null,
--   reported_by         uuid references public.profiles(id) on delete cascade not null,
--   reported_profile_id uuid references public.profiles(id) on delete cascade not null,
--   reason              text not null,
--   status              text not null default 'pending'
--                            check (status in ('pending', 'validated', 'rejected')),
--   admin_note          text,
--   created_at          timestamptz default now()
-- );
-- create index if not exists market_reports_status_idx on public.market_reports (status);
-- create index if not exists market_reports_reported_profile_idx
--   on public.market_reports (reported_profile_id);

-- STEP 6 — Create market_follows
-- create table if not exists public.market_follows (
--   profile_id uuid references public.profiles(id) on delete cascade not null,
--   listing_id uuid references public.market_listings(id) on delete cascade not null,
--   created_at timestamptz default now(),
--   primary key (profile_id, listing_id)
-- );
-- create index if not exists market_follows_profile_id_idx on public.market_follows (profile_id);

-- STEP 7 — Enable RLS on all market tables
-- alter table public.market_listings enable row level security;
-- alter table public.market_offers   enable row level security;
-- alter table public.market_reports  enable row level security;
-- alter table public.market_follows  enable row level security;

-- STEP 8 — RLS policies: market_listings
-- create policy "market_listings_select" on public.market_listings for select
--   using (
--     status in ('active', 'sold')
--     or auth.uid() = profile_id
--     or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
--   );
-- create policy "market_listings_insert" on public.market_listings for insert
--   with check (auth.uid() = profile_id);
-- create policy "market_listings_update" on public.market_listings for update
--   using (
--     auth.uid() = profile_id
--     or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
--   );

-- STEP 9 — RLS policies: market_offers
-- create policy "market_offers_select" on public.market_offers for select
--   using (
--     auth.uid() = profile_id
--     or exists (select 1 from public.market_listings ml where ml.id = listing_id and ml.profile_id = auth.uid())
--     or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
--   );
-- create policy "market_offers_insert" on public.market_offers for insert
--   with check (auth.uid() = profile_id);
-- create policy "market_offers_update" on public.market_offers for update
--   using (
--     auth.uid() = profile_id
--     or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
--   );

-- STEP 10 — RLS policies: market_reports
-- create policy "market_reports_select" on public.market_reports for select
--   using (
--     auth.uid() = reported_by
--     or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
--   );
-- create policy "market_reports_insert" on public.market_reports for insert
--   with check (auth.uid() = reported_by);
-- create policy "market_reports_admin_update" on public.market_reports for update
--   using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- STEP 11 — RLS policies: market_follows
-- create policy "market_follows_select" on public.market_follows for select
--   using (auth.uid() = profile_id);
-- create policy "market_follows_insert" on public.market_follows for insert
--   with check (auth.uid() = profile_id);
-- create policy "market_follows_delete" on public.market_follows for delete
--   using (auth.uid() = profile_id);

-- STEP 12 — DB functions (copy-paste from the FUNCTION blocks above):
--   • validate_market_report  (admin validates a report)
--   • confirm_market_sale     (seller confirms a sale)
-- These use CREATE OR REPLACE so they are safe to re-run at any time.

-- ────────────────────────────────────────────────────────────
-- MIGRATION C — add moderation columns to profiles
-- Run if you already have the market schema (Migration B done)
-- but not yet the mute/ban columns.
-- ────────────────────────────────────────────────────────────

-- STEP 1 — Add moderation columns to profiles
alter table public.profiles
  add column if not exists muted_until timestamptz,
  add column if not exists is_banned   boolean not null default false;

-- STEP 2 — Create admin_set_moderation function
-- (copy-paste from the FUNCTION block above — safe to re-run with CREATE OR REPLACE)
-- ✅ Applied — see admin_set_moderation function block above

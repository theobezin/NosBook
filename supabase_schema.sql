-- ============================================================
-- NosBook — Supabase Schema  (état courant, mars 2026)
--
-- INSTALLATION FRAÎCHE :
--   Exécutez ce fichier en entier dans le SQL Editor Supabase.
--
-- MISE À JOUR (DB existante) :
--   Consultez les blocs MIGRATION A/B/C/D en fin de fichier
--   et n'exécutez que les étapes manquantes.
-- ============================================================
--
-- ⚠️  CHECKLIST MISE EN PRODUCTION ⚠️
-- ────────────────────────────────────────────────────────────
-- 1. REALTIME (obligatoire pour l'auto-refresh de la page détail)
--    Activer dans le dashboard Supabase :
--    → Table Editor > market_offers   > bouton "Realtime" > ON
--    → Table Editor > market_listings > bouton "Realtime" > ON
--    Sans ça, la page de détail ne se rafraîchit pas en temps réel
--    (ne casse rien, mais la feature est inactive).
--
-- 2. RLS — vérifier que toutes les policies sont bien appliquées
--    (cf. blocs RLS ci-dessous). En particulier :
--    → market_offers_update : doit inclure le listing owner (pour rejectOffer)
--
-- 3. MIGRATIONS — exécuter dans l'ordre si DB existante :
--    Migration C : muted_until + is_banned sur profiles
--    Migration D : character_name, discord_handle, status 'rejected',
--                  RLS update, index unique re-bid
--
-- 4. ADMIN — accorder les droits admin au(x) compte(s) souhaité(s) :
--    UPDATE public.profiles SET is_admin = true WHERE username = 'NOM';
-- ============================================================

create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- TABLE: profiles
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id               uuid references auth.users(id) on delete cascade primary key,
  username         text unique not null,
  bio              text,
  avatar_url       text,
  -- Serveur principal du joueur : 'undercity' | 'dragonveil'
  server           text check (server in ('undercity', 'dragonveil')),
  planner_data     jsonb,
  is_admin         boolean not null default false,
  -- Réputation marché
  discord_handle   text,
  trades_completed int not null default 0,
  trades_reported  int not null default 0,
  -- Modération marché (géré via admin_set_moderation)
  muted_until      timestamptz,
  is_banned        boolean not null default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- TABLE: characters
-- ────────────────────────────────────────────────────────────
create table if not exists public.characters (
  id          text primary key,
  profile_id  uuid references public.profiles(id) on delete cascade not null,
  sort_order  int  not null default 0,
  name        text not null,
  -- Dénormalisé depuis profiles.server à la création (immuable)
  server      text check (server in ('undercity', 'dragonveil')),
  class       text not null check (class in ('Archer', 'Swordsman', 'Mage', 'Martial')),
  level       int  not null default 1 check (level between 1 and 99),
  hero_level  int  not null default 0,
  prestige    int  not null default 0,
  element     text not null default 'Neutral'
                   check (element in ('Neutral', 'Fire', 'Water', 'Light', 'Shadow')),
  stats       jsonb not null default '{}',

  -- { weapon, offhand, armor, hat, gloves, shoes, necklace, ring, bracelet,
  --   costumeWings, costumeTop, costumeBottom, costumeWeapon,
  --   specialists: [], fairies: [], tattoos: [] }
  -- All new fields are stored in this JSONB — no migration required.
  equipment   jsonb not null default '{}',
  resistances jsonb not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists characters_profile_id_idx on public.characters (profile_id);

-- Unicité nom de personnage par serveur (insensible à la casse)
create unique index if not exists characters_name_server_unique
  on public.characters (lower(name), server)
  where server is not null;

-- ────────────────────────────────────────────────────────────
-- TABLE: raid_records
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
  status        text        not null default 'pending'
                            check (status in ('pending', 'approved', 'rejected')),
  admin_note    text
);

create index if not exists raid_records_slug_time_idx on public.raid_records (raid_slug, time_seconds asc);
create index if not exists raid_records_server_idx    on public.raid_records (server);
create index if not exists raid_records_status_idx    on public.raid_records (status);

-- ────────────────────────────────────────────────────────────
-- TABLE: market_listings
-- ────────────────────────────────────────────────────────────
create table if not exists public.market_listings (
  id                   uuid default uuid_generate_v4() primary key,
  type                 text not null check (type in ('sell', 'buy')),
  profile_id           uuid references public.profiles(id) on delete cascade not null,
  server               text not null check (server in ('undercity', 'dragonveil')),
  title                text not null,
  description          text,
  tags                 text[] not null default '{}',
  image_urls           text[] not null default '{}',
  base_price           bigint check (base_price >= 0),
  buyout_price         bigint check (buyout_price >= 0),
  status               text not null default 'active'
                            check (status in ('active', 'sold', 'archived')),
  confirmation_pending boolean not null default false,
  accepted_offer_id    uuid,                           -- FK ajoutée après market_offers
  blocked_profiles     uuid[] not null default '{}',
  last_activity_at     timestamptz not null default now(),
  created_at           timestamptz default now()
);

create index if not exists market_listings_server_type_idx
  on public.market_listings (server, type, status);
create index if not exists market_listings_last_activity_idx
  on public.market_listings (last_activity_at);

-- ────────────────────────────────────────────────────────────
-- TABLE: market_offers
-- ────────────────────────────────────────────────────────────
create table if not exists public.market_offers (
  id             uuid default uuid_generate_v4() primary key,
  listing_id     uuid references public.market_listings(id) on delete cascade not null,
  profile_id     uuid references public.profiles(id) on delete cascade not null,
  -- Prix en or (requis pour enchères WTS, null pour réponses WTB)
  price          bigint check (price >= 0),
  comment        text,
  -- URL screenshot (réponses WTB)
  image_url      text,
  -- Identité de l'offreur (saisis manuellement ou depuis la liste de persos)
  character_name text,
  discord_handle text,
  -- active → accepted | rejected | cancelled | blocked
  status         text not null default 'active'
                      check (status in ('active', 'cancelled', 'accepted', 'rejected', 'blocked')),
  created_at     timestamptz default now()
);

create index if not exists market_offers_listing_id_idx on public.market_offers (listing_id);

-- Un seul offre active/acceptée par utilisateur par annonce.
-- Les offres rejected/cancelled/blocked sont exclues → re-bid autorisé après refus.
create unique index if not exists market_offers_one_per_user_idx
  on public.market_offers (listing_id, profile_id)
  where status not in ('cancelled', 'blocked', 'rejected');

-- FK circulaire market_listings → market_offers (après création des deux tables)
alter table public.market_listings
  add constraint market_listings_accepted_offer_id_fkey
  foreign key (accepted_offer_id) references public.market_offers(id)
  on delete set null;

-- ────────────────────────────────────────────────────────────
-- TABLE: market_reports
-- ────────────────────────────────────────────────────────────
create table if not exists public.market_reports (
  id                  uuid default uuid_generate_v4() primary key,
  listing_id          uuid references public.market_listings(id) on delete cascade not null,
  offer_id            uuid references public.market_offers(id) on delete set null,
  reported_by         uuid references public.profiles(id) on delete cascade not null,
  reported_profile_id uuid references public.profiles(id) on delete cascade not null,
  reason              text not null,
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
-- ────────────────────────────────────────────────────────────
create table if not exists public.market_follows (
  profile_id uuid references public.profiles(id) on delete cascade not null,
  listing_id uuid references public.market_listings(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (profile_id, listing_id)
);

create index if not exists market_follows_profile_id_idx on public.market_follows (profile_id);

-- ────────────────────────────────────────────────────────────
-- TABLE: market_offer_cooldowns
-- Anti-spam : limite les enchères/annulations répétées sur une même annonce.
--
-- Comportement :
--   • Chaque annulation acheteur (via cancel_offer) incrémente cancel_count.
--   • Au 3e cancel sur la même annonce : cooldown_until = now() + 30 min.
--   • La fonction create_offer bloque toute nouvelle offre si cooldown actif.
--   • Si cooldown_until est expiré au moment d'un nouveau cancel :
--     le compteur repart à 1 (ardoise propre après avoir purgé le cooldown).
--   • Seul le refus acheteur compte (cancel_offer). Un rejet vendeur
--     (rejectOffer) n'incrémente PAS ce compteur.
--   • Les lignes sont supprimées en CASCADE si l'annonce est supprimée.
--
-- RLS :
--   • SELECT autorisé pour le propriétaire (affichage éventuel côté client).
--   • INSERT/UPDATE/DELETE uniquement via fonctions SECURITY DEFINER
--     (cancel_offer, create_offer) — aucun accès direct utilisateur.
-- ────────────────────────────────────────────────────────────
create table if not exists public.market_offer_cooldowns (
  profile_id     uuid        not null references public.profiles(id)         on delete cascade,
  listing_id     uuid        not null references public.market_listings(id)  on delete cascade,
  cancel_count   int         not null default 1
                             check (cancel_count >= 0),
  cooldown_until timestamptz,          -- null = pas de cooldown actif
  primary key (profile_id, listing_id)
);

-- Index : lookup rapide lors du check dans create_offer
create index if not exists market_offer_cooldowns_lookup_idx
  on public.market_offer_cooldowns (profile_id, listing_id);

alter table public.market_offer_cooldowns enable row level security;

-- L'utilisateur peut lire son propre cooldown (pour affichage client si besoin)
create policy "cooldowns_select_own"
  on public.market_offer_cooldowns for select
  using (auth.uid() = profile_id);

-- Pas de policy INSERT/UPDATE/DELETE : seules les fonctions SECURITY DEFINER
-- (cancel_offer, create_offer) peuvent modifier cette table.

-- ────────────────────────────────────────────────────────────
-- RLS — profiles
-- ────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles_select_all"
  on public.profiles for select using (true);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- RLS — characters
-- ────────────────────────────────────────────────────────────
alter table public.characters enable row level security;

create policy "characters_select_all"
  on public.characters for select using (true);

create policy "characters_manage_own"
  on public.characters for all
  using (auth.uid() = profile_id);

-- ────────────────────────────────────────────────────────────
-- RLS — raid_records
-- ────────────────────────────────────────────────────────────
alter table public.raid_records enable row level security;

create policy "raid_records_read_approved"
  on public.raid_records for select
  using (status = 'approved');

create policy "raid_records_read_own"
  on public.raid_records for select to authenticated
  using (submitted_by = auth.uid());

create policy "raid_records_admin_read"
  on public.raid_records for select to authenticated
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "raid_records_insert_own"
  on public.raid_records for insert to authenticated
  with check (submitted_by = auth.uid() and status = 'pending');

create policy "raid_records_admin_update"
  on public.raid_records for update to authenticated
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- ────────────────────────────────────────────────────────────
-- RLS — market_listings
-- ────────────────────────────────────────────────────────────
alter table public.market_listings enable row level security;

create policy "market_listings_select"
  on public.market_listings for select
  using (
    status in ('active', 'sold')
    or auth.uid() = profile_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "market_listings_insert"
  on public.market_listings for insert
  with check (auth.uid() = profile_id);

create policy "market_listings_update"
  on public.market_listings for update
  using (
    auth.uid() = profile_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ────────────────────────────────────────────────────────────
-- RLS — market_offers
-- ────────────────────────────────────────────────────────────
alter table public.market_offers enable row level security;

create policy "market_offers_select"
  on public.market_offers for select
  using (
    auth.uid() = profile_id
    or exists (
      select 1 from public.market_listings ml
      where ml.id = listing_id and ml.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "market_offers_insert"
  on public.market_offers for insert
  with check (auth.uid() = profile_id);

-- Offer owner, listing owner (for reject), or admin can update
create policy "market_offers_update"
  on public.market_offers for update
  using (
    auth.uid() = profile_id
    or exists (
      select 1 from public.market_listings ml
      where ml.id = listing_id and ml.profile_id = auth.uid()
    )
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ────────────────────────────────────────────────────────────
-- RLS — market_reports
-- ────────────────────────────────────────────────────────────
alter table public.market_reports enable row level security;

create policy "market_reports_select"
  on public.market_reports for select
  using (
    auth.uid() = reported_by
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "market_reports_insert"
  on public.market_reports for insert
  with check (auth.uid() = reported_by);

create policy "market_reports_admin_update"
  on public.market_reports for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- ────────────────────────────────────────────────────────────
-- RLS — market_follows
-- ────────────────────────────────────────────────────────────
alter table public.market_follows enable row level security;

create policy "market_follows_select"
  on public.market_follows for select
  using (auth.uid() = profile_id);

create policy "market_follows_insert"
  on public.market_follows for insert
  with check (auth.uid() = profile_id);

create policy "market_follows_delete"
  on public.market_follows for delete
  using (auth.uid() = profile_id);

-- ────────────────────────────────────────────────────────────
-- TRIGGER: auto-création du profil à l'inscription
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
-- FUNCTION: validate_market_report
-- Admin valide un signalement acheteur.
-- Effets : report → validated, offres acheteur → blocked,
--          listing → relist, trades_reported++
-- ────────────────────────────────────────────────────────────
create or replace function public.validate_market_report(
  p_report_id  uuid,
  p_admin_note text default null
)
returns void as $$
declare
  v_listing_id       uuid;
  v_reported_profile uuid;
begin
  select listing_id, reported_profile_id
    into v_listing_id, v_reported_profile
    from public.market_reports
   where id = p_report_id and status = 'pending';

  if not found then
    raise exception 'Report not found or already processed';
  end if;

  update public.market_reports
     set status = 'validated', admin_note = p_admin_note
   where id = p_report_id;

  update public.market_offers
     set status = 'blocked'
   where listing_id = v_listing_id
     and profile_id = v_reported_profile
     and status = 'active';

  update public.market_listings
     set blocked_profiles     = array_append(blocked_profiles, v_reported_profile),
         confirmation_pending = false,
         accepted_offer_id    = null,
         status               = 'active'
   where id = v_listing_id;

  update public.profiles
     set trades_reported = trades_reported + 1
   where id = v_reported_profile;
end;
$$ language plpgsql security definer;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: confirm_market_sale
-- Vendeur confirme l'offre acceptée.
-- Effets : offre → accepted, autres offres actives → rejected,
--          listing → sold, trades_completed++ pour les deux parties
-- ────────────────────────────────────────────────────────────
create or replace function public.confirm_market_sale(
  p_listing_id uuid
)
returns void as $$
declare
  v_offer_id  uuid;
  v_buyer_id  uuid;
  v_seller_id uuid;
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

  -- Accepter l'offre choisie
  update public.market_offers set status = 'accepted' where id = v_offer_id;

  -- Refuser toutes les autres offres actives
  update public.market_offers
     set status = 'rejected'
   where listing_id = p_listing_id
     and id <> v_offer_id
     and status = 'active';

  -- Clôturer l'annonce + démarrer le timer 30j d'affichage (auto-archive client-side)
  update public.market_listings
     set status = 'sold', confirmation_pending = false, last_activity_at = now()
   where id = p_listing_id;

  -- Incrémenter le compteur de transactions
  update public.profiles
     set trades_completed = trades_completed + 1
   where id in (v_seller_id, v_buyer_id);
end;
$$ language plpgsql security definer;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: reject_offer
-- Propriétaire de l'annonce rejette une offre active.
-- Vérifie la propriété côté DB (security definer).
-- ────────────────────────────────────────────────────────────
create or replace function public.reject_offer(
  p_offer_id uuid
)
returns void as $$
declare
  v_listing_owner uuid;
begin
  select ml.profile_id into v_listing_owner
    from public.market_offers mo
    join public.market_listings ml on ml.id = mo.listing_id
   where mo.id = p_offer_id
     and mo.status = 'active';

  if not found then
    raise exception 'Offer not found or not active';
  end if;

  if v_listing_owner <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  update public.market_offers
     set status = 'rejected'
   where id = p_offer_id;
end;
$$ language plpgsql security definer;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: cancel_offer
-- Acheteur annule son offre active.
-- Réinitialise aussi confirmation_pending sur l'annonce si l'offre
-- était en attente de validation vendeur (achat immédiat déclenché).
-- Bloque l'annulation si l'offre est déjà acceptée (vendeur a confirmé).
-- Incrémente le compteur anti-spam dans market_offer_cooldowns :
--   • 3 annulations sur la même annonce → cooldown de 30 min.
--   • Si cooldown expiré au moment du cancel → compteur remis à 1.
-- ────────────────────────────────────────────────────────────
create or replace function public.cancel_offer(p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
  v_profile_id uuid;
  v_status     text;
begin
  select listing_id, profile_id, status
    into v_listing_id, v_profile_id, v_status
  from market_offers
  where id = p_offer_id;

  if v_profile_id is null then
    raise exception 'Offre introuvable';
  end if;

  if v_profile_id <> auth.uid() then
    raise exception 'Non autorisé';
  end if;

  -- Seule une offre encore active peut être annulée
  -- (pas si le vendeur a déjà confirmé → status = 'accepted')
  if v_status <> 'active' then
    raise exception 'Cette offre ne peut plus être annulée';
  end if;

  update market_offers
  set status = 'cancelled'
  where id = p_offer_id;

  -- Réinitialiser l'annonce si c'était l'offre en attente de confirmation
  update market_listings
  set confirmation_pending = false,
      accepted_offer_id    = null
  where id = v_listing_id
    and accepted_offer_id = p_offer_id;

  -- ── Anti-spam : mise à jour du compteur d'annulations ────
  -- Calcul du nouveau cancel_count :
  --   • Pas de ligne existante             → 1 (première annulation)
  --   • cooldown_until IS NULL             → incrémente (pas encore de cooldown déclenché)
  --   • cooldown_until expiré              → repart à 1 (ardoise propre après purge)
  --   • cooldown_until actif               → incrémente (ne devrait pas arriver :
  --                                          create_offer bloque déjà, mais on gère)
  --   • Si nouveau count >= 3              → déclenche cooldown 30 min
  -- ⚠️  BUG CORRIGÉ : l'ancienne condition groupait "NULL" et "expiré" → reset
  --    systématique à 1, empêchant le compteur de monter au-delà de 1.
  with new_state as (
    select
      case
        when c.profile_id is null                                        then 1
        when c.cooldown_until is not null and c.cooldown_until < now()   then 1
        else c.cancel_count + 1
      end as cnt
    from             (select 1) dummy
    left join public.market_offer_cooldowns c
           on c.profile_id = v_profile_id
          and c.listing_id = v_listing_id
  )
  insert into public.market_offer_cooldowns
         (profile_id, listing_id, cancel_count, cooldown_until)
  select v_profile_id,
         v_listing_id,
         cnt,
         case when cnt >= 3 then now() + interval '30 minutes' else null end
  from   new_state
  on conflict (profile_id, listing_id) do update
    set cancel_count   = excluded.cancel_count,
        cooldown_until = excluded.cooldown_until;
end;
$$;

grant execute on function public.cancel_offer(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: create_offer
-- Crée une offre après vérification du cooldown anti-spam.
-- Remplace l'INSERT direct côté client (RLS ne peut pas vérifier
-- market_offer_cooldowns avant l'insert).
-- En cas de cooldown actif : RAISE EXCEPTION 'COOLDOWN:<minutes>'
-- Le client parse ce message pour afficher le temps restant.
-- ────────────────────────────────────────────────────────────
create or replace function public.create_offer(
  p_listing_id     uuid,
  p_price          bigint  default null,
  p_comment        text    default null,
  p_image_url      text    default null,
  p_character_name text    default null,
  p_discord_handle text    default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cooldown_until timestamptz;
  v_remaining_min  int;
  v_offer_id       uuid;
  v_result         json;
begin
  -- ── Vérification cooldown anti-spam ──────────────────────
  select cooldown_until
    into v_cooldown_until
  from public.market_offer_cooldowns
  where profile_id = auth.uid()
    and listing_id = p_listing_id;

  if v_cooldown_until is not null and v_cooldown_until > now() then
    -- Arrondit à la minute supérieure, minimum 1 min affiché
    v_remaining_min := greatest(1,
      ceil(extract(epoch from (v_cooldown_until - now())) / 60)::int
    );
    -- Format parsé côté client : "COOLDOWN:<minutes>"
    raise exception 'COOLDOWN:%', v_remaining_min;
  end if;

  -- ── Création de l'offre ───────────────────────────────────
  insert into public.market_offers (
    listing_id, profile_id, price, comment,
    image_url, character_name, discord_handle
  ) values (
    p_listing_id, auth.uid(), p_price, p_comment,
    p_image_url, p_character_name, p_discord_handle
  )
  returning id into v_offer_id;

  -- Mise à jour last_activity_at de l'annonce
  update public.market_listings
  set last_activity_at = now()
  where id = p_listing_id;

  -- Retourne l'offre créée (snake_case — fromDBOffer la mappe côté client)
  select row_to_json(o) into v_result
  from (select * from public.market_offers where id = v_offer_id) o;

  return v_result;
end;
$$;

grant execute on function public.create_offer(uuid, bigint, text, text, text, text) to authenticated;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: admin_set_moderation
-- Admin : mute ou ban un profil du marché.
-- Actions : 'mute' (+ p_duration_days) | 'ban' | 'unmute' | 'unban'
-- ────────────────────────────────────────────────────────────
create or replace function public.admin_set_moderation(
  p_profile_id    uuid,
  p_action        text,
  p_duration_days int default null
)
returns void as $$
begin
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
    update public.profiles set muted_until = null where id = p_profile_id;

  elsif p_action = 'unban' then
    update public.profiles set is_banned = false where id = p_profile_id;

  else
    raise exception 'Unknown moderation action: %', p_action;
  end if;
end;
$$ language plpgsql security definer;

-- ────────────────────────────────────────────────────────────
-- ADMIN
-- Grant  : UPDATE public.profiles SET is_admin = true  WHERE username = 'NOM';
-- Revoke : UPDATE public.profiles SET is_admin = false WHERE username = 'NOM';
-- ────────────────────────────────────────────────────────────
-- TABLE: raid_sessions
-- Sessions de raid planifiées par les leaders.
-- ────────────────────────────────────────────────────────────
create table if not exists public.raid_sessions (
  id                   uuid        primary key default gen_random_uuid(),
  raid_slug            text        not null,
  date                 date        not null,
  time                 time,
  max_players          int         not null default 15 check (max_players between 1 and 100),
  max_chars_per_person int         not null default 1  check (max_chars_per_person between 1 and 10),
  comments             text,
  leader_id            uuid        references auth.users(id) on delete set null,
  created_at           timestamptz not null default now()
);

create index if not exists raid_sessions_date_idx      on public.raid_sessions (date desc);
create index if not exists raid_sessions_leader_id_idx on public.raid_sessions (leader_id);

-- ── RLS — raid_sessions ───────────────────────────────────────
alter table public.raid_sessions enable row level security;

-- Lecture publique : toutes les sessions
create policy "read_all_sessions"
  on public.raid_sessions
  for select
  using (true);

-- Insert : utilisateurs connectés uniquement, leader_id forcé à leur uid
create policy "insert_own_sessions"
  on public.raid_sessions
  for insert
  to authenticated
  with check (leader_id = auth.uid());

-- Update / Delete : le leader peut modifier ou supprimer sa propre session
create policy "manage_own_sessions"
  on public.raid_sessions
  for all
  to authenticated
  using (leader_id = auth.uid());

-- Admin : gestion complète
create policy "admin_manage_sessions"
  on public.raid_sessions
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ── MIGRATION — only needed if you ran the old schema before.
-- ────────────────────────────────────────────────────────────


-- ============================================================
-- MIGRATIONS (DB existante uniquement)
-- N'exécutez que les étapes que vous n'avez pas encore appliquées.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- MIGRATION A — v1 → v2 (pre-server / pre-market)
-- ────────────────────────────────────────────────────────────
-- alter table public.profiles
--   add column if not exists server           text check (server in ('undercity', 'dragonveil')),
--   add column if not exists planner_data     jsonb,
--   add column if not exists is_admin         boolean not null default false,
--   add column if not exists discord_handle   text,
--   add column if not exists trades_completed int not null default 0,
--   add column if not exists trades_reported  int not null default 0;
--
-- alter table public.characters
--   add column if not exists server text check (server in ('undercity', 'dragonveil'));
--
-- create unique index if not exists characters_name_server_unique
--   on public.characters (lower(name), server)
--   where server is not null;
--
-- drop table if exists public.activity_log, public.achievements,
--   public.equipment, public.player_stats;

-- ────────────────────────────────────────────────────────────
-- MIGRATION B — ajout du marché (tables + RLS + fonctions)
-- Exécutez les CREATE TABLE / index / RLS / fonctions ci-dessus
-- dans l'ordre si les tables market_ n'existent pas encore.
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- MIGRATION C — colonnes de modération sur profiles
-- ────────────────────────────────────────────────────────────
-- alter table public.profiles
--   add column if not exists muted_until timestamptz,
--   add column if not exists is_banned   boolean not null default false;
-- -- Puis déployer admin_set_moderation (cf. bloc FUNCTION ci-dessus)

-- ────────────────────────────────────────────────────────────
-- MIGRATION D — character_name / discord_handle + status 'rejected' + re-bid
-- ────────────────────────────────────────────────────────────
-- -- 1. Nouvelles colonnes sur market_offers
-- alter table public.market_offers
--   add column if not exists character_name text,
--   add column if not exists discord_handle text;
--
-- -- 2. Étendre le CHECK status
-- alter table public.market_offers
--   drop constraint if exists market_offers_status_check;
-- alter table public.market_offers
--   add constraint market_offers_status_check
--   check (status in ('active', 'cancelled', 'accepted', 'rejected', 'blocked'));
--
-- -- 3. Mettre à jour la RLS policy pour autoriser le listing owner à rejeter
-- drop policy if exists market_offers_update on public.market_offers;
-- create policy market_offers_update on public.market_offers for update
-- using (
--   auth.uid() = profile_id
--   or exists (
--     select 1 from public.market_listings ml
--     where ml.id = listing_id and ml.profile_id = auth.uid()
--   )
--   or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
-- );
--
-- -- 4. Redéployer confirm_market_sale (cf. bloc FUNCTION ci-dessus)
-- -- 5. Déployer reject_offer          (cf. bloc FUNCTION ci-dessus — optionnel, remplacé par UPDATE direct)
--
-- -- 6. Dédupliquer puis créer l'index unique
-- --    (rejected exclu → re-bid autorisé après refus)
-- with ranked as (
--   select id,
--          row_number() over (
--            partition by listing_id, profile_id
--            order by created_at desc
--          ) as rn
--   from public.market_offers
--   where status not in ('cancelled', 'blocked', 'rejected')
-- )
-- update public.market_offers set status = 'cancelled'
-- where id in (select id from ranked where rn > 1);
--
-- drop index if exists public.market_offers_one_per_user_idx;
-- create unique index market_offers_one_per_user_idx
--   on public.market_offers (listing_id, profile_id)
--   where status not in ('cancelled', 'blocked', 'rejected');

-- ────────────────────────────────────────────────────────────
-- MIGRATION E — fonction cancel_offer (SECURITY DEFINER)
-- Remplace le UPDATE direct côté client qui était bloqué par RLS
-- (le buyer n'a pas le droit UPDATE sur market_listings).
-- La fonction : vérifie ownership, vérifie status = 'active',
-- annule l'offre, réinitialise confirmation_pending si besoin.
-- ────────────────────────────────────────────────────────────
-- Déployer le bloc FUNCTION cancel_offer ci-dessus (search "FUNCTION: cancel_offer").
-- Pas de changement de schéma (colonnes / tables) nécessaire.

-- ────────────────────────────────────────────────────────────
-- MIGRATION F — correctifs i18n + validation mise de départ
-- ────────────────────────────────────────────────────────────
-- Pas de migration SQL. Changements frontend uniquement :
--   • OfferModal lit désormais listing.basePrice (camelCase) au lieu de
--     listing.base_price → la validation mise minimum fonctionne correctement.
--   • Clés i18n ajoutées : myOfferPending, myOfferPendingBuy,
--     myOfferAcceptedBadge, myOfferRejectedBadge, offerErrMinBase (fr/en/de).
--   • StatsPanel : résistant aux erreurs partielles (requêtes profiles RLS).

-- ────────────────────────────────────────────────────────────
-- MIGRATION G — anti-spam enchères (cooldown 30 min après 3 annulations)
-- ────────────────────────────────────────────────────────────
-- Problèmes anticipés et solutions documentées dans le code source.
-- Étapes à exécuter dans l'ordre :
--
-- 1. Créer la table market_offer_cooldowns + index + RLS
--    (cf. bloc TABLE: market_offer_cooldowns ci-dessus)
--
-- create table if not exists public.market_offer_cooldowns ( ... );
-- create index ...;
-- alter table ... enable row level security;
-- create policy ...;
--
-- 2. Redéployer cancel_offer avec suivi du compteur
--    (cf. bloc FUNCTION: cancel_offer ci-dessus — version mise à jour)
--
-- 3. Déployer la nouvelle fonction create_offer
--    (cf. bloc FUNCTION: create_offer ci-dessus)
--
-- 4. Aucune modification de schéma existant nécessaire.
--    Aucune donnée existante à migrer.
--
-- Notes :
--   • Le compteur se remet à 1 après expiration du cooldown (pas d'accumulation).
--   • Seules les annulations acheteur comptent (pas les rejets vendeur).
--   • Les lignes sont supprimées automatiquement si l'annonce est supprimée (CASCADE).
--   • Le client reçoit l'erreur "COOLDOWN:<minutes>" et affiche le temps restant.

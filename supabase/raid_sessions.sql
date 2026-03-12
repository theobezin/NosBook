-- ─────────────────────────────────────────────────────────────────────────────
-- Table : raid_sessions
-- Créée pour la fonctionnalité "Organisation de Raids" (côté Leader)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.raid_sessions (
  id                   uuid        primary key default gen_random_uuid(),
  created_at           timestamptz not null    default now(),

  -- Raid ciblé (slug = identifiant stable ex: "demon-god-belial")
  raid_slug            text        not null,

  -- Planification
  date                 date        not null,
  time                 time,

  -- Paramètres de session
  min_level            smallint    not null    default 1,
  max_players          smallint    not null    default 15,
  max_chars_per_person smallint    not null    default 1,

  -- Équipes (tableau de noms, ex: ["Équipe 1", "Équipe 2"])
  teams                text[]      not null    default array['Équipe 1'],

  -- Informations libres
  comments             text,

  -- Leader (peut être null si pas encore authentifié)
  leader_id            uuid        references auth.users(id) on delete set null
);

-- ── Index ────────────────────────────────────────────────────────────────────

-- Requête typique : sessions à venir triées par date
create index if not exists idx_raid_sessions_date
  on public.raid_sessions (date asc);

-- Filtrage par leader
create index if not exists idx_raid_sessions_leader
  on public.raid_sessions (leader_id);

-- ── RLS (Row Level Security) ──────────────────────────────────────────────────

alter table public.raid_sessions enable row level security;

-- Lecture publique : tout le monde peut voir les sessions
create policy "Sessions visibles par tous"
  on public.raid_sessions for select
  using (true);

-- Création : utilisateurs authentifiés uniquement
create policy "Création réservée aux membres"
  on public.raid_sessions for insert
  to authenticated
  with check (leader_id = auth.uid());

-- Modification : uniquement le leader de la session
create policy "Modification réservée au leader"
  on public.raid_sessions for update
  to authenticated
  using (leader_id = auth.uid());

-- Suppression : uniquement le leader de la session
create policy "Suppression réservée au leader"
  on public.raid_sessions for delete
  to authenticated
  using (leader_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Table : raid_sessions
-- Créée pour la fonctionnalité "Organisation de Raids" (côté Leader)
--
-- ⚠️  UTILISATION
--   • Base vierge  → exécuter CE fichier en entier (crée la table + index + RLS)
--   • Base existante → exécuter UNIQUEMENT les migrations dans supabase/migrations/
--     dans l'ordre numérique (001, 002, …) pour ne pas écraser les données.
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

  -- Leader
  leader_id            uuid        references auth.users(id) on delete set null,
  -- Snapshot du pseudo au moment de la création (évite un JOIN sur profiles)
  -- ⚠️  Base existante : voir migrations/002_add_leader_username.sql
  leader_username      text,

  -- Serveur de jeu (undercity | dragonveil)
  -- Les joueurs ne peuvent rejoindre que les sessions de leur propre serveur.
  -- ⚠️  Base existante : voir migrations/003_add_server_and_duration.sql
  server               text        check (server in ('undercity', 'dragonveil')),

  -- Durée estimée en minutes (optionnel). Utilisée pour afficher l'heure de fin
  -- et pour détecter les chevauchements lors de l'inscription.
  duration_minutes     smallint    check (duration_minutes > 0)
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

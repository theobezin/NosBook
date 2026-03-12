-- ─────────────────────────────────────────────────────────────────────────────
-- Table : raid_session_registrations
-- Une ligne par personnage inscrit à une session de raid
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.raid_session_registrations (
  id                   uuid        primary key default gen_random_uuid(),
  created_at           timestamptz not null    default now(),

  -- Lien vers la session
  session_id           uuid        not null    references public.raid_sessions(id) on delete cascade,

  -- Joueur inscrit
  player_id            uuid        not null    references auth.users(id) on delete cascade,
  player_username      text,

  -- Personnage (référence + snapshot au moment de l'inscription)
  character_id         text,
  character_snapshot   jsonb       not null,
  -- structure du snapshot :
  -- {
  --   "name":       "NomPerso",
  --   "class":      "Archer",
  --   "level":      99,
  --   "heroLevel":  60,
  --   "specialists": [ { "id": "...", "name": "...", "icon": "..." } ]
  -- }

  -- Placement dans la session (null = banc)
  team_name            text,

  -- Carte SP attribuée par le chef de raid pour cette session
  sp_card_name         text,
  sp_card_icon         text,

  -- Contrainte : un joueur ne peut inscrire le même perso qu'une fois par session
  unique (session_id, player_id, character_id)
);

-- ── Index ────────────────────────────────────────────────────────────────────

create index if not exists idx_raid_regs_session
  on public.raid_session_registrations (session_id);

create index if not exists idx_raid_regs_player
  on public.raid_session_registrations (player_id);

-- ── RLS (Row Level Security) ──────────────────────────────────────────────────

alter table public.raid_session_registrations enable row level security;

-- Lecture publique : tout le monde voit les inscriptions d'une session
create policy "Inscriptions visibles par tous"
  on public.raid_session_registrations for select
  using (true);

-- Inscription : membres authentifiés uniquement, pour leur propre compte
create policy "Inscription réservée au joueur lui-même"
  on public.raid_session_registrations for insert
  to authenticated
  with check (player_id = auth.uid());

-- Suppression : le joueur peut se désinscrire lui-même
create policy "Désinscription réservée au joueur"
  on public.raid_session_registrations for delete
  to authenticated
  using (player_id = auth.uid());

-- Mise à jour (team_name, sp_card_*) : uniquement le leader de la session
create policy "Modification réservée au leader"
  on public.raid_session_registrations for update
  to authenticated
  using (
    exists (
      select 1 from public.raid_sessions s
      where s.id = session_id
        and s.leader_id = auth.uid()
    )
  );

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Active la diffusion en temps réel pour que la page de détail se mette à
-- jour automatiquement quand un joueur s'inscrit ou est placé dans une équipe.

alter publication supabase_realtime add table public.raid_session_registrations;

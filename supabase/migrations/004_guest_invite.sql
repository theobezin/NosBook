-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 004 — Invités de session de raid
-- Permet au chef de raid d'ajouter manuellement un joueur non inscrit sur NosBook
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Rendre player_id nullable (les invités n'ont pas de compte)
alter table public.raid_session_registrations
  alter column player_id drop not null;

-- 2. Ajouter la colonne is_guest
alter table public.raid_session_registrations
  add column if not exists is_guest boolean not null default false;

-- 3. Supprimer l'ancienne contrainte unique (ne fonctionne pas avec des valeurs NULL)
alter table public.raid_session_registrations
  drop constraint if exists raid_session_registrations_session_id_player_id_character_id_key;

-- 4. Recréer la contrainte unique uniquement pour les inscriptions normales (non-invités)
create unique index if not exists idx_raid_regs_unique_non_guest
  on public.raid_session_registrations (session_id, player_id, character_id)
  where is_guest = false and player_id is not null;

-- 5. Nouvelle politique RLS : le leader peut insérer des invités
drop policy if exists "Insertion invite par le leader" on public.raid_session_registrations;
create policy "Insertion invite par le leader"
  on public.raid_session_registrations for insert
  to authenticated
  with check (
    is_guest = true
    and player_id is null
    and exists (
      select 1 from public.raid_sessions s
      where s.id = session_id
        and s.leader_id = auth.uid()
    )
  );

-- 6. Nouvelle politique RLS : le leader peut supprimer les invités
drop policy if exists "Suppression invite par le leader" on public.raid_session_registrations;
create policy "Suppression invite par le leader"
  on public.raid_session_registrations for delete
  to authenticated
  using (
    is_guest = true
    and exists (
      select 1 from public.raid_sessions s
      where s.id = session_id
        and s.leader_id = auth.uid()
    )
  );

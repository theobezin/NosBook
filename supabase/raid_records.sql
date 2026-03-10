-- ============================================================
-- Migration : table raid_records (classement PVE speedrun)
-- À exécuter dans le SQL Editor de ton projet Supabase
-- ============================================================

create table public.raid_records (
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

-- ── Index pour les performances ───────────────────────────────
create index raid_records_slug_time_idx on public.raid_records (raid_slug, time_seconds asc);
create index raid_records_server_idx    on public.raid_records (server);
create index raid_records_status_idx   on public.raid_records (status);

-- ── Row Level Security ────────────────────────────────────────
alter table public.raid_records enable row level security;

-- Les visiteurs (non connectés) peuvent lire les records approuvés
create policy "read_approved_records"
  on public.raid_records
  for select
  using (status = 'approved');

-- Les utilisateurs connectés peuvent soumettre un record (status forcé à 'pending')
create policy "insert_own_records"
  on public.raid_records
  for insert
  to authenticated
  with check (submitted_by = auth.uid() and status = 'pending');

-- ── Gestion admin ─────────────────────────────────────────────
-- Pour approuver / rejeter un record, utilise le dashboard Supabase
-- (Table Editor > raid_records > modifier le champ status)
-- Ou crée un rôle admin avec une policy UPDATE dédiée.
--
-- Exemple de mise à jour manuelle via SQL :
--   update public.raid_records set status = 'approved' where id = '<uuid>';
--   update public.raid_records set status = 'rejected', admin_note = 'Preuve invalide' where id = '<uuid>';

-- ============================================================
-- Migration : setup admin
-- À exécuter APRÈS raid_records.sql
-- ============================================================

-- ── 1. Colonne is_admin sur profiles ─────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Pour promouvoir un admin (remplacer par le username réel) :
--   update public.profiles set is_admin = true where username = 'TonPseudo';

-- ── 2. Les admins peuvent lire TOUS les records (pas seulement approved) ──
-- Note : la policy "read_approved_records" reste active pour les non-admins.
-- Supabase RLS est permissif : si UNE policy autorise, la ligne est visible.
create policy "admins_read_all_records"
  on public.raid_records
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ── 3. Les admins peuvent mettre à jour le status et admin_note ───────────
create policy "admins_update_records"
  on public.raid_records
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

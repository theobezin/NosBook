-- ============================================================
-- NosBook — Gestion des admins
-- À exécuter dans le SQL Editor du dashboard Supabase
-- ============================================================


-- ── Promouvoir un utilisateur admin ──────────────────────────

-- Par username :
--   update public.profiles set is_admin = true where username = 'TonPseudo';

-- Par email :
--   update public.profiles
--   set is_admin = true
--   where id = (select id from auth.users where email = 'admin@example.com');


-- ── Révoquer les droits admin ─────────────────────────────────

--   update public.profiles set is_admin = false where username = 'TonPseudo';


-- ── Voir tous les admins actuels ─────────────────────────────

--   select username, created_at from public.profiles where is_admin = true;


-- ── Migration si tables déjà existantes en prod ──────────────
-- (inutile si tu pars d'un schema vierge via supabase_schema.sql)

-- 1. Ajouter la colonne is_admin sur profiles :
--   alter table public.profiles
--     add column if not exists is_admin boolean not null default false;

-- 2. Ajouter la policy SELECT admin (voir pending/rejected) :
--   create policy "admin_select_all_records"
--     on public.raid_records for select to authenticated
--     using (exists (
--       select 1 from public.profiles where id = auth.uid() and is_admin = true
--     ));

-- 3. Ajouter la policy UPDATE admin (approve / reject) :
--   create policy "admin_update_records"
--     on public.raid_records for update to authenticated
--     using (exists (
--       select 1 from public.profiles where id = auth.uid() and is_admin = true
--     ));

-- 4. Ajouter la policy SELECT propre (MySubmissionsPage) :
--   create policy "select_own_records"
--     on public.raid_records for select to authenticated
--     using (submitted_by = auth.uid());

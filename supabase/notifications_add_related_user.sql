-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : ajout de la colonne related_user_id sur notifications
-- Utilisée pour les demandes d'ami (type = 'friend_request') afin de
-- retrouver facilement le demandeur depuis la page de notifications.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.notifications
  add column if not exists related_user_id uuid references auth.users(id) on delete cascade;

-- ─────────────────────────────────────────────────────────────────────────────
-- Table : notifications
-- Notifications in-app créées côté frontend (pas de trigger SQL).
-- Quand le leader poste un message, le client insère une notif pour chaque
-- joueur inscrit à la session.
--
-- ⚠️  UTILISATION
--   • Base vierge  → exécuter ce fichier en entier
--   • Base existante → rien à migrer (nouvelle table)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null    default now(),

  -- Destinataire
  user_id          uuid        not null    references auth.users(id) on delete cascade,

  -- Type (extensible pour d'autres notifs futures)
  type             text        not null    default 'raid_message',

  -- Contexte
  session_id       uuid        references public.raid_sessions(id) on delete cascade,
  session_raid_name text,          -- snapshot du nom du raid (ex: "Roi Poulet")
  content_preview  text,           -- extrait du message

  read             boolean     not null    default false
);

-- ── Index ────────────────────────────────────────────────────────────────────

create index if not exists idx_notifications_user
  on public.notifications (user_id, read, created_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.notifications enable row level security;

-- Chaque utilisateur ne voit que ses propres notifs
create policy "Notifications visibles par leur destinataire"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

-- Insertion : le leader insère des notifs pour les autres joueurs
-- On autorise tout utilisateur authentifié à insérer (la cible est user_id)
create policy "Insertion de notifications"
  on public.notifications for insert
  to authenticated
  with check (true);

-- Mise à jour (marquer comme lue) : uniquement le destinataire
create policy "Lecture réservée au destinataire"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid());

-- Suppression : uniquement le destinataire
create policy "Suppression réservée au destinataire"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- ── Realtime ─────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.notifications;

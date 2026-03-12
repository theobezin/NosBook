-- ─────────────────────────────────────────────────────────────────────────────
-- Table : raid_session_messages
-- Messages postés par le chef de raid dans un canal de discussion de session.
-- Seul le leader peut écrire ; tout le monde peut lire.
--
-- ⚠️  UTILISATION
--   • Base vierge  → exécuter ce fichier en entier
--   • Base existante → rien à migrer (nouvelle table)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.raid_session_messages (
  id             uuid        primary key default gen_random_uuid(),
  created_at     timestamptz not null    default now(),

  session_id     uuid        not null    references public.raid_sessions(id) on delete cascade,
  author_id      uuid        not null    references auth.users(id) on delete cascade,
  author_username text,

  content        text        not null    check (char_length(content) between 1 and 2000)
);

-- ── Index ────────────────────────────────────────────────────────────────────

create index if not exists idx_session_messages_session
  on public.raid_session_messages (session_id, created_at asc);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.raid_session_messages enable row level security;

-- Lecture publique
create policy "Messages visibles par tous"
  on public.raid_session_messages for select
  using (true);

-- Écriture : uniquement le leader de la session
create policy "Messages réservés au leader"
  on public.raid_session_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.raid_sessions s
      where s.id = session_id
        and s.leader_id = auth.uid()
    )
  );

-- Suppression : uniquement le leader
create policy "Suppression réservée au leader"
  on public.raid_session_messages for delete
  to authenticated
  using (author_id = auth.uid());

-- ── Realtime ─────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.raid_session_messages;

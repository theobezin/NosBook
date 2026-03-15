-- ─────────────────────────────────────────────────────────────────────────────
-- Table : friendships
-- Système d'amis : demandes, acceptation, refus.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.friendships (
  id           uuid        primary key default gen_random_uuid(),
  created_at   timestamptz not null    default now(),
  updated_at   timestamptz not null    default now(),

  -- Celui qui envoie la demande
  requester_id uuid        not null    references auth.users(id) on delete cascade,
  -- Celui qui reçoit la demande
  addressee_id uuid        not null    references auth.users(id) on delete cascade,

  -- Statut : 'pending' | 'accepted' | 'rejected'
  status       text        not null    default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),

  unique(requester_id, addressee_id),
  check(requester_id != addressee_id)
);

-- ── Index ────────────────────────────────────────────────────────────────────

create index if not exists idx_friendships_addressee
  on public.friendships (addressee_id, status);

create index if not exists idx_friendships_requester
  on public.friendships (requester_id, status);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.friendships enable row level security;

-- Chaque utilisateur voit uniquement les amis dont il fait partie
create policy "Voir ses amis"
  on public.friendships for select
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- Seul le demandeur peut envoyer une demande (requester_id = soi-même)
create policy "Envoyer une demande d'ami"
  on public.friendships for insert
  to authenticated
  with check (requester_id = auth.uid());

-- Le destinataire peut accepter/refuser ; le demandeur peut annuler (update status)
create policy "Mettre à jour le statut d'amitié"
  on public.friendships for update
  to authenticated
  using (addressee_id = auth.uid() or requester_id = auth.uid());

-- L'un ou l'autre peut supprimer (retirer un ami, annuler une demande)
create policy "Supprimer une amitié"
  on public.friendships for delete
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

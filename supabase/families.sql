-- ─────────────────────────────────────────────────────────────────────────────
-- Familles NosTale
-- Une famille comporte une Tête, deux Assistants max, des Gardiens, des Membres
-- Niveaux 1-30 (progression inspirée de NosTale)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Table familles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.families (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  level      int         NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 30),
  head_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT families_name_unique UNIQUE (name)
);

-- ── Table membres ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_members (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  uuid        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  profile_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'member'
               CHECK (role IN ('head', 'assistant', 'guardian', 'member')),
  joined_at  timestamptz NOT NULL DEFAULT now(),

  -- Un joueur ne peut appartenir qu'à une seule famille
  CONSTRAINT family_members_profile_unique UNIQUE (profile_id)
);

-- ── Index ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_family_members_family  ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_profile ON public.family_members(profile_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.families       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Familles : lecture libre pour tous les authentifiés
CREATE POLICY "families_select" ON public.families
  FOR SELECT USING (true);

-- Familles : création — l'utilisateur doit être la tête
CREATE POLICY "families_insert" ON public.families
  FOR INSERT WITH CHECK (auth.uid() = head_id);

-- Familles : mise à jour — seulement la tête
CREATE POLICY "families_update" ON public.families
  FOR UPDATE USING (auth.uid() = head_id);

-- Familles : suppression — seulement la tête
CREATE POLICY "families_delete" ON public.families
  FOR DELETE USING (auth.uid() = head_id);

-- Membres : lecture libre
CREATE POLICY "family_members_select" ON public.family_members
  FOR SELECT USING (true);

-- Membres : insertion — un joueur insère SA propre entrée (acceptation d'invitation)
CREATE POLICY "family_members_insert" ON public.family_members
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Membres : mise à jour — la tête ou un assistant peuvent modifier n'importe quel membre,
--           un membre peut modifier sa propre ligne
CREATE POLICY "family_members_update" ON public.family_members
  FOR UPDATE USING (
    auth.uid() = profile_id
    OR EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = family_members.family_id
        AND fm.profile_id = auth.uid()
        AND fm.role IN ('head', 'assistant')
    )
  );

-- Membres : suppression — soi-même, ou la tête de la famille
CREATE POLICY "family_members_delete" ON public.family_members
  FOR DELETE USING (
    auth.uid() = profile_id
    OR EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_members.family_id
        AND f.head_id = auth.uid()
    )
  );

-- ── Colonne family_id sur notifications ───────────────────────────────────────
-- Utilisée pour les invitations famille (type = 'family_invite')
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.families(id) ON DELETE CASCADE;

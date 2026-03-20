-- ─────────────────────────────────────────────────────────────────────────────
-- Familles NosTale
-- Chaque PERSONNAGE peut appartenir à une famille différente.
-- Un personnage ne peut appartenir qu'à une seule famille à la fois.
-- Les rôles (Tête, Assistant, Gardien, Membre) sont par membership.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Table familles ────────────────────────────────────────────────────────────
-- head_id : profile_id (public.profiles) du joueur qui gère la famille
CREATE TABLE IF NOT EXISTS public.families (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  server     text        NOT NULL DEFAULT 'undercity'
               CHECK (server IN ('undercity', 'dragonveil')),
  level      int         NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 30),
  head_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Le nom d'une famille doit être unique par serveur
  CONSTRAINT families_name_server_unique UNIQUE (name, server)
);

-- ── Table membres ─────────────────────────────────────────────────────────────
-- character_id : référence characters.id (text)
-- profile_id   : propriétaire du personnage — utile pour les RLS et les requêtes
CREATE TABLE IF NOT EXISTS public.family_members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  character_id text        NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  profile_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         text        NOT NULL DEFAULT 'member'
                 CHECK (role IN ('head', 'assistant', 'guardian', 'member')),
  joined_at    timestamptz NOT NULL DEFAULT now(),

  -- Un personnage dans une seule famille à la fois
  CONSTRAINT family_members_character_unique UNIQUE (character_id)
);

-- ── Index ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_family_members_family    ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_character ON public.family_members(character_id);
CREATE INDEX IF NOT EXISTS idx_family_members_profile   ON public.family_members(profile_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.families       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Familles : lecture libre
CREATE POLICY "families_select" ON public.families
  FOR SELECT USING (true);

-- Familles : création — l'utilisateur doit être la tête (head_id = son profile)
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

-- Membres : insertion — le joueur insère sa propre entrée (acceptation d'invitation)
CREATE POLICY "family_members_insert" ON public.family_members
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Membres : mise à jour — la tête ou un assistant peuvent modifier n'importe quel membre,
--           le membre peut modifier sa propre ligne
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

-- ── Migration : ajout de la colonne server ────────────────────────────────────
ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS server text NOT NULL DEFAULT 'undercity'
    CHECK (server IN ('undercity', 'dragonveil'));

ALTER TABLE public.families DROP CONSTRAINT IF EXISTS families_name_unique;
ALTER TABLE public.families ADD CONSTRAINT IF NOT EXISTS families_name_server_unique
  UNIQUE (name, server);

-- ── Table annonces de recrutement ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_announcements (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  uuid        NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) <= 500),
  created_by uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_announcements_family ON public.family_announcements(family_id);

ALTER TABLE public.family_announcements ENABLE ROW LEVEL SECURITY;

-- Lecture libre
CREATE POLICY "family_announcements_select" ON public.family_announcements
  FOR SELECT USING (true);

-- Insertion : tête ou assistant de la famille uniquement
CREATE POLICY "family_announcements_insert" ON public.family_announcements
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_id = family_announcements.family_id
        AND profile_id = auth.uid()
        AND role IN ('head', 'assistant')
    )
  );

-- Suppression : auteur ou tête/assistant
CREATE POLICY "family_announcements_delete" ON public.family_announcements
  FOR DELETE USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_id = family_announcements.family_id
        AND profile_id = auth.uid()
        AND role IN ('head', 'assistant')
    )
  );

-- ── Migration : tags, recrutement, niveau minimum ─────────────────────────────
ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS tags      text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recruiting boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_level  int     NULL;

-- ── Migration : character_id sur notifications ────────────────────────────────
-- Utilisé pour les demandes de rejoindre (type = 'family_join_request')
-- Stocke le character_id (text) du personnage que le demandeur veut inscrire
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS character_id text NULL;

-- ── RPC : demande de rejoindre une famille ────────────────────────────────────
-- Vérifie recrutement ouvert, perso libre, pas de demande en attente,
-- puis envoie des notifications à la tête + tous les assistants.
CREATE OR REPLACE FUNCTION public.request_join_family(
  p_family_id   uuid,
  p_character_id text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_family     record;
  v_char       record;
  v_recipient  record;
BEGIN
  -- Vérifier que la famille existe et recrute
  SELECT id, name, recruiting, server INTO v_family
    FROM public.families WHERE id = p_family_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'family_not_found'; END IF;
  IF NOT v_family.recruiting THEN RAISE EXCEPTION 'not_recruiting'; END IF;

  -- Vérifier que le personnage appartient à l'appelant
  SELECT id, name, server, profile_id INTO v_char
    FROM public.characters
   WHERE id = p_character_id AND profile_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'character_not_yours'; END IF;

  -- Vérifier que le perso n'est pas déjà dans une famille
  IF EXISTS (SELECT 1 FROM public.family_members WHERE character_id = p_character_id) THEN
    RAISE EXCEPTION 'already_in_family';
  END IF;

  -- Vérifier qu'il n'y a pas déjà une demande en attente pour ce perso dans cette famille
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE type = 'family_join_request'
      AND family_id = p_family_id
      AND character_id = p_character_id
  ) THEN RAISE EXCEPTION 'request_already_sent'; END IF;

  -- Envoyer une notification à la tête et à chaque assistant
  FOR v_recipient IN
    SELECT fm.profile_id
      FROM public.family_members fm
     WHERE fm.family_id = p_family_id
       AND fm.role IN ('head', 'assistant')
  LOOP
    INSERT INTO public.notifications (
      user_id, type, family_id, related_user_id, character_id, content_preview
    ) VALUES (
      v_recipient.profile_id,
      'family_join_request',
      p_family_id,
      auth.uid(),
      p_character_id,
      v_char.name || ' (' || (SELECT username FROM public.profiles WHERE id = auth.uid()) || ')'
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_join_family(uuid, text) TO authenticated;

-- ── RPC : accepter une demande de rejoindre ───────────────────────────────────
-- Insère le membre, supprime toutes les notifs liées à cette demande,
-- et envoie une notif d'acceptation au demandeur.
CREATE OR REPLACE FUNCTION public.accept_join_request(p_notif_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_family_id    uuid;
  v_requester_id uuid;
  v_character_id text;
  v_family_name  text;
BEGIN
  -- Récupérer les infos de la notification
  SELECT family_id, related_user_id, character_id
    INTO v_family_id, v_requester_id, v_character_id
    FROM public.notifications
   WHERE id = p_notif_id
     AND type = 'family_join_request'
     AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'notif_not_found'; END IF;

  -- Vérifier que l'appelant est tête ou assistant de cette famille
  IF NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = v_family_id
      AND profile_id = auth.uid()
      AND role IN ('head', 'assistant')
  ) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  -- Insérer le membre (ignorer si déjà dans la famille)
  INSERT INTO public.family_members (family_id, profile_id, character_id, role)
  VALUES (v_family_id, v_requester_id, v_character_id, 'member')
  ON CONFLICT DO NOTHING;

  -- Supprimer TOUTES les notifs de cette demande (tête + assistants)
  DELETE FROM public.notifications
  WHERE type = 'family_join_request'
    AND family_id = v_family_id
    AND character_id = v_character_id;

  -- Notifier le demandeur
  SELECT name INTO v_family_name FROM public.families WHERE id = v_family_id;
  INSERT INTO public.notifications (user_id, type, family_id, related_user_id, content_preview)
  VALUES (v_requester_id, 'family_join_accepted', v_family_id, auth.uid(), v_family_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_join_request(uuid) TO authenticated;
-- Migration : description et lien discord
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS discord_url text;

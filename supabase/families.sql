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
DROP POLICY IF EXISTS "families_select" ON public.families;
CREATE POLICY "families_select" ON public.families
  FOR SELECT USING (true);

-- Familles : création — l'utilisateur doit être la tête (head_id = son profile)
DROP POLICY IF EXISTS "families_insert" ON public.families;
CREATE POLICY "families_insert" ON public.families
  FOR INSERT WITH CHECK (auth.uid() = head_id);

-- Familles : mise à jour — seulement la tête
DROP POLICY IF EXISTS "families_update" ON public.families;
CREATE POLICY "families_update" ON public.families
  FOR UPDATE USING (auth.uid() = head_id);

-- Familles : suppression — seulement la tête
DROP POLICY IF EXISTS "families_delete" ON public.families;
CREATE POLICY "families_delete" ON public.families
  FOR DELETE USING (auth.uid() = head_id);

-- Membres : lecture libre
DROP POLICY IF EXISTS "family_members_select" ON public.family_members;
CREATE POLICY "family_members_select" ON public.family_members
  FOR SELECT USING (true);

-- Membres : insertion — le joueur insère sa propre entrée (acceptation d'invitation)
DROP POLICY IF EXISTS "family_members_insert" ON public.family_members;
CREATE POLICY "family_members_insert" ON public.family_members
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Membres : mise à jour — la tête ou un assistant peuvent modifier n'importe quel membre,
--           le membre peut modifier sa propre ligne
DROP POLICY IF EXISTS "family_members_update" ON public.family_members;
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
DROP POLICY IF EXISTS "family_members_delete" ON public.family_members;
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
DROP POLICY IF EXISTS "family_announcements_select" ON public.family_announcements;
CREATE POLICY "family_announcements_select" ON public.family_announcements
  FOR SELECT USING (true);

-- Insertion : tête ou assistant de la famille uniquement
DROP POLICY IF EXISTS "family_announcements_insert" ON public.family_announcements;
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
DROP POLICY IF EXISTS "family_announcements_delete" ON public.family_announcements;
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

-- ── Migration : table des demandes d'adhésion + anti-spam ────────────────────
-- Chaque demande est enregistrée ici pour pouvoir appliquer un cooldown de 7 jours
-- après un refus, empêchant le spam de demandes répétées.
CREATE TABLE IF NOT EXISTS public.family_join_requests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid        NOT NULL REFERENCES public.families(id)    ON DELETE CASCADE,
  character_id text        NOT NULL REFERENCES public.characters(id)  ON DELETE CASCADE,
  profile_id   uuid        NOT NULL REFERENCES public.profiles(id)    ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_family_join_requests_family
  ON public.family_join_requests(family_id, status);
CREATE INDEX IF NOT EXISTS idx_family_join_requests_character
  ON public.family_join_requests(character_id, status);

ALTER TABLE public.family_join_requests ENABLE ROW LEVEL SECURITY;

-- Tête et assistants peuvent lire les demandes en attente de leur famille
DROP POLICY IF EXISTS "fjr_select_managers" ON public.family_join_requests;
CREATE POLICY "fjr_select_managers" ON public.family_join_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = family_join_requests.family_id
        AND fm.profile_id = auth.uid()
        AND fm.role IN ('head', 'assistant')
    )
  );

-- Le demandeur peut voir ses propres demandes
DROP POLICY IF EXISTS "fjr_select_own" ON public.family_join_requests;
CREATE POLICY "fjr_select_own" ON public.family_join_requests
  FOR SELECT USING (auth.uid() = profile_id);

-- INSERT/UPDATE/DELETE uniquement via fonctions SECURITY DEFINER

-- ── RPC : demande de rejoindre (avec anti-spam) ───────────────────────────────
-- Remplace la version précédente :
--   • vérifie recrutement ouvert, perso libre, pas de demande pending
--   • NOUVEAU : cooldown 7 jours après un refus
--   • insère une ligne dans family_join_requests
--   • envoie des notifications à la tête + assistants
CREATE OR REPLACE FUNCTION public.request_join_family(
  p_family_id    uuid,
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

  -- Vérifier qu'il n'y a pas déjà une demande en attente
  IF EXISTS (
    SELECT 1 FROM public.family_join_requests
    WHERE family_id = p_family_id
      AND character_id = p_character_id
      AND status = 'pending'
  ) THEN RAISE EXCEPTION 'request_already_sent'; END IF;

  -- Anti-spam : cooldown 7 jours après un refus
  IF EXISTS (
    SELECT 1 FROM public.family_join_requests
    WHERE family_id = p_family_id
      AND character_id = p_character_id
      AND status = 'rejected'
      AND resolved_at > now() - interval '7 days'
  ) THEN RAISE EXCEPTION 'request_cooldown'; END IF;

  -- Insérer la demande
  INSERT INTO public.family_join_requests (family_id, character_id, profile_id)
  VALUES (p_family_id, p_character_id, auth.uid());

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

-- ── RPC : accepter une demande (via notification) ────────────────────────────
-- Utilisé depuis NotificationsPage. Met à jour family_join_requests en plus.
CREATE OR REPLACE FUNCTION public.accept_join_request(p_notif_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_family_id    uuid;
  v_requester_id uuid;
  v_character_id text;
  v_family_name  text;
BEGIN
  SELECT family_id, related_user_id, character_id
    INTO v_family_id, v_requester_id, v_character_id
    FROM public.notifications
   WHERE id = p_notif_id
     AND type = 'family_join_request'
     AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'notif_not_found'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = v_family_id
      AND profile_id = auth.uid()
      AND role IN ('head', 'assistant')
  ) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  -- Insérer le membre
  INSERT INTO public.family_members (family_id, profile_id, character_id, role)
  VALUES (v_family_id, v_requester_id, v_character_id, 'member')
  ON CONFLICT DO NOTHING;

  -- Mettre à jour le statut de la demande
  UPDATE public.family_join_requests
     SET status = 'accepted', resolved_at = now()
   WHERE family_id = v_family_id
     AND character_id = v_character_id
     AND status = 'pending';

  -- Supprimer toutes les notifs de cette demande (tête + assistants)
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

-- ── RPC : refuser une demande (via notification) ─────────────────────────────
-- Utilisé depuis NotificationsPage. Applique le cooldown 7 jours + notifie le demandeur.
CREATE OR REPLACE FUNCTION public.decline_join_request(p_notif_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_family_id    uuid;
  v_character_id text;
  v_requester_id uuid;
  v_family_name  text;
BEGIN
  SELECT family_id, character_id, related_user_id
    INTO v_family_id, v_character_id, v_requester_id
    FROM public.notifications
   WHERE id = p_notif_id
     AND type = 'family_join_request'
     AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'notif_not_found'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = v_family_id
      AND profile_id = auth.uid()
      AND role IN ('head', 'assistant')
  ) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  -- Marquer refusé avec cooldown 7 jours
  UPDATE public.family_join_requests
     SET status = 'rejected', resolved_at = now()
   WHERE family_id = v_family_id
     AND character_id = v_character_id
     AND status = 'pending';

  -- Supprimer toutes les notifs de cette demande (tête + assistants)
  DELETE FROM public.notifications
  WHERE type = 'family_join_request'
    AND family_id = v_family_id
    AND character_id = v_character_id;

  -- Notifier le demandeur du refus
  SELECT name INTO v_family_name FROM public.families WHERE id = v_family_id;
  INSERT INTO public.notifications (user_id, type, family_id, related_user_id, content_preview)
  VALUES (v_requester_id, 'family_join_declined', v_family_id, auth.uid(), v_family_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.decline_join_request(uuid) TO authenticated;

-- ── RPC : gérer une demande depuis FamilyDetailPage ──────────────────────────
-- Tête/assistant peut accepter ou refuser directement depuis la page de gestion.
CREATE OR REPLACE FUNCTION public.handle_family_request(
  p_request_id uuid,
  p_action     text   -- 'accept' | 'decline'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_family_id    uuid;
  v_requester_id uuid;
  v_character_id text;
  v_family_name  text;
BEGIN
  SELECT family_id, profile_id, character_id
    INTO v_family_id, v_requester_id, v_character_id
    FROM public.family_join_requests
   WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = v_family_id
      AND profile_id = auth.uid()
      AND role IN ('head', 'assistant')
  ) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  IF p_action = 'accept' THEN
    INSERT INTO public.family_members (family_id, profile_id, character_id, role)
    VALUES (v_family_id, v_requester_id, v_character_id, 'member')
    ON CONFLICT DO NOTHING;

    UPDATE public.family_join_requests
       SET status = 'accepted', resolved_at = now()
     WHERE id = p_request_id;

    SELECT name INTO v_family_name FROM public.families WHERE id = v_family_id;
    INSERT INTO public.notifications (user_id, type, family_id, related_user_id, content_preview)
    VALUES (v_requester_id, 'family_join_accepted', v_family_id, auth.uid(), v_family_name);

  ELSIF p_action = 'decline' THEN
    UPDATE public.family_join_requests
       SET status = 'rejected', resolved_at = now()
     WHERE id = p_request_id;

    -- Notifier le demandeur du refus
    SELECT name INTO v_family_name FROM public.families WHERE id = v_family_id;
    INSERT INTO public.notifications (user_id, type, family_id, related_user_id, content_preview)
    VALUES (v_requester_id, 'family_join_declined', v_family_id, auth.uid(), v_family_name);

  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;

  -- Supprimer toutes les notifs de cette demande (tête + assistants)
  DELETE FROM public.notifications
  WHERE type = 'family_join_request'
    AND family_id = v_family_id
    AND character_id = v_character_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_family_request(uuid, text) TO authenticated;

-- Migration 001 : correction du type de character_id
-- Les IDs de personnages sont des strings (ex: "char-1772987527422"), pas des UUID.

-- Supprimer la contrainte unique qui dépend de character_id
alter table public.raid_session_registrations
  drop constraint if exists raid_session_registrations_session_id_player_id_character_id_key;

-- Changer le type uuid → text
alter table public.raid_session_registrations
  alter column character_id type text using character_id::text;

-- Recréer la contrainte unique avec le bon type
alter table public.raid_session_registrations
  add constraint raid_session_registrations_unique
  unique (session_id, player_id, character_id);

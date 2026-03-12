-- Migration 003 : ajout de server et duration_minutes dans raid_sessions
--
-- server          : serveur de jeu de la session (undercity | dragonveil)
--                   Les joueurs ne peuvent s'inscrire qu'aux sessions de leur serveur.
-- duration_minutes: durée estimée de la session en minutes.
--                   Permet d'afficher l'heure de fin et de détecter les chevauchements.

alter table public.raid_sessions
  add column if not exists server           text
    check (server in ('undercity', 'dragonveil')),
  add column if not exists duration_minutes smallint
    check (duration_minutes > 0);

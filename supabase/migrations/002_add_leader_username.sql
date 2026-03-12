-- Migration 002 : ajout de leader_username dans raid_sessions
-- Stocke le pseudo du leader au moment de la création pour l'afficher
-- dans la liste des sessions sans avoir à joindre la table profiles.

alter table public.raid_sessions
  add column if not exists leader_username text;

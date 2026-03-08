# NosBook

Companion web app for [NosTale](https://store.steampowered.com/app/550470/NosTale/). Track your characters, browse player profiles, follow game news, and compete on PVE speedrun leaderboards.

Built with React + Supabase, no UI library.

## Stack

React 18 · Vite · React Router v6 · Supabase (auth + Postgres) · CSS Modules · i18n (EN / FR / DE)

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your [Supabase project settings](https://supabase.com).

Then run the SQL migrations **in order** in the Supabase SQL editor:

1. `supabase/raid_records.sql` — table des records PVE + RLS
2. `supabase/admin_setup.sql` — colonne `is_admin` sur `profiles` + policies admin

The app runs without Supabase — it falls back to mock data so you can work on the UI without any backend config.

## Routes

| Path | Description |
|---|---|
| `/` | Hub — news, fonctionnalités, stats |
| `/players` | Recherche de joueurs |
| `/players/:username` | Profil public (lecture seule) |
| `/profile` | Ton compte + personnages |
| `/raids` | Classement PVE speedrun par raid |
| `/admin/raids` | Validation des soumissions (admins uniquement) |
| `/auth` | Connexion / Inscription |

## Gestion des admins

Pour promouvoir un utilisateur admin, exécuter dans le SQL Editor Supabase :

```sql
update public.profiles set is_admin = true where username = 'TonPseudo';
```

Le lien "🛡️ Admin" apparaît automatiquement dans la Navbar pour les admins connectés.

## Features

- **Profil joueur** — personnages, équipement, armes (shells + runiques), spécialistes, fées
- **Recherche joueurs** — parcourir les profils publics
- **Classement PVE speedrun** — 44 raids, filtre par serveur (Undercity / Dragonveil / Global), top 10 par raid, soumission avec preuve obligatoire
- **Panel admin** — validation / rejet des soumissions avec note optionnelle
- **i18n** — FR / EN / DE complets

## Project layout

```
src/
├── components/layout/    Navbar, PageLayout
├── components/ui/        Button, Card, Input, Spinner
├── hooks/                useAuth, useCharacters, useProfile, useAdmin
├── i18n/                 en.js, fr.js, de.js
├── lib/                  supabase.js, mockData.js, raids.js
└── pages/                HubPage, ProfilePage, PlayersPage, PlayerProfilePage,
                          RaidsPage, AdminRaidsPage, AuthPage, NotFoundPage

supabase/
├── raid_records.sql      Migration table raid_records + RLS
└── admin_setup.sql       Migration is_admin + policies admin
```

## Build

```bash
npm run build
npm run preview
```

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

1. `supabase/raid_records.sql` — raid_records table + RLS policies
2. `supabase/admin_setup.sql` — `is_admin` column on profiles + admin policies

The app runs without Supabase — it falls back to mock data so you can work on the UI without any backend config.

## Routes

| Path | Description |
|---|---|
| `/` | Hub — news, features, stats |
| `/players` | Player search |
| `/players/:username` | Public profile (read-only) |
| `/profile` | Your account + characters |
| `/raids` | PVE speedrun ranking per raid |
| `/admin/raids` | Record validation (admins only) |
| `/auth` | Sign in / Register |

## Admin management

To promote a user to admin, run in the Supabase SQL editor:

```sql
update public.profiles set is_admin = true where username = 'YourUsername';
```

The "🛡️ Admin" link appears automatically in the Navbar for logged-in admins.

## Features

- **Player profile** — characters, equipment, weapons (shells + runic skills), specialists, fairies
- **Player search** — browse public profiles
- **PVE speedrun ranking** — 44 raids, server filter (Undercity / Dragonveil / Global), top 10 per raid, submission with mandatory proof
- **Admin panel** — approve / reject submissions with optional note
- **i18n** — full EN / FR / DE support

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
├── raid_records.sql      Migration — raid_records table + RLS
├── admin_setup.sql       Migration — is_admin column + admin policies
└── SCHEMA.md             Full database schema documentation
```

## Build

```bash
npm run build
npm run preview
```

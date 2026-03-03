# NosBook

Companion web app for [NosTale](https://store.steampowered.com/app/550470/NosTale/). Track your characters, browse player profiles, follow game news.

Built with React + Supabase, no UI library.

## Stack

React 18 · Vite · React Router v6 · Supabase (auth + Postgres) · CSS Modules · i18n (EN / FR / DE)

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your [Supabase project settings](https://supabase.com). Then run `supabase_schema.sql` in the SQL editor to create the tables.

The app runs without Supabase — it falls back to mock data so you can work on the UI without any backend config.

## Routes

| Path | |
|---|---|
| `/` | Hub — news, stats, top players |
| `/players` | Player search |
| `/players/:username` | Public profile (read-only) |
| `/profile` | Your account + characters |
| `/auth` | Sign in / Register |

## Project layout

```
src/
├── components/layout/    Navbar, PageLayout
├── components/ui/        Button, Card, Input, Spinner…
├── hooks/                useAuth, useCharacters
├── i18n/                 en.js, fr.js, de.js
├── lib/                  supabase.js, mockData.js
└── pages/                one folder per route
```

## Build

```bash
npm run build
npm run preview
```

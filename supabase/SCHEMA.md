# NosBook — Schéma Base de données

> Dernière mise à jour : feature Classement PVE + Admin

## Ordre d'exécution des migrations

1. `raid_records.sql`
2. `admin_setup.sql`

---

## Table : `profiles`

Créée automatiquement par Supabase Auth via trigger ou migration initiale.

| Colonne | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Identique à `auth.users.id` |
| `username` | `text` | Pseudo affiché |
| `is_admin` | `boolean` default `false` | Accès au panel admin NosBook |

**RLS :** lecture publique des profils.

**Promouvoir un admin :**
```sql
update public.profiles set is_admin = true where username = 'TonPseudo';
```

---

## Table : `characters`

| Colonne | Type | Description |
|---|---|---|
| `id` | `uuid` PK | |
| `profile_id` | `uuid` FK → `profiles.id` | |
| `sort_order` | `int` | Ordre d'affichage (0–3) |
| `name` | `text` | |
| `class` | `text` | `Archer` / `Swordsman` / `Mage` / `Martial` |
| `level` | `int` | 1–99 |
| `hero_level` | `int` | |
| `prestige` | `int` | Nb étoiles de prestige |
| `element` | `text` | `Neutral` / `Fire` / `Water` / `Light` / `Shadow` |
| `stats` | `jsonb` | ATK, DEF, MATK, MDEF, HP, MP, Speed, CritRate, CritDmg, Hit, Avoid |
| `equipment` | `jsonb` | weapon, offhand, armor, hat, gloves, shoes, necklace, ring, bracelet, costumeWings, costumeTop, costumeBottom, fairy, specialists[] |
| `resistances` | `jsonb` | fire, water, light, shadow |

**RLS :** chaque utilisateur lit/écrit uniquement ses propres personnages.

---

## Table : `raid_records`

Source : `supabase/raid_records.sql`

| Colonne | Type | Description |
|---|---|---|
| `id` | `uuid` PK | |
| `raid_slug` | `text` | Slug du raid (voir `src/lib/raids.js`) |
| `server` | `text` | `undercity` ou `dragonveil` |
| `team_members` | `text[]` | Liste des pseudos (libres, 1–12) |
| `time_seconds` | `int` | Temps en secondes (format mm:ss converti) |
| `proof_url` | `text` | Lien YouTube / Twitch / Imgur obligatoire |
| `proof_type` | `text` | `video` ou `screenshot` |
| `submitted_by` | `uuid` FK → `auth.users.id` | Peut être null si compte supprimé |
| `submitted_at` | `timestamptz` | Date de soumission |
| `status` | `text` | `pending` / `approved` / `rejected` |
| `admin_note` | `text` | Note de rejet optionnelle (renseignée par l'admin) |

**Index :** `(raid_slug, time_seconds ASC)`, `server`, `status`

**RLS :**
| Policy | Qui | Quoi |
|---|---|---|
| `read_approved_records` | Public | SELECT où `status = 'approved'` |
| `insert_own_records` | Authentifié | INSERT avec `submitted_by = auth.uid()` et `status = 'pending'` |
| `admins_read_all_records` | Admin | SELECT toutes les lignes |
| `admins_update_records` | Admin | UPDATE (approve / reject) |

---

## Slugs de raids disponibles

Voir `src/lib/raids.js` — 44 raids avec noms FR / EN / DE.

Exemples : `kertos`, `grenigas`, `erenia`, `incomplete-fernon`, `crusher-nezarun`, etc.

---

## Conventions

- Les colonnes snake_case en DB sont converties en camelCase côté JS via les fonctions `fromDB` / `toDB` dans chaque hook.
- Les données JSONB (`stats`, `equipment`, `resistances`) ne sont pas typées en DB — la validation se fait côté client.

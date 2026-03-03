# NosBook 📖⚔️

> Le compagnon social des aventuriers de NosTale — Profil, Raids, Marché et plus.

## Stack

- **React 18** + **Vite 5**
- **React Router v6** — routing côté client
- **Supabase** — BDD PostgreSQL + authentification
- **CSS Modules** — styles scopés, zéro dépendance UI

---

## Démarrage rapide

### 1. Installe les dépendances

```bash
npm install
```

### 2. Configure Supabase

1. Crée un projet sur [supabase.com](https://supabase.com)
2. Dans **Settings > API**, copie l'URL et la clé anon
3. Copie le fichier d'exemple et remplis tes clés :

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=ta-cle-anon-publique
```

### 3. Crée le schéma de base de données

Dans ton dashboard Supabase, va dans **SQL Editor** et exécute le contenu du fichier :

```
supabase_schema.sql
```

### 4. Lance le serveur de dev

```bash
npm run dev
```

L'app tourne sur [http://localhost:5173](http://localhost:5173)

---

## Structure du projet

```
nosbook/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx / .module.css
│   │   │   └── PageLayout.jsx / .module.css
│   │   └── ui/
│   │       ├── Background.jsx / .module.css
│   │       ├── Button.jsx / .module.css
│   │       ├── Card.jsx / .module.css
│   │       ├── Input.jsx / .module.css
│   │       └── Spinner.jsx / .module.css
│   ├── hooks/
│   │   ├── useAuth.jsx       ← AuthContext + Provider
│   │   └── useProfile.js     ← Chargement profil (Supabase ou mock)
│   ├── lib/
│   │   ├── supabase.js       ← Client Supabase
│   │   └── mockData.js       ← Données de dev
│   ├── pages/
│   │   ├── HubPage.jsx / .module.css
│   │   ├── ProfilePage.jsx / .module.css
│   │   ├── AuthPage.jsx / .module.css
│   │   └── NotFoundPage.jsx / .module.css
│   ├── styles/
│   │   └── globals.css       ← Variables CSS + reset
│   ├── App.jsx               ← Routing principal
│   └── main.jsx              ← Point d'entrée
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── supabase_schema.sql
└── vite.config.js
```

---

## Pages disponibles

| Route      | Page             | État       |
|------------|------------------|------------|
| `/`        | Hub / Accueil    | ✅ Prêt   |
| `/profile` | Profil joueur    | ✅ Prêt   |
| `/auth`    | Connexion / Inscription | ✅ Prêt |
| `/raids`   | Raids            | 🔜 Bientôt |
| `/market`  | Marché           | 🔜 Bientôt |
| `/guild`   | Guilde           | 🔜 Bientôt |
| `/ranking` | Classement       | 🔜 Bientôt |

---

## Mode développement sans Supabase

Si le `.env` n'est pas configuré, l'app tourne en **mode mock** : elle charge automatiquement des données fictives pour tester l'interface. Aucune configuration nécessaire pour commencer à développer.

---

## Build production

```bash
npm run build
npm run preview
```

---

## Prochaines étapes suggérées

- [ ] Page profil connectée à Supabase (remplacer les mocks)
- [ ] Upload d'avatar / bannière (Supabase Storage)
- [ ] Page Raids avec système de rooms
- [ ] Marketplace avec offres d'items
- [ ] Système d'amis / recherche de joueurs

// Source unique pour tous les raids NosTale
// Champs : id (game id), slug, icon, act (clé catégorie), color, cooldown (heures), minLevel, maxPlayers, dailyLimit?, hc?
// Noms   : fr, en, de  —  source : nosapki.com + liste officielle serveur FR
// minLevel : niveau minimum requis (niveau héroïque pour actes 7+ avancés, 8, 9, 10)

export const RAIDS = [

  // ── Acte 1 ────────────────────────────────────────────────────────────────
  { id: 0,   slug: 'mother-cuby',             icon: '1127', act: 'act1',    color: '#2ecc71', cooldown: 24, minLevel: 30,  maxPlayers: 15,
    fr: 'Mère Cuby',                       en: 'Mother Cuby',                    de: 'Cuby Mutter' },
  { id: 1,   slug: 'ginseng',                 icon: '1128', act: 'act1',    color: '#2ecc71', cooldown: 24, minLevel: 40,  maxPlayers: 15,
    fr: 'Ginseng',                         en: 'Ginseng',                        de: 'Ginseng' },
  { id: 2,   slug: 'dark-castra',             icon: '1129', act: 'act1',    color: '#2ecc71', cooldown: 24, minLevel: 50,  maxPlayers: 15,
    fr: 'Castra obscur',                   en: 'Dark Castra',                    de: 'Dark Castra' },
  { id: 3,   slug: 'giant-black-spider',      icon: '1130', act: 'act1',    color: '#2ecc71', cooldown: 24, minLevel: 60,  maxPlayers: 15,
    fr: 'Araignée noire géante',           en: 'Giant Black Spider',             de: 'Schwarze Riesenspinne' },
  { id: 4,   slug: 'massive-slade',           icon: '1131', act: 'act1',    color: '#2ecc71', cooldown: 24, minLevel: 70,  maxPlayers: 15,
    fr: 'Slade géant',                     en: 'Massive Slade',                  de: 'Riesenslade' },
  { id: 5,   slug: 'chicken-king',            icon: '1195', act: 'act1',    color: '#2ecc71', cooldown: 24, minLevel: 65,  maxPlayers: 15,
    fr: 'Roi poulet',                      en: 'Chicken King',                   de: 'Huhnkönig' },
  { id: 6,   slug: 'namaju',                  icon: '1226', act: 'act1',    color: '#2ecc71', cooldown: 24, minLevel: 50,  maxPlayers: 15,
    fr: 'Namaju',                          en: 'Namaju',                         de: 'Namaju' },

  // ── Acte 5 ────────────────────────────────────────────────────────────────
  { id: 9,   slug: 'ibrahim',                 icon: '1892', act: 'act5',    color: '#e74c3c', cooldown: 24, minLevel: 80,  maxPlayers: 15,
    fr: 'Ibrahim',                         en: 'Ibrahim',                        de: 'Ibrahim' },
  { id: 13,  slug: 'kertos',                  icon: '2460', act: 'act5',    color: '#e74c3c', cooldown: 24, minLevel: 85,  maxPlayers: 15,
    fr: 'Kertos, le chien-démon',          en: 'Kertos the Demon Dog',           de: 'Kertos, der Dämonenhund' },
  { id: 14,  slug: 'valakus',                 icon: '2461', act: 'act5',    color: '#e74c3c', cooldown: 24, minLevel: 85,  maxPlayers: 15,
    fr: 'Valakus, roi des flammes',        en: 'Valakus King of Fire',           de: 'Feuerkönig Valakus' },
  { id: 15,  slug: 'grenigas',               icon: '2462', act: 'act5',    color: '#e74c3c', cooldown: 24, minLevel: 85,  maxPlayers: 15,
    fr: 'Grenigas, le dieu du Feu',        en: 'Fire God Grenigas',              de: 'Feuergott Grenigas' },
  { id: 16,  slug: 'lord-draco',              icon: '2547', act: 'act5',    color: '#e74c3c', cooldown: 24, minLevel: 75,  maxPlayers: 15, dailyLimit: 5,
    fr: 'Sire Draco',                      en: 'Lord Draco',                     de: 'Lord Draco' },
  { id: 17,  slug: 'glacerus',               icon: '2583', act: 'act5',    color: '#e74c3c', cooldown: 24, minLevel: 80,  maxPlayers: 15, dailyLimit: 5,
    fr: 'Glacerus le Rude',                en: 'Glacerus the Ice Cold',          de: 'Glacerus, der Eiskalte' },
  { id: 27,  slug: 'twisted-yertirand',       icon: '2942', act: 'act5',    color: '#e74c3c', cooldown: 24, minLevel: 70,  maxPlayers: 15,
    fr: 'Yertirand corrompu',              en: 'Twisted Yertirand',              de: 'Verdorbener Yertirand' },

  // ── Acte 6 ────────────────────────────────────────────────────────────────
  { id: 23,  slug: 'zenas',                   icon: '2750', act: 'act6',    color: '#9b59b6', cooldown: 24, minLevel: 90,  maxPlayers: 20,
    fr: 'Zénas',                           en: 'Zenas',                          de: 'Zenas' },
  { id: 24,  slug: 'erenia',                  icon: '2751', act: 'act6',    color: '#9b59b6', cooldown: 24, minLevel: 90,  maxPlayers: 15,
    fr: 'Erenia',                          en: 'Erenia',                         de: 'Erenia' },
  { id: 25,  slug: 'incomplete-fernon',       icon: '2868', act: 'act6',    color: '#9b59b6', cooldown: 24, minLevel: 92,  maxPlayers: 8,
    fr: 'Fernon incomplète',               en: 'Incomplete Fernon',              de: 'Unvollendete Fernon' },
  { id: 26,  slug: 'greedy-fafnir',           icon: '2905', act: 'act6',    color: '#9b59b6', cooldown: 48, minLevel: 70,  maxPlayers: 15,
    fr: 'Terrible Fafnir',                 en: 'Greedy Fafnir',                  de: 'Gieriger Fafnir' },

  // ── Acte 7 ────────────────────────────────────────────────────────────────
  { id: 30,  slug: 'spirit-king-kirollas',    icon: '4271', act: 'act7',    color: '#c9a96e', cooldown: 24, minLevel: 90,  maxPlayers: 8,
    fr: 'Kirollas roi des esprits',        en: 'Spirit King Kirollas',           de: 'Geisterkönig Kirollas' },
  { id: 31,  slug: 'beast-king-carno',        icon: '4272', act: 'act7',    color: '#c9a96e', cooldown: 24, minLevel: 90,  maxPlayers: 8,
    fr: 'Carno roi des bêtes',             en: 'Beast King Carno',               de: 'Bestienkönig Carno' },
  { id: 32,  slug: 'demon-god-belial',        icon: '4273', act: 'act7',    color: '#c9a96e', cooldown: 24, minLevel: 90,  maxPlayers: 20,
    fr: 'Dieu-démon Bélial',               en: 'Demon God Belial',               de: 'Dämonengott Belial' },
  { id: 33,  slug: 'evil-overlord-paimon',    icon: '4304', act: 'act7',    color: '#c9a96e', cooldown: 24, minLevel: 20,  maxPlayers: 20,
    fr: 'Paimon, seigneur maléfique',      en: 'Evil Overlord Paimon',           de: 'Böser Gebieter Paimon' },
  { id: 34,  slug: 'revenant-paimon',         icon: '4500', act: 'act7',    color: '#c9a96e', cooldown: 24, minLevel: 10,  maxPlayers: 15, dailyLimit: 5,
    fr: 'Paimon ressuscité',               en: 'Revenant Paimon',                de: 'Auferstandener Paimon' },

  // ── Acte 8 ────────────────────────────────────────────────────────────────
  { id: 35,  slug: 'zombie-dragon-valehir',   icon: '4612', act: 'act8',    color: '#1abc9c', cooldown: 24, minLevel: 20,  maxPlayers: 15,
    fr: 'Dragon zombie Valehir',           en: 'Zombie Dragon Valehir',          de: 'Zombiedrache Valehir' },
  { id: 36,  slug: 'ice-dragon-alzanor',      icon: '4615', act: 'act8',    color: '#1abc9c', cooldown: 24, minLevel: 20,  maxPlayers: 15,
    fr: 'Alzanor dragon givré',            en: 'Ice Dragon Alzanor',             de: 'Eisdrache Alzanor' },
  { id: 38,  slug: 'weak-asgobas',            icon: '4868', act: 'act8',    color: '#1abc9c', cooldown: 24, minLevel: 30,  maxPlayers: 15, dailyLimit: 5,
    fr: 'Asgobas faible',                  en: 'Weak Asgobas',                   de: 'Schwacher Asgobas' },

  // ── Acte 9 ────────────────────────────────────────────────────────────────
  { id: 39,  slug: 'moss-giant-pollutus',     icon: '7094', act: 'act9',    color: '#3498db', cooldown: 24, minLevel: 80,  maxPlayers: 8,
    fr: 'Géant moussu Pollutus',           en: 'Moss Giant Pollutus',            de: 'Moosriese Pollutus' },
  { id: 40,  slug: 'giant-arma',              icon: '7095', act: 'act9',    color: '#3498db', cooldown: 24, minLevel: 80,  maxPlayers: 12,
    fr: 'Arma géant',                      en: 'Giant Arma',                     de: 'Riesen-Arma' },
  { id: 41,  slug: 'ultimate-giant-arma',     icon: '7135', act: 'act9',    color: '#3498db', cooldown: 24, minLevel: 80,  maxPlayers: 12, dailyLimit: 5,
    fr: 'Arma géant absolu',               en: 'Ultimate Giant Arma',            de: 'Vollständiger Riesen-Arma' },

  // ── Acte 10 ───────────────────────────────────────────────────────────────
  { id: 43,  slug: 'nezarun',                 icon: '7590', act: 'act10',   color: '#e67e22', cooldown: 24, minLevel: 90,  maxPlayers: 15, dailyLimit: 20,
    fr: 'Nézarun',                         en: 'Nezarun',                        de: 'Nezarun' },
  { id: 44,  slug: 'crusher-nezarun',         icon: '7591', act: 'act10',   color: '#e67e22', cooldown: 24, minLevel: 90,  maxPlayers: 20, dailyLimit: 20,
    fr: 'Nézarun dévastateur',             en: 'Crusher Nezarun',                de: 'Zermalmer Nezarun' },

  // ── Évènements ────────────────────────────────────────────────────────────
  { id: 7,   slug: 'giant-grasslin',          icon: '1234', act: 'event',   color: '#8e44ad', cooldown: 24, minLevel: 20,  maxPlayers: 15,
    fr: 'Herbin géant',                    en: 'Giant Grasslin',                 de: 'Riesiger Grasslin' },
  { id: 12,  slug: 'captain-pete-openg',      icon: '1440', act: 'event',   color: '#8e44ad', cooldown: 24, minLevel: 20,  maxPlayers: 15,
    fr: "Capitaine Pete O'Peng",           en: "Captain Pete O'Peng",            de: "Captain Pete O'Peng" },
  { id: 8,   slug: 'snowman-head',            icon: '1371', act: 'event',   color: '#8e44ad', cooldown: 24, minLevel: 20,  maxPlayers: 15,
    fr: 'Tête bonhomme de neige',          en: 'Huge Snowman Head',              de: 'Großer Schneemannkopf' },
  { id: 10,  slug: 'jack-o-lantern',          icon: '1915', act: 'event',   color: '#8e44ad', cooldown: 24, minLevel: 20,  maxPlayers: 15,
    fr: "Jack O'Lantern",                  en: "Jack O'Lantern",                 de: "Jack O'Lantern" },
  { id: 11,  slug: 'chicken-queen',           icon: '4087', act: 'event',   color: '#8e44ad', cooldown: 24, minLevel: 20,  maxPlayers: 15,
    fr: 'Reine poule',                     en: 'Chicken Queen',                  de: 'Huhnkönigin' },
  { id: 18,  slug: 'foxy',                    icon: '2662', act: 'event',   color: '#8e44ad', cooldown: 24, minLevel: 20,  maxPlayers: 15,
    fr: 'Foxy',                            en: 'Foxy',                           de: 'Foxy' },
  { id: 19,  slug: 'maru',                    icon: '2674', act: 'event',   color: '#8e44ad', cooldown: 24, minLevel: 20,  maxPlayers: 15,
    fr: 'Maru',                            en: 'Maru',                           de: 'Maru' },
  { id: 20,  slug: 'witch-laurena',           icon: '2698', act: 'event',   color: '#8e44ad', cooldown: 24, minLevel: 70,  maxPlayers: 40,
    fr: 'Sorcière Laurena',                en: 'Witch Laurena',                  de: 'Hexe Laurena' },
  { id: 21,  slug: 'imp-cheongbi',            icon: '2690', act: 'event',   color: '#8e44ad', cooldown: 24, minLevel: 20,  maxPlayers: 15,
    fr: 'Diablotin Cheongbi',              en: 'Imp Cheongbi',                   de: 'Teufelchen Cheongbi' },
  { id: 22,  slug: 'lola-lopears',            icon: '2716', act: 'event',   color: '#8e44ad', cooldown: 24, minLevel: 20,  maxPlayers: 10,
    fr: 'Lola Longoreil',                  en: 'Lola Lopears',                   de: 'Lola Löffel' },
  { id: 28,  slug: 'mad-professor-macavity',  icon: '2964', act: 'event',   color: '#8e44ad', cooldown: 24, minLevel: 30,  maxPlayers: 8,
    fr: 'Dr Miaou fou',                    en: 'Mad Professor Macavity',         de: 'Wahnsinniger Dr. Maunz' },
  { id: 29,  slug: 'mad-march-hare',          icon: '4121', act: 'event',   color: '#8e44ad', cooldown: 24, minLevel: 30,  maxPlayers: 15,
    fr: 'Lapin de Pâques fou',             en: 'Mad March Hare',                 de: 'Verrückter Osterhase' },
  { id: 42,  slug: 'lord-melonoth',           icon: '7393', act: 'event',   color: '#8e44ad', cooldown: 24, minLevel: 65,  maxPlayers: 15,
    fr: 'Sire Melonoth',                   en: 'Lord Melonoth',                  de: 'Lord Melonoth' },

  // ── Hardcore ──────────────────────────────────────────────────────────────
  // Acte 1 HC
  { id: 100, slug: 'mother-cuby-hc',          icon: '1127', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 30,  maxPlayers: 15, hc: true,
    fr: 'Mère Cuby HC',                    en: 'Mother Cuby HC',                 de: 'Cuby Mutter HC' },
  { id: 101, slug: 'ginseng-hc',              icon: '1128', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 40,  maxPlayers: 15, hc: true,
    fr: 'Ginseng HC',                      en: 'Ginseng HC',                     de: 'Ginseng HC' },
  { id: 102, slug: 'dark-castra-hc',          icon: '1129', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 50,  maxPlayers: 15, hc: true,
    fr: 'Castra obscur HC',                en: 'Dark Castra HC',                 de: 'Dark Castra HC' },
  { id: 103, slug: 'giant-black-spider-hc',   icon: '1130', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 60,  maxPlayers: 15, hc: true,
    fr: 'Araignée noire géante HC',        en: 'Giant Black Spider HC',          de: 'Schwarze Riesenspinne HC' },
  { id: 104, slug: 'massive-slade-hc',        icon: '1131', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 70,  maxPlayers: 15, hc: true,
    fr: 'Slade géant HC',                  en: 'Massive Slade HC',               de: 'Riesenslade HC' },
  // Acte 5 HC
  { id: 109, slug: 'ibrahim-hc',              icon: '1892', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 80,  maxPlayers: 15, hc: true,
    fr: 'Ibrahim HC',                      en: 'Ibrahim HC',                     de: 'Ibrahim HC' },
  { id: 113, slug: 'kertos-hc',               icon: '2460', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 85,  maxPlayers: 15, hc: true,
    fr: 'Kertos, le chien-démon HC',       en: 'Kertos the Demon Dog HC',        de: 'Kertos, der Dämonenhund HC' },
  { id: 114, slug: 'valakus-hc',              icon: '2461', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 85,  maxPlayers: 15, hc: true,
    fr: 'Valakus, roi des flammes HC',     en: 'Valakus King of Fire HC',        de: 'Feuerkönig Valakus HC' },
  { id: 115, slug: 'grenigas-hc',            icon: '2462', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 85,  maxPlayers: 15, hc: true,
    fr: 'Grenigas, le dieu du Feu HC',     en: 'Fire God Grenigas HC',           de: 'Feuergott Grenigas HC' },
  { id: 116, slug: 'lord-draco-hc',           icon: '2547', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 75,  maxPlayers: 15, hc: true,
    fr: 'Sire Draco HC',                   en: 'Lord Draco HC',                  de: 'Lord Draco HC' },
  { id: 117, slug: 'glacerus-hc',            icon: '2583', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 80,  maxPlayers: 15, hc: true,
    fr: 'Glacerus le Rude HC',             en: 'Glacerus the Ice Cold HC',       de: 'Glacerus, der Eiskalte HC' },
  { id: 127, slug: 'twisted-yertirand-hc',    icon: '2942', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 70,  maxPlayers: 15, hc: true,
    fr: 'Yertirand corrompu HC',           en: 'Twisted Yertirand HC',           de: 'Verdorbener Yertirand HC' },
  // Acte 6 HC
  { id: 123, slug: 'zenas-hc',                icon: '2750', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 90,  maxPlayers: 20, hc: true,
    fr: 'Zénas HC',                        en: 'Zenas HC',                       de: 'Zenas HC' },
  { id: 124, slug: 'erenia-hc',               icon: '2751', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 90,  maxPlayers: 15, hc: true,
    fr: 'Erenia HC',                       en: 'Erenia HC',                      de: 'Erenia HC' },
  { id: 125, slug: 'incomplete-fernon-hc',    icon: '2868', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 92,  maxPlayers: 8,  hc: true,
    fr: 'Fernon incomplète HC',            en: 'Incomplete Fernon HC',           de: 'Unvollendete Fernon HC' },
  { id: 126, slug: 'greedy-fafnir-hc',        icon: '2905', act: 'hardcore', color: '#ff4757', cooldown: 48, minLevel: 70,  maxPlayers: 15, hc: true,
    fr: 'Terrible Fafnir HC',              en: 'Greedy Fafnir HC',               de: 'Gieriger Fafnir HC' },
  // Acte 7 HC
  { id: 130, slug: 'spirit-king-kirollas-hc', icon: '4271', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 90,  maxPlayers: 8,  hc: true,
    fr: 'Kirollas roi des esprits HC',     en: 'Spirit King Kirollas HC',        de: 'Geisterkönig Kirollas HC' },
  { id: 131, slug: 'beast-king-carno-hc',     icon: '4272', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 90,  maxPlayers: 8,  hc: true,
    fr: 'Carno roi des bêtes HC',          en: 'Beast King Carno HC',            de: 'Bestienkönig Carno HC' },
  { id: 132, slug: 'demon-god-belial-hc',     icon: '4273', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 90,  maxPlayers: 20, hc: true,
    fr: 'Dieu-démon Bélial HC',            en: 'Demon God Belial HC',            de: 'Dämonengott Belial HC' },
  { id: 133, slug: 'evil-overlord-paimon-hc', icon: '4304', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 20,  maxPlayers: 20, hc: true,
    fr: 'Paimon, seigneur maléfique HC',   en: 'Evil Overlord Paimon HC',        de: 'Böser Gebieter Paimon HC' },
  { id: 134, slug: 'revenant-paimon-hc',      icon: '4500', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 10,  maxPlayers: 15, hc: true,
    fr: 'Paimon ressuscité HC',            en: 'Revenant Paimon HC',             de: 'Auferstandener Paimon HC' },
  // Acte 8 HC
  { id: 135, slug: 'zombie-dragon-valehir-hc',icon: '4612', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 20,  maxPlayers: 15, hc: true,
    fr: 'Dragon zombie Valehir HC',        en: 'Zombie Dragon Valehir HC',       de: 'Zombiedrache Valehir HC' },
  { id: 136, slug: 'ice-dragon-alzanor-hc',   icon: '4615', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 20,  maxPlayers: 15, hc: true,
    fr: 'Alzanor dragon givré HC',         en: 'Ice Dragon Alzanor HC',          de: 'Eisdrache Alzanor HC' },
  { id: 138, slug: 'weak-asgobas-hc',         icon: '4868', act: 'hardcore', color: '#ff4757', cooldown: 24, minLevel: 30,  maxPlayers: 15, hc: true,
    fr: 'Asgobas faible HC',               en: 'Weak Asgobas HC',                de: 'Schwacher Asgobas HC' },
]


// Limite hebdomadaire globale des raids Hardcore
export const HC_WEEKLY_LIMIT = 35

// Ordre d'affichage des catégories
export const RAID_CATEGORIES = [
  { key: 'act1',     fr: 'Acte 1',     en: 'Act 1',      de: 'Akt 1'      },
  { key: 'act5',     fr: 'Acte 5',     en: 'Act 5',      de: 'Akt 5'      },
  { key: 'act6',     fr: 'Acte 6',     en: 'Act 6',      de: 'Akt 6'      },
  { key: 'act7',     fr: 'Acte 7',     en: 'Act 7',      de: 'Akt 7'      },
  { key: 'act8',     fr: 'Acte 8',     en: 'Act 8',      de: 'Akt 8'      },
  { key: 'act9',     fr: 'Acte 9',     en: 'Act 9',      de: 'Akt 9'      },
  { key: 'act10',    fr: 'Acte 10',    en: 'Act 10',     de: 'Akt 10'     },
  { key: 'event',    fr: 'Évènements', en: 'Events',     de: 'Events'     },
  { key: 'hardcore', fr: 'Hardcore',   en: 'Hardcore',   de: 'Hardcore'   },
]

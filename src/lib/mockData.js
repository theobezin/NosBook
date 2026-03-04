export const CLASSES = {
  Archer:    { icon: '🏹', label: 'Archer',          color: '#22c55e' },
  Swordsman: { icon: '⚔️', label: 'Swordsman',       color: '#f97316' },
  Mage:      { icon: '🔮', label: 'Mage',            color: '#a78bfa' },
  Martial:   { icon: '🥊', label: 'Martial Artist',  color: '#60a5fa' },
}

export const RARITY_COLORS = {
  Legendary: '#c9a84c',
  Epic:      '#a78bfa',
  Rare:      '#60a5fa',
  Common:    '#86efac',
}

// ── Shared character constants ─────────────────────────────────────────────

export const STAT_KEYS    = ['atk', 'def', 'matk', 'mdef', 'hp', 'mp', 'speed', 'critRate', 'critDmg', 'hit', 'avoid']
export const EQUIP_KEYS   = ['weapon', 'offhand', 'armor', 'hat', 'gloves', 'shoes', 'necklace', 'ring', 'bracelet', 'costumeWings', 'costumeTop', 'costumeBottom']
export const SPECIAL_KEYS = ['fairy']
export const ELEMENTS     = ['Neutral', 'Fire', 'Water', 'Light', 'Shadow']

// ── Specialist cards (SP) by class ────────────────────────────────────────
const I = (id) => `https://nosapki.com/images/icons/${id}.png`

export const SPECIALISTS = {
  Archer: [
    { name: 'Ranger',               icon: I(903)  },
    { name: 'Assassin',             icon: I(904)  },
    { name: 'Destructeur',          icon: I(911)  },
    { name: 'Garde-chasse',         icon: I(912)  },
    { name: 'Canonnier de feu',     icon: I(2545) },
    { name: 'Éclaireur',            icon: I(2589) },
    { name: 'Chasseur de démons',   icon: I(2655) },
    { name: 'Ange vengeur',         icon: I(2707) },
    { name: 'Traqueur solaire',     icon: I(4494) },
    { name: 'Grenadier',            icon: I(4860) },
    { name: 'Chasseur nébuleux',    icon: I(7139) },
  ],
  Swordsman: [
    { name: 'Guerrier',             icon: I(901)  },
    { name: 'Ninja',                icon: I(902)  },
    { name: 'Croisé',               icon: I(909)  },
    { name: 'Berserk',              icon: I(910)  },
    { name: 'Gladiateur',           icon: I(2544) },
    { name: 'Moine pugnace',        icon: I(2588) },
    { name: 'Mortifère',            icon: I(2654) },
    { name: 'Renégat',              icon: I(2706) },
    { name: 'Hacheur',              icon: I(4496) },
    { name: 'Chevalier dragon',     icon: I(4862) },
    { name: 'Broyeur de pierre',    icon: I(7138) },
  ],
  Mage: [
    { name: 'Mage du feu',          icon: I(905)  },
    { name: 'Mage sacré',           icon: I(906)  },
    { name: 'Mage de glace',        icon: I(913)  },
    { name: 'Mage ténébreux',       icon: I(914)  },
    { name: 'Volcanor',             icon: I(2546) },
    { name: 'Sa Majesté des marées',icon: I(2590) },
    { name: 'Devin',                icon: I(2656) },
    { name: 'Archimage',            icon: I(2708) },
    { name: 'Prêtre vaudou',        icon: I(4497) },
    { name: 'Gravitas',             icon: I(4863) },
    { name: 'Tempête de feu',       icon: I(7140) },
  ],
  Martial: [
    { name: 'Arts mystiques',       icon: I(4093) },
    { name: 'Maître loup',          icon: I(4126) },
    { name: 'Guerrier-démon',       icon: I(4151) },
    { name: 'Druide ardent',        icon: I(4495) },
    { name: 'Hydraupoing',          icon: I(4861) },
    { name: 'Foudroyeur',           icon: I(7141) },
  ],
}

// ── Weapon rarities ───────────────────────────────────────────────────────
// rank: display label for the rank tier | label: rarity name (empty = no name at R0)
export const WEAPON_RARITIES = [
  { key: 'r-2', rank: 'R-2', label: 'Endommagée',        color: '#FF9085' },
  { key: 'r-1', rank: 'R-1', label: 'Bas-Niveau',        color: '#FFA8CC' },
  { key: 'r0',  rank: 'R0',  label: '',                  color: '#F2F2F2' },
  { key: 'r1',  rank: 'R1',  label: 'Utile',             color: '#C0BDFC' },
  { key: 'r2',  rank: 'R2',  label: 'Bon',               color: '#72FF85' },
  { key: 'r3',  rank: 'R3',  label: 'De grande qualité', color: '#91CDFF' },
  { key: 'r4',  rank: 'R4',  label: 'Excellent',         color: '#0EF902' },
  { key: 'r5',  rank: 'R5',  label: 'Antique',           color: '#F8E2B3' },
  { key: 'r6',  rank: 'R6',  label: 'Mystérieux',        color: '#F2DD02' },
  { key: 'r7',  rank: 'R7',  label: 'Légendaire',        color: '#B2F304' },
  { key: 'r8',  rank: 'R8',  label: 'Phénoménal',        color: '#FF5E00' },
]

// ── Shell (coquillage) rune system ────────────────────────────────────────
export const SHELL_RANK_COLORS = {
  C: '#e6bb13',
  B: '#e8e83c',
  A: '#a5fe5e',
  S: '#c7f998',
}

export const SHELL_EFFECTS = [
  { key: 'atkBoost',    label: 'Attaque augmentée',                                              ranges: { C:[22,95],  B:[44,142],  A:[87,190] } },
  { key: 'dmgIncrease', label: 'Les dégâts augmentent',                                          ranges: { S:[5,19] } },
  { key: 'dmgPlants',   label: 'Dégâts augmentés sur les plantes',                               ranges: { C:[1,9],   B:[5,19],    A:[9,19] } },
  { key: 'dmgAnimals',  label: 'Dégâts augmentés sur les animaux',                               ranges: { C:[1,9],   B:[5,19],    A:[9,19] } },
  { key: 'dmgMonsters', label: 'Dégâts augmentés sur les monstres',                              ranges: { C:[1,9],   B:[5,19],    A:[9,19] } },
  { key: 'dmgUndead',   label: 'Les dégâts contre les morts-vivants augmentent',                 ranges: { C:[1,9],   B:[5,19],    A:[9,19] } },
  { key: 'dmgKovolts',  label: 'Les dégâts contre les kovolts, catsys et ratufus augmentent',   ranges: { C:[1,9],   B:[5,19],    A:[9,19] } },
  { key: 'dmgMapBoss',  label: 'Les dégâts sur les boss de carte augmentent',                    ranges: { S:[13,23] } },
  { key: 'critDmg',     label: 'Augmente les dégâts critiques',                                  ranges: { C:[12,57] } },
  { key: 'elemFire',    label: 'Élément Feu renforcé',                                           ranges: { B:[10,76], A:[27,142] } },
  { key: 'elemWater',   label: 'Élément Eau renforcé',                                           ranges: { B:[10,76], A:[27,142] } },
  { key: 'elemLight',   label: 'Élément Lumière renforcé',                                       ranges: { B:[10,76], A:[27,142] } },
  { key: 'elemDark',    label: "L'élément Obscurité augmente",                                   ranges: { B:[10,76], A:[27,142] } },
  { key: 'elemAll',     label: 'Tous les éléments sont renforcés',                               ranges: { S:[95,171] } },
  { key: 'spAtk',       label: "Les statistiques d'attaque (SP) augmentent",                     ranges: { B:[3,11],  A:[4,17] } },
  { key: 'spDef',       label: 'Augmente la défense de la SP de',                                ranges: { B:[3,11],  A:[4,17] } },
  { key: 'spElem',      label: 'Les points de compétence élémentaires (SP) augmentent',          ranges: { B:[3,11],  A:[4,17] } },
  { key: 'spHpmp',      label: 'Augmente les HP/MP de la SP de',                                 ranges: { B:[3,11],  A:[4,17] } },
  { key: 'spAll',       label: 'Augmentation générale des points de la SP de',                   ranges: { S:[5,11] } },
]

// ── Weapons by class ─────────────────────────────────────────────────────
// minLevel: required character level (null for heroic)
// minHero:  required hero level (null for regular)
const W  = (name, id, minLevel) => ({ name, icon: I(id), minLevel, minHero: null })
const WH = (name, id, minHero)  => ({ name, icon: I(id), minLevel: null, minHero })

export const WEAPONS = {
  Swordsman: [
    W('Bâton de bois',                                   1,    1),
    W('Gourdin en bois',                                 2,    4),
    W('Épée en bois',                                    3,    7),
    W('Marteau en bois',                                 4,   10),
    W('Marteau en bois lourd',                           5,   13),
    W("Épée en bois d'apprenti",                         6,   15),
    W("Épée d'Aventurier",                               7,   18),
    W("Épée d'apprenti",                                18,   15),
    W('Épée courte',                                    19,   20),
    W('Glaive',                                        135,   21),
    W('Épée de peine',                                  20,   26),
    W('Épée courte',                                    21,   29),
    W('Épée wallonne',                                 136,   30),
    W('Épée en bronze',                                 22,   34),
    W('Sabre',                                          23,   36),
    W('Sabre viking',                                  137,   37),
    W("Épée large de l'esprit",                         24,   40),
    W('Fauchon',                                        25,   42),
    W('Machette',                                      138,   43),
    W("Épée d'Elvin",                                  262,   45),
    W('Sabre en or',                                    26,   46),
    W('Épée large',                                     27,   48),
    W('Katzbalger',                                    139,   49),
    W('Épée longue du pouvoir',                         28,   52),
    W('Épée large',                                     29,   53),
    W('Épée de chevalier',                             140,   54),
    W('Skyabona',                                       30,   57),
    W('Épée claymore',                                  31,   60),
    W('Épée assassine',                                141,   63),
    W('Sabre glorieux',                                263,   65),
    W('Sabre vif',                                     263,   68),
    W('Surin',                                         299,   70),
    W('Loopuster',                                     400,   71),
    W('Lame laminante',                                299,   73),
    W('Épée élémentaire brisée',                       264,   75),
    W('Épée brisée',                                   401,   79),
    W('Épée tranchante du grand chef',                4001,   81),
    W('Épée du héros oublié +10',                     2465,   81),
    W('Honorable : épée houleuse de Calvina',          262,   82),
    W('Épée longue des voleurs du désert',             349,   83),
    W('Épée incendiaire de Magmaros',                 2464,   83),
    W('Lame épineuse',                                 349,   85),
    W('Épée incendiaire de Valakus',                  2406,   85),
    W("Lance obscure d'Hatus",                         350,   88),
    W('Schiavona',                                     350,   88),
    W('Épée houleuse de Calvina',                      350,   88),
    W('Honorable : épée tranchante du grand chef',     349,   88),
    WH('Épée de chef de guerre orc',                  4160,   10),
    WH('Épée céleste scellée',                        2759,   25),
    WH('Épée infernale scellée',                      2767,   25),
    WH('La lame droite de Krem brisé',                2813,   45),
    WH('Épée au loa lion',                            4161,   55),
    WH('Épée magique de Bélial',                      4162,   60),
    WH('Épée en os de dragon',                        4628,   65),
    WH('Pourfendeur de dragons',                      4629,   80),
    WH('Épée sacrée',                                 4944,   83),
    WH("Épée instable d'Achille",                     7599,   83),
    WH('Épée rotative',                               4945,   90),
    WH("Épée d'Achille",                              7503,   93),
    WH('Épée styxienne du fils de Thétis',            7504,   99),
  ],
  Archer: [
    W("Arc d'apprenti",                               32,   15),
    W('Petit arc',                                    33,   20),
    W('Arc de la vie',                               142,   21),
    W('Arc de vitesse',                               34,   26),
    W('Arc en bambou',                                35,   29),
    W('Arc de flammes',                              143,   30),
    W('Arc magique',                                  36,   34),
    W('Arc en chêne',                                 37,   36),
    W('Arc synthétique',                             144,   37),
    W('Arc du vent',                                  38,   40),
    W('Arc à corne',                                  39,   42),
    W('Arc double',                                  145,   43),
    W('Arc rouge',                                   265,   45),
    W('Arc en cuir',                                  40,   46),
    W('Arc de chasse',                                41,   48),
    W('Arc féroce',                                  146,   49),
    W('Arc du courage',                               42,   52),
    W('Arc long',                                     43,   53),
    W('Grand arc',                                   147,   54),
    W('Arc en bronze',                                44,   57),
    W("Arc de l'esprit",                              45,   60),
    W('Arc de siège',                                148,   63),
    W('Arc de la paix',                              266,   65),
    W('Arc de la forêt',                             266,   68),
    W('Arc de pouvoir',                              300,   70),
    W('Séraphin',                                    403,   71),
    W("Arc d'ange noir",                             300,   73),
    W('Arc majestueux',                              267,   75),
    W('Caipéru',                                     404,   79),
    W('Arc du grand chef',                          4003,   81),
    W('Arc du héros oublié +10',                    2467,   81),
    W('Honorable : arc tsunamique de Calvina',       265,   82),
    W('Arc des voleurs du désert',                   353,   83),
    W('Aile du phénix',                             2466,   83),
    W('Arc élémentaire',                             353,   85),
    W('Aile de Graal',                              2407,   85),
    W('Arc de la destruction',                       354,   88),
    W("Arc du précipice d'Hatus",                    354,   88),
    W('Arc tsunamique de Calvina',                   354,   88),
    W('Honorable : arc du grand chef',               353,   88),
    WH('Arc du maître-archer orc',                  4163,   10),
    WH('Arc céleste scellé',                        2761,   25),
    WH('Arc infernal scellé',                       2769,   25),
    WH("Ailes d'Azraël",                            2816,   45),
    WH('Arc au loa aigle',                          4164,   55),
    WH('Arc maudit de Bélial',                      4165,   60),
    WH('Arc draconique',                            4632,   65),
    WH('Souffle de la destruction',                 4633,   80),
    WH("Arc d'engrenage",                           4947,   83),
    WH("Arc instable de l'amiral Yi",               7600,   83),
    WH('Arc à vapeur',                              4946,   90),
    WH("Arc de l'amiral Yi",                        7505,   93),
    WH('Arc des guerres navales de Joseon',         7506,   99),
  ],
  Mage: [
    W("Baguette magique d'apprenti",                 46,   15),
    W('Baguette magique à perle rouge',              47,   20),
    W('Baguette magique de la vie',                 149,   21),
    W("Baguette magique de l'esprit",                48,   26),
    W('Baguette magique à rubis',                    49,   29),
    W('Baguette magique de flamme',                 150,   30),
    W('Baguette magique enchantée',                  50,   34),
    W('Baguette magique à perle bleue',              51,   36),
    W('Baguette magique de glace',                  151,   37),
    W('Baguette magique de la Lumière',              52,   40),
    W('Baguette magique à opale',                    53,   42),
    W('Baguette magique de Loon',                   152,   43),
    W('Baguette magique légendaire',                268,   45),
    W('Baguette magique créatrice de mana',          54,   46),
    W('Baguette magique à corail',                   55,   48),
    W('Baguette magique',                           153,   49),
    W("Baguette magique de l'honneur",               56,   52),
    W('Baguette magique à cristal',                  57,   53),
    W('Baguette magique sacrée',                    154,   54),
    W("Baguette magique de l'intelligence",          58,   57),
    W("Baguette magique de l'Obscurité",             59,   60),
    W("Baguette magique de l'âme",                 155,   63),
    W('Baguette magique du fantôme',                269,   65),
    W('Baguette magique à crâne',                   269,   68),
    W('Baguette magique de Kai',                    301,   70),
    W('Baguette magique du seigneur Mukraju',        406,   71),
    W("Baguette magique de l'Archimage",             301,   73),
    W('Baguette magique majestueuse',               270,   75),
    W("Baguette d'Aurélius",                        407,   79),
    W('Baguette magique du grand chef',            4005,   81),
    W('Baguette magique du héros oublié +10',      2469,   81),
    W('Honorable : baguette magique hydrophyte de Calvina', 268, 82),
    W('Canne des voleurs du désert',                356,   83),
    W('Bâton du spectre de lave',                  2468,   83),
    W('Baguette magique séraphin',                  356,   85),
    W('Baguette magique de Yertirand',             2938,   85),
    W('Baguette magique de Yertirand corrompu',    2939,   85),
    W('Baguette de Katol',                         2408,   85),
    W('Baguette magique de Taracen',                357,   88),
    W("Baguette infernale de Hatus",                357,   88),
    W('Baguette magique hydrophyte de Calvina',     357,   88),
    W('Honorable : baguette magique du grand chef', 356,   88),
    WH('Bâton divin du maître sorcier',            4166,   10),
    WH('Bâton céleste scellé',                     2760,   25),
    WH('Bâton infernal scellé',                    2768,   25),
    WH('Branche de lumière de Seli-Lusha',         2817,   45),
    WH('Bâton au loa serpent',                     4167,   55),
    WH('Bâton du roi des esprits',                 4168,   60),
    WH('Baguette magique draconique',              4630,   65),
    WH('Baguette animique draconique',             4631,   80),
    WH('Baguette magique électrique',              4948,   83),
    WH('Baguette instable de Merlin',              7601,   83),
    WH("Baguette magique d'énergie",               4949,   90),
    WH('Baguette de Merlin',                       7507,   93),
    WH("Baguette d'Avalon",                        7508,   99),
  ],
  Martial: [
    W("Poing d'acier",                             4014,   80),
    W('Gant de cavalier court',                    4012,   80),
    W('Gant en acier froid',                       4019,   81),
    W('Larme de Ladine',                           4020,   81),
    W('Gant des arts martiaux',                    4013,   82),
    W('Main noire',                                4016,   82),
    W('Griffe de Fenris',                          4021,   83),
    W('Gant de golem de feu',                      4022,   83),
    W('Gant en cuir renforcé',                     4012,   84),
    W('Gant des arts martiaux en cuir',            4013,   84),
    W("Gant d'écailles du chaos",                  4023,   85),
    W("Flamme de l'Ifrit",                         4024,   85),
    W('Gant puissant',                             4015,   86),
    W("Gant de l'apprenti assassin",               4017,   86),
    W('Gant de Sicario',                           4017,   88),
    W('Poing noir',                                4018,   88),
    WH('Gants de plaques orcs en sekrass',         4169,   10),
    WH('Poing de la déesse scellée',               4025,   25),
    WH('Poing de dieu',                            4026,   45),
    WH('Gants de plaques au loa ours',             4170,   55),
    WH('Gants de plaques du roi des bêtes',        4171,   60),
    WH('Griffe draconique',                        4626,   65),
    WH('Griffe givrée',                            4627,   80),
    WH('Gantelets à vapeur',                       4950,   83),
    WH('Gants instables de Thor',                  7602,   83),
    WH("Gantelets d'allumage",                     4951,   90),
    WH('Gants de Thor',                            7509,   93),
    WH('Gants du tonnerre de Niflheim',            7510,   99),
  ],
}

export const ELEMENT_COLORS = {
  Neutral: '#9ca3af',
  Fire:    '#ef4444',
  Water:   '#3b82f6',
  Light:   '#fbbf24',
  Shadow:  '#8b5cf6',
}

export const ELEMENT_ICONS = {
  Neutral: '○',
  Fire:    '🔥',
  Water:   '💧',
  Light:   '✨',
  Shadow:  '🌑',
}

// ── Player accounts (username → up to 4 characters) ───────────────────────

export const mockAccounts = [
  {
    username: 'Veqza',
    characters: [
      {
        id: 'a1-c1', name: 'Lyraethis', class: 'Archer', level: 99, heroLevel: 55, prestige: 3, element: 'Fire',
        stats:       { atk: 12450, def: 8920, matk: null,  mdef: 4800,  hp: 42800, mp: 15200, speed: 22, critRate: 48, critDmg: 250, hit: 95, avoid: 18 },
        equipment:   { weapon: 'Scarlet Moon Bow', offhand: null, armor: 'Eternal Winds Outfit', hat: null, gloves: null, shoes: null, necklace: null, ring: 'Ring of the Dawn', bracelet: null, sp: 'Sharpshooter', fairy: 'Tera the Fire +10' },
        resistances: { fire: 12, water: 5, light: 8, shadow: 3 },
      },
      {
        id: 'a1-c2', name: 'Solaris', class: 'Mage', level: 72, heroLevel: 18, prestige: 0, element: 'Light',
        stats:       { atk: null, def: null, matk: 11200, mdef: 5400, hp: 28000, mp: 22000, speed: 19, critRate: 35, critDmg: 180, hit: 88, avoid: 12 },
        equipment:   { weapon: 'Staff of Broken Stars', offhand: null, armor: 'Celestial Satin Robe', hat: null, gloves: null, shoes: null, necklace: null, ring: null, bracelet: null, sp: 'Elemental Sage', fairy: 'Lola the Ice +3' },
        resistances: { fire: 5, water: 10, light: 25, shadow: 2 },
      },
    ],
  },
  {
    username: 'Darkblade',
    characters: [
      {
        id: 'a2-c1', name: 'Kaelthas', class: 'Swordsman', level: 87, heroLevel: 32, prestige: 1, element: 'Shadow',
        stats:       { atk: 9800, def: 14200, matk: null, mdef: 8600, hp: 58000, mp: 8400, speed: 16, critRate: 22, critDmg: 150, hit: 90, avoid: 8 },
        equipment:   { weapon: 'Twilight Sword', offhand: null, armor: 'Titanite Armor', hat: null, gloves: null, shoes: null, necklace: null, ring: 'Belt of Strength', bracelet: null, sp: 'Paladin of Light', fairy: 'Celle the Thunder +7' },
        resistances: { fire: 3, water: 3, light: 5, shadow: 15 },
      },
      {
        id: 'a2-c2', name: 'Shadowreaper', class: 'Martial', level: 45, heroLevel: 0, prestige: 0, element: 'Neutral',
        stats:       { atk: null, def: null, matk: null, mdef: null, hp: null, mp: null, speed: null, critRate: null, critDmg: null, hit: null, avoid: null },
        equipment:   { weapon: null, offhand: null, armor: null, hat: null, gloves: null, shoes: null, necklace: null, ring: null, bracelet: null, sp: null, fairy: null },
        resistances: { fire: 0, water: 0, light: 0, shadow: 0 },
      },
    ],
  },
  {
    username: 'Vaelindra',
    characters: [
      {
        id: 'a3-c1', name: 'Vaelindra', class: 'Mage', level: 99, heroLevel: 62, prestige: 2, element: 'Water',
        stats:       { atk: null, def: null, matk: 15200, mdef: 9800, hp: 32000, mp: 28000, speed: 20, critRate: 55, critDmg: 280, hit: 92, avoid: 15 },
        equipment:   { weapon: 'Crystalline Staff', offhand: null, armor: 'Arcane Robe', hat: null, gloves: null, shoes: null, necklace: 'Wisdom Pendant', ring: null, bracelet: null, sp: 'Sorcerer', fairy: null },
        resistances: { fire: 2, water: 35, light: 8, shadow: 5 },
      },
    ],
  },
  {
    username: 'Zephyr_wind',
    characters: [
      {
        id: 'a4-c1', name: 'Zephir', class: 'Martial', level: 98, heroLevel: 48, prestige: 2, element: 'Neutral',
        stats:       { atk: 10200, def: 9400, matk: null, mdef: 7200, hp: 48000, mp: 10000, speed: 28, critRate: 42, critDmg: 200, hit: 97, avoid: 22 },
        equipment:   { weapon: 'Iron Fists +12', offhand: null, armor: 'Dragon Scale Suit', hat: null, gloves: null, shoes: null, necklace: null, ring: null, bracelet: null, sp: 'Berserker', fairy: 'Isha the Wind +8' },
        resistances: { fire: 8, water: 8, light: 8, shadow: 8 },
      },
      {
        id: 'a4-c2', name: 'Zephira', class: 'Archer', level: 60, heroLevel: 5, prestige: 0, element: 'Neutral',
        stats:       { atk: 5800, def: 3200, matk: null, mdef: 2400, hp: 18000, mp: 8000, speed: 18, critRate: 28, critDmg: 150, hit: 80, avoid: 14 },
        equipment:   { weapon: null, offhand: null, armor: null, hat: null, gloves: null, shoes: null, necklace: null, ring: null, bracelet: null, sp: null, fairy: null },
        resistances: { fire: 0, water: 0, light: 0, shadow: 0 },
      },
      {
        id: 'a4-c3', name: 'Stormbringer', class: 'Mage', level: 38, heroLevel: 0, prestige: 0, element: 'Neutral',
        stats:       { atk: null, def: null, matk: null, mdef: null, hp: null, mp: null, speed: null, critRate: null, critDmg: null, hit: null, avoid: null },
        equipment:   { weapon: null, offhand: null, armor: null, hat: null, gloves: null, shoes: null, necklace: null, ring: null, bracelet: null, sp: null, fairy: null },
        resistances: { fire: 0, water: 0, light: 0, shadow: 0 },
      },
    ],
  },
  {
    username: 'Seraphix',
    characters: [
      {
        id: 'a5-c1', name: 'Seraphix', class: 'Archer', level: 98, heroLevel: 51, prestige: 2, element: 'Light',
        stats:       { atk: 13200, def: 7600, matk: null, mdef: 5200, hp: 38000, mp: 14000, speed: 24, critRate: 52, critDmg: 270, hit: 96, avoid: 20 },
        equipment:   { weapon: 'Seraph Longbow', offhand: null, armor: 'Golden Aegis Coat', hat: null, gloves: null, shoes: null, necklace: 'Holy Amulet', ring: null, bracelet: null, sp: 'Holy Sniper', fairy: 'Asha the Light +11' },
        resistances: { fire: 5, water: 5, light: 30, shadow: 1 },
      },
    ],
  },
  {
    username: 'Drakonis',
    characters: [
      {
        id: 'a6-c1', name: 'Drakonis', class: 'Swordsman', level: 95, heroLevel: 40, prestige: 1, element: 'Fire',
        stats:       { atk: 11500, def: 13000, matk: null, mdef: 7800, hp: 55000, mp: 9200, speed: 17, critRate: 30, critDmg: 160, hit: 91, avoid: 10 },
        equipment:   { weapon: 'Dragonsteel Blade', offhand: null, armor: 'Scale Mail', hat: null, gloves: null, shoes: null, necklace: null, ring: null, bracelet: null, sp: 'Berserker', fairy: 'Celle the Fire +6' },
        resistances: { fire: 20, water: 2, light: 4, shadow: 4 },
      },
      {
        id: 'a6-c2', name: 'Thornwick', class: 'Martial', level: 85, heroLevel: 22, prestige: 0, element: 'Neutral',
        stats:       { atk: 8900, def: 8100, matk: null, mdef: 6000, hp: 42000, mp: 9500, speed: 25, critRate: 38, critDmg: 190, hit: 89, avoid: 19 },
        equipment:   { weapon: 'Thunder Gauntlets', offhand: null, armor: 'Raging Tiger Suit', hat: null, gloves: null, shoes: null, necklace: null, ring: null, bracelet: null, sp: 'Monk', fairy: null },
        resistances: { fire: 5, water: 5, light: 5, shadow: 5 },
      },
    ],
  },
]

// ── Legacy mock data (used by older components) ────────────────────────────

export const mockCharacters = mockAccounts[0].characters

export const mockPlayer = mockCharacters[0]

// ── Hub data ──────────────────────────────────────────────────────────────

export const mockHubStats = {
  players:   '12,489',
  guilds:    '847',
  raidsDone: '34,201',
}

export const mockNews = [
  {
    id:       1,
    tag:      'Update',
    tagColor: '#c9a84c',
    date:     'March 1, 2026',
    title:    'New Raid: Fortress of Shadows',
    excerpt:  'A new legendary 20-player raid is now available. Unlock exclusive rewards.',
  },
  {
    id:       2,
    tag:      'Event',
    tagColor: '#60a5fa',
    date:     'Feb. 28, 2026',
    title:    'Double XP this weekend!',
    excerpt:  'Enjoy a doubled experience bonus all weekend to celebrate the server anniversary.',
  },
  {
    id:       3,
    tag:      'Community',
    tagColor: '#22c55e',
    date:     'Feb. 25, 2026',
    title:    'Monthly ranking updated',
    excerpt:  "February's ranking is now available. Congratulations to the winners!",
  },
]

export const mockTopPlayers = [
  { rank: 1, name: "Kael'thas", class: 'Swordsman', level: 99, heroLevel: 70, server: 'Alzanor' },
  { rank: 2, name: 'Lyraethis', class: 'Archer',    level: 99, heroLevel: 55, server: 'Alzanor' },
  { rank: 3, name: 'Vaelindra', class: 'Mage',      level: 99, heroLevel: 62, server: 'Tyr'     },
  { rank: 4, name: 'Zephir',    class: 'Martial',   level: 98, heroLevel: 48, server: 'Alzanor' },
  { rank: 5, name: 'Seraphix',  class: 'Archer',    level: 98, heroLevel: 51, server: 'Fafnir'  },
]

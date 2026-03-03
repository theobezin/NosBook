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
export const EQUIP_KEYS   = ['weapon', 'offhand', 'armor', 'hat', 'gloves', 'shoes', 'necklace', 'ring', 'bracelet']
export const SPECIAL_KEYS = ['sp', 'fairy']
export const ELEMENTS     = ['Neutral', 'Fire', 'Water', 'Light', 'Shadow']

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

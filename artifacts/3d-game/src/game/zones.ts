import { PLANET_RADIUS, WORLD_RADIUS } from './world';
import type { Resources } from './store';

/**
 * Les zones de la planète.
 *
 * Le playtest décrivait les étendues sombres autour du plateau comme un effet
 * « pas fini ». Elles ne le sont plus : ce sont quatre secteurs verrouillés,
 * chacun avec son biome, que le joueur achète et annexe. La planète cesse
 * d'être un disque fini d'avance pour devenir quelque chose qu'on agrandit.
 *
 * ## Géométrie
 *
 * Le plateau de départ est le disque `r < WORLD_RADIUS` (14). Les quatre zones
 * sont des secteurs de la couronne `WORLD_RADIUS → ZONE_OUTER_RADIUS` (22),
 * chacun couvrant un quart de tour. Débloquer un secteur étend la zone jouable
 * **et** constructible à l'intérieur de ce quart, et nulle part ailleurs :
 * c'est `maxRadiusAt` qui arbitre, et tout le reste s'appuie dessus.
 *
 * ## Angles
 *
 * Les secteurs sont décrits en angle mathématique du plan (x, z) :
 * `atan2(z, x)`, 0 = axe +X, sens direct. C'est la seule convention utilisée
 * ici. `Ground.tsx` la traduit vers le `phiStart` de three (`phi = π − angle`,
 * voir le commentaire de `ZoneGround`) — c'est le seul endroit qui convertit.
 *
 * ## Ce qui viendra
 *
 * Chaque zone porte déjà un `corePos` : l'emplacement de son propre cœur à
 * défendre, prévu au retour de playtest (« dans les autres zones, il y aura
 * d'autres cœurs à défendre »). Il n'est pas encore actif — le combat n'a
 * qu'un cœur, celui du centre — mais la donnée est là et l'emplacement est
 * déjà tenu libre par la validation de placement.
 */

/** Rayon extérieur des zones annexables. */
export const ZONE_OUTER_RADIUS = 22;

export type BiomePalette = {
  /** Sol de la zone une fois annexée. */
  ground: string;
  /** Falaise et rochers. */
  rock: string;
  /** Végétation ou cristaux — la couleur d'accent du biome. */
  accent: string;
  /** Émissif : ce qui brille dans ce biome. */
  glow: string;
};

/**
 * Ce qu'un secteur rapporte une fois annexé.
 *
 * Un seul effet par zone, chiffré et permanent. Le playtest était net :
 * « on les achète et y a rien à faire après ». Du terrain constructible en
 * plus, ce n'est pas une récompense qu'on ressent — il faut que quelque chose
 * change dans le combat ou dans l'économie, et que ce soit dicible en une
 * ligne sur la fiche.
 */
export type ZoneBonus =
  /** Multiplie les dégâts de toutes les tours. */
  | { kind: 'towerDamage'; value: number; label: string }
  /** Ralentit tous les monstres, partout, en permanence. */
  | { kind: 'enemySlow'; value: number; label: string }
  /** Majore le butin de chaque vague gagnée. */
  | { kind: 'loot'; value: number; label: string }
  /** Recrute des Chasseurs spatiaux en plus de ceux du Bar. */
  | { kind: 'hunters'; value: number; label: string };

/** Le gisement propre au biome, récoltable comme les trois du plateau. */
export type ZoneNode = {
  resource: 'boulons' | 'matiere_floue' | 'energie_rire';
  amount: number;
  cooldown: number;
  /** Position, en coordonnées de la carte. */
  pos: [number, number];
};

export type ZoneDef = {
  id: string;
  name: string;
  /** Une phrase : ce qu'on y trouve, ce que ça change. */
  blurb: string;
  /** Bornes angulaires, en radians, dans la convention `atan2(z, x)`. */
  from: number;
  to: number;
  palette: BiomePalette;
  cost: Partial<Resources>;
  /** Niveau de commandant exigé — les zones s'ouvrent au fil de la partie. */
  requiredLevel: number;
  /** Emplacement du futur cœur de la zone. Réservé, pas encore actif. */
  corePos: [number, number];
  /** Forme du décor propre au biome. Voir `ZoneDecor` dans Ground.tsx. */
  decor: 'obsidian' | 'ice' | 'spore' | 'dune';
  /** L'effet permanent que son annexion débloque. */
  bonus: ZoneBonus;
  /** Le gisement qu'on vient y récolter. */
  node: ZoneNode;
};

const Q = Math.PI / 2;

export const ZONES: ZoneDef[] = [
  {
    id: 'cendres',
    name: 'Plaines de Cendre',
    blurb: 'Une coulée refroidie, hérissée d’obsidienne. Rien n’y pousse, tout y tient.',
    from: -Q / 2,
    to: Q / 2,
    palette: { ground: '#5b4038', rock: '#2f2224', accent: '#e25822', glow: '#ff7b00' },
    cost: { boulons: 1500, matiere_floue: 20 },
    requiredLevel: 3,
    corePos: [18, 0],
    decor: 'obsidian',
    bonus: { kind: 'towerDamage', value: 0.2, label: 'Toutes les tours : +20 % de dégâts' },
    node: { resource: 'boulons', amount: 30, cooldown: 6, pos: [17.5, 0] },
  },
  {
    id: 'givre',
    name: 'Toundra de Givre',
    blurb: 'Le versant à l’ombre. La glace y garde tout ce qui tombe.',
    from: Q / 2,
    to: Q * 1.5,
    palette: { ground: '#9fc7d6', rock: '#5b7b8c', accent: '#e0f2fe', glow: '#7dd3fc' },
    cost: { boulons: 3000, matiere_floue: 55 },
    requiredLevel: 5,
    corePos: [0, 18],
    decor: 'ice',
    bonus: { kind: 'enemySlow', value: 0.12, label: 'Tous les monstres : 12 % plus lents' },
    node: { resource: 'matiere_floue', amount: 3, cooldown: 16, pos: [0, 17.5] },
  },
  {
    id: 'spores',
    name: 'Jungle de Spores',
    blurb: 'Elle brille toute seule la nuit. Personne ne sait vraiment pourquoi.',
    from: Q * 1.5,
    to: Q * 2.5,
    palette: { ground: '#3f5f4a', rock: '#3c2a4d', accent: '#b388eb', glow: '#c77dff' },
    cost: { boulons: 6000, matiere_floue: 110, energie_rire: 8 },
    requiredLevel: 8,
    corePos: [-18, 0],
    decor: 'spore',
    bonus: { kind: 'hunters', value: 2, label: 'Deux Chasseurs spatiaux de plus' },
    node: { resource: 'matiere_floue', amount: 5, cooldown: 13, pos: [-17.5, 0] },
  },
  {
    id: 'dunes',
    name: 'Dunes Dorées',
    blurb: 'Du sable de verre, à perte de vue. Il chante quand le vent se lève.',
    from: Q * 2.5,
    to: Q * 3.5,
    palette: { ground: '#d9b169', rock: '#a67c45', accent: '#ffd24c', glow: '#ffe066' },
    cost: { boulons: 12000, matiere_floue: 220, energie_rire: 25 },
    requiredLevel: 12,
    corePos: [0, -18],
    decor: 'dune',
    bonus: { kind: 'loot', value: 0.3, label: 'Butin de vague : +30 %' },
    node: { resource: 'energie_rire', amount: 3, cooldown: 20, pos: [0, -17.5] },
  },
];

/** Angle ramené dans [0, 2π). */
function norm(a: number): number {
  const t = a % (Math.PI * 2);
  return t < 0 ? t + Math.PI * 2 : t;
}

/** Le point (x, z) tombe-t-il dans le secteur angulaire de cette zone ? */
export function inSector(zone: ZoneDef, x: number, z: number): boolean {
  const a = norm(Math.atan2(z, x));
  const from = norm(zone.from);
  const to = norm(zone.to);
  // Un secteur peut enjamber le zéro (cas de `cendres`, de −45° à +45°).
  return from <= to ? a >= from && a < to : a >= from || a < to;
}

/** La zone qui contient ce point, débloquée ou non. */
export function zoneAt(x: number, z: number): ZoneDef | null {
  for (const zone of ZONES) if (inSector(zone, x, z)) return zone;
  return null;
}

/**
 * Jusqu'où on peut aller dans cette direction.
 *
 * `WORLD_RADIUS` partout par défaut — c'est exactement la limite d'avant, donc
 * une partie sans zone annexée se comporte comme avant, au pixel près. Dans un
 * secteur annexé, la limite recule jusqu'à `ZONE_OUTER_RADIUS`.
 */
export function maxRadiusAt(x: number, z: number, unlocked: Record<string, true>): number {
  const zone = zoneAt(x, z);
  if (zone && unlocked[zone.id]) return ZONE_OUTER_RADIUS;
  return WORLD_RADIUS;
}

/** Le rayon le plus lointain atteignable, toutes zones confondues. */
export function outermostRadius(unlocked: Record<string, true>): number {
  return ZONES.some((z) => unlocked[z.id]) ? ZONE_OUTER_RADIUS : WORLD_RADIUS;
}

/** Angle polaire des bornes de la couronne, pour découper la sphère. */
export const ZONE_THETA_INNER = Math.asin(WORLD_RADIUS / PLANET_RADIUS);
export const ZONE_THETA_OUTER = Math.asin(ZONE_OUTER_RADIUS / PLANET_RADIUS);


/**
 * Les effets cumulés des secteurs annexés.
 *
 * Une seule fonction, lue partout où un bonus s'applique : les tours pour
 * leurs dégâts, `Enemies.tsx` pour la vitesse, `rewardVictory` pour le butin,
 * `Hunters.tsx` pour l'effectif. Tout à zéro quand rien n'est annexé — donc
 * une partie neuve, et les outils de vérification, se comportent exactement
 * comme avant.
 */
export type ZoneEffects = {
  /** Multiplicateur de dégâts des tours (1 = inchangé). */
  towerDamage: number;
  /** Ralentissement des monstres, de 0 à 1. */
  enemySlow: number;
  /** Multiplicateur de butin (1 = inchangé). */
  loot: number;
  /** Chasseurs spatiaux supplémentaires. */
  extraHunters: number;
};

/**
 * Cache d'identité.
 *
 * `zoneEffects` est appelée **par monstre et par tour, à chaque image** : elle
 * décide de la vitesse des uns et des dégâts des autres. Telle qu'écrite
 * d'abord, elle rendait un objet neuf à chaque appel — une vingtaine de
 * monstres et une poignée de tours, c'est près de deux mille allocations par
 * seconde en pleine vague, exactement ce que proscrit
 * `.agents/memory/r3f-game-perf.md`.
 *
 * `unlockedZones` est une référence stable dans le magasin : elle n'est
 * remplacée qu'à l'annexion d'un secteur. Une comparaison d'identité suffit
 * donc à savoir si le résultat est encore bon, et il l'est presque toujours.
 */
let cachedFor: Record<string, true> | null = null;
let cached: ZoneEffects = { towerDamage: 1, enemySlow: 0, loot: 1, extraHunters: 0 };

export function zoneEffects(unlocked: Record<string, true>): ZoneEffects {
  if (unlocked === cachedFor) return cached;

  const out: ZoneEffects = { towerDamage: 1, enemySlow: 0, loot: 1, extraHunters: 0 };
  for (const zone of ZONES) {
    if (!unlocked[zone.id]) continue;
    const b = zone.bonus;
    if (b.kind === 'towerDamage') out.towerDamage += b.value;
    else if (b.kind === 'enemySlow') out.enemySlow += b.value;
    else if (b.kind === 'loot') out.loot += b.value;
    else out.extraHunters += b.value;
  }

  cachedFor = unlocked;
  cached = out;
  return out;
}

/**
 * Les gisements des secteurs annexés, pour `ResourceNodes` et la validation de
 * placement. Même cache d'identité que `zoneEffects` : la validation l'appelle
 * à chaque mouvement du doigt pendant une pose.
 */
let cachedNodesFor: Record<string, true> | null = null;
let cachedNodes: { zone: ZoneDef; node: ZoneNode }[] = [];

export function unlockedZoneNodes(unlocked: Record<string, true>): { zone: ZoneDef; node: ZoneNode }[] {
  if (unlocked === cachedNodesFor) return cachedNodes;
  cachedNodesFor = unlocked;
  cachedNodes = ZONES.filter((z) => unlocked[z.id]).map((zone) => ({ zone, node: zone.node }));
  return cachedNodes;
}

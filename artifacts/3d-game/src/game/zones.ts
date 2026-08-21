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

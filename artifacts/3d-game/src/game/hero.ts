import type { Resources } from './store';

/**
 * Le héros s'améliore.
 *
 * Demandé au playtest : « ajouter la possibilité d'améliorer notre bonhomme et
 * potentiellement lui donner des super-pouvoirs ». Jusqu'ici tout
 * l'investissement du joueur allait dans des bâtiments ; le personnage qu'il
 * pilote, lui, était le même à la vague 1 et à la vague 20.
 *
 * Trois pistes chiffrées, et deux pouvoirs actifs. Les pistes se paient en
 * ressources, les pouvoirs s'ouvrent au niveau de commandant : on ne peut pas
 * acheter la puissance de fin de partie avec un stock de boulons.
 */

export type HeroTrackId = 'puissance' | 'portee' | 'vitesse';

export type HeroTrack = {
  id: HeroTrackId;
  name: string;
  /** Ce que le niveau suivant change, en une phrase. */
  blurb: string;
  /** Gain par niveau, appliqué dans `Hero.tsx`. */
  perLevel: number;
  /** Unité affichée à côté du gain. */
  unit: string;
  maxLevel: number;
  /** Coût du passage au niveau `n` (0 pour le premier). */
  cost: (level: number) => Partial<Resources>;
};

export const HERO_TRACKS: HeroTrack[] = [
  {
    id: 'puissance',
    name: 'Puissance',
    blurb: 'Le rayon du héros frappe plus fort.',
    perLevel: 18,
    unit: 'dégâts/sec',
    maxLevel: 5,
    cost: (level) => ({
      boulons: 400 * Math.pow(2.1, level),
      matiere_floue: level >= 2 ? 15 * level : 0,
    }),
  },
  {
    id: 'portee',
    name: 'Portée',
    blurb: 'Il engage les monstres de plus loin.',
    perLevel: 0.9,
    unit: 'unités',
    maxLevel: 4,
    cost: (level) => ({
      boulons: 600 * Math.pow(2.2, level),
      matiere_floue: level >= 1 ? 20 * (level + 1) : 0,
    }),
  },
  {
    id: 'vitesse',
    name: 'Vitesse',
    blurb: 'Il traverse la planète plus vite.',
    perLevel: 0.55,
    unit: 'unités/sec',
    maxLevel: 4,
    cost: (level) => ({
      boulons: 500 * Math.pow(2.15, level),
      energie_rire: level >= 2 ? 3 * level : 0,
    }),
  },
];

/** Somme du gain d'une piste au niveau atteint. */
export function trackBonus(track: HeroTrack, level: number): number {
  return track.perLevel * Math.min(level, track.maxLevel);
}

export function heroTrack(id: HeroTrackId): HeroTrack {
  return HERO_TRACKS.find((t) => t.id === id) ?? HERO_TRACKS[0];
}

// ---------------------------------------------------------------------------
// Les pouvoirs
// ---------------------------------------------------------------------------

export type PowerId = 'onde' | 'surcharge';

export type PowerDef = {
  id: PowerId;
  name: string;
  blurb: string;
  /** Niveau de commandant qui l'ouvre. */
  requiredLevel: number;
  /** Recharge, en secondes. */
  cooldown: number;
  /** Durée de l'effet pour les pouvoirs qui durent. 0 = instantané. */
  duration: number;
  color: string;
};

export const POWERS: Record<PowerId, PowerDef> = {
  onde: {
    id: 'onde',
    name: 'Onde de choc',
    blurb: 'Frappe tout ce qui entoure le héros et le repousse.',
    requiredLevel: 4,
    cooldown: 22,
    duration: 0,
    color: '#7dd3fc',
  },
  surcharge: {
    id: 'surcharge',
    name: 'Surcharge',
    blurb: 'Double les dégâts du héros pendant huit secondes.',
    requiredLevel: 9,
    cooldown: 40,
    duration: 8,
    color: '#ffd24c',
  },
};

/** Dégâts de l'onde de choc, et son rayon. */
export const SHOCK_DAMAGE = 220;
export const SHOCK_RADIUS = 6.5;
/** De combien l'onde repousse les monstres, en unités. */
export const SHOCK_PUSH = 2.6;
/** Multiplicateur de dégâts pendant la surcharge. */
export const SURCHARGE_FACTOR = 2;

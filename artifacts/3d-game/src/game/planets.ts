import type { BiomePalette, ZoneDef } from './zones';
import { ZONES } from './zones';
import type { Resources } from './store';

/**
 * Les planètes.
 *
 * Planète 1 (`terre`) est le jeu d'aujourd'hui : ses secteurs sont `ZONES`.
 * Planète 2 (`cristalline`) n'est qu'une fiche pour l'instant — rien ne
 * l'affiche ni n'y mène (étapes 2 et 3 du backlog). La planète courante est
 * `currentPlanet` dans le store ; une sauvegarde sans ce champ garde la valeur
 * initiale, `terre`, donc aucune migration.
 */
export type PlanetId = 'terre' | 'cristalline';

export const DEFAULT_PLANET: PlanetId = 'terre';

export type PlanetDef = {
  id: PlanetId;
  name: string;
  /** Une phrase : l'ambiance, ce qui la distingue. */
  blurb: string;
  /** Couleurs : sol du plateau, ciel (fond de scène), et accent/lueur. */
  palette: BiomePalette & { sky: string };
  /** Forme du décor propre à la planète (étape 2 la rendra). */
  decor: 'meadow' | 'crystal';
  /** Secteurs annexables, sur le modèle de `zones.ts`. */
  zones: ZoneDef[];
  /** Couleur du cœur de cristal à protéger. */
  coreColor: string;
  /**
   * Bâtiments déjà là à la première arrivée (niveau 1, déjà construits).
   * Vide sur la Terre : une partie neuve y commence sans rien.
   */
  startBase: { id: string; pos: [number, number, number] }[];
};

const Q = Math.PI / 2;

/**
 * Thème choisi par l'agent (Allonzo peut le changer) : une planète de cristal
 * violet sous un ciel d'aurore, où tout résonne.
 */
const CRISTALLINE_ZONES: ZoneDef[] = [
  {
    id: 'cristal_geodes',
    name: 'Champ de Géodes',
    blurb: 'Des géodes grandes comme des maisons. Elles chantent quand on passe.',
    from: -Q / 2,
    to: Q / 2,
    palette: { ground: '#6b4f9a', rock: '#2d1b4e', accent: '#d8b4fe', glow: '#c084fc' },
    cost: { boulons: 20000, matiere_floue: 300 },
    requiredLevel: 1,
    corePos: [18, 0],
    decor: 'ice',
    bonus: { kind: 'towerDamage', value: 0.2, label: 'Toutes les tours : +20 % de dégâts' },
    node: { resource: 'matiere_floue', amount: 6, cooldown: 12, pos: [17.5, 0] },
  },
  {
    id: 'cristal_miroirs',
    name: 'Lac des Miroirs',
    blurb: 'Une nappe de verre noir. Le ciel s’y reflète deux fois.',
    from: Q / 2,
    to: Q * 1.5,
    palette: { ground: '#2a3a6b', rock: '#141b3a', accent: '#93c5fd', glow: '#60a5fa' },
    cost: { boulons: 30000, matiere_floue: 450 },
    requiredLevel: 1,
    corePos: [0, 18],
    decor: 'ice',
    bonus: { kind: 'enemySlow', value: 0.12, label: 'Tous les monstres : 12 % plus lents' },
    node: { resource: 'energie_rire', amount: 4, cooldown: 18, pos: [0, 17.5] },
  },
];

export const PLANETS: Record<PlanetId, PlanetDef> = {
  terre: {
    id: 'terre',
    name: 'Planète d’origine',
    blurb: 'Le village, son plateau d’herbe et ses quatre secteurs à annexer.',
    palette: { ground: '#6ede8a', rock: '#7a5c47', accent: '#57cc99', glow: '#ffebc8', sky: '#0d1117' },
    decor: 'meadow',
    zones: ZONES,
    coreColor: '#7df9ff',
    startBase: [],
  },
  cristalline: {
    id: 'cristalline',
    name: 'Cristalline',
    blurb: 'Une planète de cristal violet sous une aurore permanente. Tout y résonne.',
    palette: { ground: '#7c5cbf', rock: '#2d1b4e', accent: '#d8b4fe', glow: '#c084fc', sky: '#1a0f3a' },
    decor: 'crystal',
    zones: CRISTALLINE_ZONES,
    coreColor: '#f0abfc',
    // Un camp de base : de quoi produire et tenir la première vague. Positions
    // libres de décor, vérifiées par `smoke.mjs` (« voyage planète 2 »).
    startBase: [
      { id: 'hutte', pos: [-5.8, 0, -1.55] },
      { id: 'tourelle', pos: [3.54, 0, -3.54] },
    ],
  },
};

export function planetById(id: string | undefined): PlanetDef {
  return PLANETS[id as PlanetId] ?? PLANETS[DEFAULT_PLANET];
}

/** Ce qu'il faut avoir fait sur la Terre pour partir vers Cristalline. */
export const PLANET_UNLOCK_TEXT: Record<PlanetId, string> = {
  terre: '',
  cristalline: 'Annexez les quatre secteurs de la planète d’origine.',
};

/** Vrai si le joueur peut se rendre sur cette planète. */
export function planetUnlocked(id: PlanetId, unlockedZones: Record<string, true>): boolean {
  if (id === 'terre') return true;
  return ZONES.every((z) => unlockedZones[z.id]);
}

/**
 * Ce que Cristalline rapporte (étape 6).
 *
 * 1. Ses ressources : chaque vague gagnée là-bas ajoute de la matière floue et
 *    de l'énergie de rire — les deux ressources rares — au butin ordinaire.
 * 2. Un effet sur la planète d'origine : avoir tenu `HOME_BONUS.wave` vagues
 *    sur Cristalline majore les tours de la Terre, définitivement.
 */
export function planetLootExtra(planet: PlanetId, wave: number): Partial<Resources> {
  if (planet !== 'cristalline') return {};
  return { matiere_floue: wave * 2, energie_rire: Math.ceil(wave / 2) };
}

export const LOOT_EXTRA_TEXT: Record<PlanetId, string> = {
  terre: '',
  cristalline: 'Chaque vague gagnée y rapporte de la matière floue et de l’énergie de rire en plus.',
};

export const HOME_BONUS = {
  wave: 5,
  towerDamage: 0.15,
  label: 'Tenir 5 vagues sur Cristalline : toutes les tours de la planète d’origine +15 % de dégâts',
};

/** Multiplicateur de dégâts des tours dû aux autres planètes, selon où l'on se trouve. */
export function planetTowerMultiplier(current: PlanetId, cristallineBest: number): number {
  return current === 'terre' && cristallineBest >= HOME_BONUS.wave ? 1 + HOME_BONUS.towerDamage : 1;
}

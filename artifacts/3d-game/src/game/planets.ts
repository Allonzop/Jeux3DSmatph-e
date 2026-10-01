import type { BiomePalette, ZoneDef } from './zones';
import { ZONES } from './zones';

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
  },
  cristalline: {
    id: 'cristalline',
    name: 'Cristalline',
    blurb: 'Une planète de cristal violet sous une aurore permanente. Tout y résonne.',
    palette: { ground: '#7c5cbf', rock: '#2d1b4e', accent: '#d8b4fe', glow: '#c084fc', sky: '#1a0f3a' },
    decor: 'crystal',
    zones: CRISTALLINE_ZONES,
  },
};

export function planetById(id: string | undefined): PlanetDef {
  return PLANETS[id as PlanetId] ?? PLANETS[DEFAULT_PLANET];
}

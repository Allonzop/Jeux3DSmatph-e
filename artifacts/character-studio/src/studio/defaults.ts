import { resolveDef, PERSONALITIES } from '@game/characters/types';
import type {
  BodyType, CharacterDef, EyeShape, MouthShape, Palette, Personality, ResolvedCharacterDef,
} from '@game/characters/types';
import {
  headwearRegistry, backRegistry, neckRegistry, faceGearRegistry,
} from '@game/characters/parts';

/**
 * Toutes les valeurs par défaut sont *dérivées du kit* via `resolveDef`, jamais
 * recopiées (PRD §3). Si le kit change un défaut, le studio suit sans retouche.
 */
const BASE = resolveDef({ id: '', seed: 0, primary: '#000000' });

export const DEFAULTS = {
  secondary: BASE.palette.secondary,
  accent: BASE.palette.accent,
  skin: BASE.palette.skin,
  glow: BASE.palette.glow,
  bodyType: BASE.bodyType,
  headScale: BASE.headScale,
  limbThickness: BASE.limbThickness,
  scale: BASE.scale,
  headwear: BASE.headwear,
  back: BASE.back,
  neck: BASE.neck,
  faceGear: BASE.faceGear,
  eyeShape: BASE.eyeShape,
  mouth: BASE.mouth,
  brows: BASE.brows,
  personality: BASE.personality,
};

/**
 * Les options des menus déroulants d'accessoires viennent des registres du kit
 * (PRD §3) : ajouter un accessoire au kit le fait apparaître ici sans autre
 * modification.
 */
export const HEADWEAR_KEYS = Object.keys(headwearRegistry) as (keyof typeof headwearRegistry)[];
export const BACK_KEYS = Object.keys(backRegistry) as (keyof typeof backRegistry)[];
export const NECK_KEYS = Object.keys(neckRegistry) as (keyof typeof neckRegistry)[];
export const FACE_GEAR_KEYS = Object.keys(faceGearRegistry) as (keyof typeof faceGearRegistry)[];

/** `PERSONALITIES` est un objet du kit : la liste se dérive, comme les registres. */
export const PERSONALITY_KEYS = Object.keys(PERSONALITIES) as Personality[];

/**
 * En revanche `BodyType`, `EyeShape` et `MouthShape` ne sont *que* des types :
 * rien ne les énumère à l'exécution (`BODY_DIMS` et `EYE_SCALES` sont privés à
 * `ToonHumanoid.tsx`). Ce sont les seules listes que le studio doit énoncer
 * lui-même — voir RAPPORT.md.
 *
 * Le passage par `Record<Union, true>` n'est pas décoratif : il *exige* une clé
 * par membre de l'union. Si le kit ajoute une variante, `npm run typecheck`
 * échoue ici tant qu'elle n'est pas ajoutée, au lieu de la laisser manquer
 * silencieusement dans le menu déroulant.
 */
const keysOf = <T extends string>(map: Record<T, true>) => Object.keys(map) as T[];

export const BODY_TYPES = keysOf<BodyType>({ slim: true, round: true, stocky: true, tall: true });
export const EYE_SHAPES = keysOf<EyeShape>({ round: true, oval: true, wide: true, sleepy: true });
export const MOUTH_SHAPES = keysOf<MouthShape>({ smile: true, grin: true, neutral: true, o: true });

/** Bornes des curseurs (PRD §4.2). */
export const RANGES = {
  headScale: { min: 0.6, max: 1.6, step: 0.05 },
  limbThickness: { min: 0.6, max: 1.6, step: 0.05 },
  scale: { min: 0.5, max: 1.5, step: 0.05 },
} as const;

/** Normalise un hex pour la comparaison (les sélecteurs renvoient déjà du bas de casse). */
export const normHex = (c: string) => c.trim().toLowerCase();

/** Arrondi des valeurs de curseur, pour éviter `1.0500000000000003` dans le JSON. */
export const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Ordre canonique des champs, celui de l'exemple commenté de `defs.ts` du jeu.
 * Les `def` exportés se relisent ainsi exactement comme ceux déjà en jeu.
 */
type DefKey = keyof CharacterDef;
export const FIELD_ORDER: DefKey[] = [
  'id', 'seed',
  'bodyType', 'headScale', 'limbThickness', 'scale',
  'primary', 'secondary', 'accent', 'skin', 'glow',
  'headwear', 'back', 'neck', 'faceGear',
  'eyeShape', 'mouth', 'brows',
  'personality',
];

/**
 * Ne conserve que les champs qui diffèrent du défaut du kit (PRD §4.4), dans
 * l'ordre canonique. `id`, `seed` et `primary` sont toujours présents : ils
 * sont requis et n'ont pas de défaut.
 */
export function minimalDef(def: CharacterDef): CharacterDef {
  const r = resolveDef(def);

  // L'ordre des clés d'un objet JS est celui de l'insertion, et c'est lui
  // qu'on retrouve dans le JSON : on insère donc dans l'ordre canonique.
  const ordered = { id: r.id, seed: r.seed } as CharacterDef;
  const put = <K extends DefKey>(k: K, v: CharacterDef[K]) => { ordered[k] = v; };

  if (r.bodyType !== DEFAULTS.bodyType) put('bodyType', r.bodyType);
  if (r.headScale !== DEFAULTS.headScale) put('headScale', round2(r.headScale));
  if (r.limbThickness !== DEFAULTS.limbThickness) put('limbThickness', round2(r.limbThickness));
  if (r.scale !== DEFAULTS.scale) put('scale', round2(r.scale));

  put('primary', normHex(r.palette.primary));
  if (normHex(r.palette.secondary) !== normHex(DEFAULTS.secondary)) put('secondary', normHex(r.palette.secondary));
  if (normHex(r.palette.accent) !== normHex(DEFAULTS.accent)) put('accent', normHex(r.palette.accent));
  if (normHex(r.palette.skin) !== normHex(DEFAULTS.skin)) put('skin', normHex(r.palette.skin));
  if (normHex(r.palette.glow) !== normHex(DEFAULTS.glow)) put('glow', normHex(r.palette.glow));

  if (r.headwear !== DEFAULTS.headwear) put('headwear', r.headwear);
  if (r.back !== DEFAULTS.back) put('back', r.back);
  if (r.neck !== DEFAULTS.neck) put('neck', r.neck);
  if (r.faceGear !== DEFAULTS.faceGear) put('faceGear', r.faceGear);

  if (r.eyeShape !== DEFAULTS.eyeShape) put('eyeShape', r.eyeShape);
  if (r.mouth !== DEFAULTS.mouth) put('mouth', r.mouth);
  if (r.brows !== DEFAULTS.brows) put('brows', r.brows);

  if (r.personality !== DEFAULTS.personality) put('personality', r.personality);

  return ordered;
}

/**
 * Un `CharacterDef` complet, à plat — la forme que consomment les contrôles.
 * Dérivé de `ResolvedCharacterDef` : aucun type n'est réécrit, et les champs
 * d'accessoires valent `Clé | null` (jamais `undefined`), ce qui laisse les
 * menus déroulants travailler sur deux états seulement.
 */
export type FullDef = Omit<ResolvedCharacterDef, 'palette'> & Palette;

/** Développe un `def` partiel en un objet plat, en passant par `resolveDef`. */
export function toFullDef(def: CharacterDef): FullDef {
  const r = resolveDef(def);
  return {
    id: r.id,
    seed: r.seed,
    primary: r.palette.primary,
    secondary: r.palette.secondary,
    accent: r.palette.accent,
    skin: r.palette.skin,
    glow: r.palette.glow,
    bodyType: r.bodyType,
    headScale: r.headScale,
    limbThickness: r.limbThickness,
    scale: r.scale,
    headwear: r.headwear,
    back: r.back,
    neck: r.neck,
    faceGear: r.faceGear,
    eyeShape: r.eyeShape,
    mouth: r.mouth,
    brows: r.brows,
    personality: r.personality,
  };
}

/**
 * Signature des champs qui changent la *silhouette*. Sert à savoir quand
 * remesurer l'assise au sol : la couleur ou l'humeur ne déplacent pas les pieds.
 */
export function shapeSignature(def: CharacterDef): string {
  const r = resolveDef(def);
  return [
    r.bodyType, r.scale, r.headScale, r.limbThickness,
    r.headwear, r.back, r.neck, r.faceGear, r.seed,
  ].join('|');
}

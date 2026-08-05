import * as THREE from 'three';

// ---- Registry keys (implementations live in parts/) ----
export type HeadwearKey =
  | 'mushroom'
  | 'beanie'
  | 'antennaDome'
  | 'visorHelmet'
  | 'hood'
  | 'coneHat'
  | 'leafCrown'
  | 'hair'
  | 'hornHelmet';
export type BackKey = 'satchel' | 'wings' | 'jetpack' | 'cape' | 'shell';
export type NeckKey = 'scarf' | 'turtleneck' | 'glowNecklace';
export type FaceGearKey = 'roundGlasses' | 'tintedVisor' | 'mask';

export type BodyType = 'slim' | 'round' | 'stocky' | 'tall';
export type EyeShape = 'round' | 'oval' | 'wide' | 'sleepy';
export type MouthShape = 'smile' | 'grin' | 'neutral' | 'o';
export type Personality = 'bouncy' | 'calm' | 'heavy' | 'nervous';

export type Palette = {
  primary: string;
  secondary: string;
  accent: string;
  skin: string;
};

/** Props received by every registered part (hat, backpack, scarf...). */
export type PartProps = {
  palette: Palette;
  gradientMap: THREE.Texture;
  seed: number;
};

/**
 * A character is pure data. Only `id`, `seed` and `primary` are mandatory —
 * everything else has a sensible default (see resolveCharacter).
 */
export interface CharacterDef {
  // Identity
  id: string;
  seed: number;
  // Proportions
  bodyType?: BodyType;
  headScale?: number;
  limbThickness?: number;
  scale?: number;
  // Palette
  primary: string;
  secondary?: string;
  accent?: string;
  skin?: string;
  // Silhouette (registry keys, or null for none)
  headwear?: HeadwearKey | null;
  back?: BackKey | null;
  neck?: NeckKey | null;
  faceGear?: FaceGearKey | null;
  // Face
  eyeShape?: EyeShape;
  mouth?: MouthShape;
  brows?: boolean;
  // Animation
  personality?: Personality;
  /** animation phase offset in seconds; defaults to a seed-derived value (0 = legacy hero timing) */
  phase?: number;
}

export type ResolvedCharacter = Required<CharacterDef>;

export function resolveCharacter(def: CharacterDef): ResolvedCharacter {
  return {
    bodyType: 'round',
    headScale: 1,
    limbThickness: 1,
    scale: 1,
    secondary: '#f0f0f0',
    accent: '#ffd24c',
    skin: '#ffd9b3',
    headwear: null,
    back: null,
    neck: null,
    faceGear: null,
    eyeShape: 'round',
    mouth: 'smile',
    brows: false,
    personality: 'bouncy',
    phase: (def.seed % 97) * 0.37,
    ...def,
  };
}

export function paletteOf(r: ResolvedCharacter): Palette {
  return { primary: r.primary, secondary: r.secondary, accent: r.accent, skin: r.skin };
}

// ---- Body proportions per bodyType ----
// 'round' reproduces the historical hero body exactly (capsule 0.22/0.30,
// arms at ±0.28, arm capsule 0.07/0.22, legs ±0.12 capsule 0.08/0.16,
// head at y=0.35 radius 0.34) so the hero looks identical after migration.
export type BodyProportions = {
  bodyR: number;
  bodyL: number;
  armX: number;
  armR: number;
  armL: number;
  legX: number;
  legR: number;
  legL: number;
  headY: number;
  headR: number;
};

export const BODY_TYPES: Record<BodyType, BodyProportions> = {
  round: { bodyR: 0.22, bodyL: 0.30, armX: 0.28, armR: 0.07, armL: 0.22, legX: 0.12, legR: 0.08, legL: 0.16, headY: 0.35, headR: 0.34 },
  slim: { bodyR: 0.16, bodyL: 0.36, armX: 0.22, armR: 0.05, armL: 0.26, legX: 0.10, legR: 0.06, legL: 0.22, headY: 0.38, headR: 0.30 },
  stocky: { bodyR: 0.28, bodyL: 0.18, armX: 0.34, armR: 0.09, armL: 0.18, legX: 0.15, legR: 0.10, legL: 0.10, headY: 0.32, headR: 0.36 },
  tall: { bodyR: 0.18, bodyL: 0.50, armX: 0.24, armR: 0.06, armL: 0.32, legX: 0.11, legR: 0.07, legL: 0.26, headY: 0.47, headR: 0.29 },
};

// ---- Animation parameters per personality ----
// 'bouncy' is exactly the historical hero animation constants.
export type AnimParams = {
  cycleSpeed: number;
  bounceAmp: number;
  squashX: number;
  squashY: number;
  armAmp: number;
  headTilt: number;
  headBob: number;
  idleSpeed: number;
  idleAmp: number;
  idleArmAmp: number;
  blinkPeriod: number;
};

export const PERSONALITIES: Record<Personality, AnimParams> = {
  bouncy: { cycleSpeed: 15, bounceAmp: 0.15, squashX: 0.1, squashY: 0.2, armAmp: 0.8, headTilt: 0.1, headBob: 0.05, idleSpeed: 2, idleAmp: 0.03, idleArmAmp: 0.05, blinkPeriod: 3 },
  calm: { cycleSpeed: 11, bounceAmp: 0.09, squashX: 0.06, squashY: 0.12, armAmp: 0.55, headTilt: 0.06, headBob: 0.03, idleSpeed: 1.4, idleAmp: 0.02, idleArmAmp: 0.03, blinkPeriod: 4.2 },
  heavy: { cycleSpeed: 9, bounceAmp: 0.06, squashX: 0.05, squashY: 0.08, armAmp: 0.45, headTilt: 0.05, headBob: 0.02, idleSpeed: 1.1, idleAmp: 0.015, idleArmAmp: 0.02, blinkPeriod: 4.8 },
  nervous: { cycleSpeed: 19, bounceAmp: 0.12, squashX: 0.08, squashY: 0.16, armAmp: 0.95, headTilt: 0.13, headBob: 0.07, idleSpeed: 3.4, idleAmp: 0.045, idleArmAmp: 0.08, blinkPeriod: 1.6 },
};

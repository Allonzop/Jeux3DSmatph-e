import type * as THREE from 'three';

// ---------- Registry keys (silhouette) ----------
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

export type BackKey = 'backpack' | 'wings' | 'jetpack' | 'cape' | 'shell';

export type NeckKey = 'scarf' | 'turtleneck' | 'glowNecklace';

export type FaceGearKey = 'roundGlasses' | 'tintedVisor' | 'mask';

// ---------- Enums ----------
export type BodyType = 'slim' | 'round' | 'stocky' | 'tall';
export type EyeShape = 'round' | 'oval' | 'wide' | 'sleepy';
export type MouthShape = 'smile' | 'grin' | 'neutral' | 'o';
export type Personality = 'bouncy' | 'calm' | 'heavy' | 'nervous';

// ---------- Palette ----------
export interface Palette {
  primary: string;   // body / limbs
  secondary: string; // clothing accents (hood, beanie, collar, hair…)
  accent: string;    // accessories (backpack, hat, scarf…)
  skin: string;      // head / face
  glow: string;      // emissive bits (antenna bulb, necklace…)
}

// ---------- Character definition (data-only) ----------
// Everything except id/seed/primary is optional with sensible defaults:
// `{ id, seed, primary }` already renders a correct character.
export interface CharacterDef {
  // Identity
  id: string;
  seed: number;

  // Palette
  primary: string;
  secondary?: string;
  accent?: string;
  skin?: string;
  glow?: string;

  // Proportions
  bodyType?: BodyType;
  headScale?: number;      // multiplier on the head group (default 1)
  limbThickness?: number;  // multiplier on arm/leg radii (default 1)
  scale?: number;          // whole-character scale (default 1)

  // Silhouette — registry keys (or null/omitted for none)
  headwear?: HeadwearKey | null;
  back?: BackKey | null;
  neck?: NeckKey | null;
  faceGear?: FaceGearKey | null;

  // Face
  eyeShape?: EyeShape;
  mouth?: MouthShape;
  brows?: boolean;

  // Animation flavour
  personality?: Personality;
}

export interface ResolvedCharacterDef {
  id: string;
  seed: number;
  palette: Palette;
  bodyType: BodyType;
  headScale: number;
  limbThickness: number;
  scale: number;
  headwear: HeadwearKey | null;
  back: BackKey | null;
  neck: NeckKey | null;
  faceGear: FaceGearKey | null;
  eyeShape: EyeShape;
  mouth: MouthShape;
  brows: boolean;
  personality: Personality;
}

export function resolveDef(def: CharacterDef): ResolvedCharacterDef {
  return {
    id: def.id,
    seed: def.seed,
    palette: {
      primary: def.primary,
      secondary: def.secondary ?? '#f0f0f0',
      accent: def.accent ?? '#e63946',
      skin: def.skin ?? '#ffd9b3',
      glow: def.glow ?? '#ffd24c',
    },
    bodyType: def.bodyType ?? 'round',
    headScale: def.headScale ?? 1,
    limbThickness: def.limbThickness ?? 1,
    scale: def.scale ?? 1,
    headwear: def.headwear ?? null,
    back: def.back ?? null,
    neck: def.neck ?? null,
    faceGear: def.faceGear ?? null,
    eyeShape: def.eyeShape ?? 'round',
    mouth: def.mouth ?? 'smile',
    brows: def.brows ?? false,
    personality: def.personality ?? 'bouncy',
  };
}

// ---------- Part contract ----------
// Every registered part receives the character palette, the shared toon
// gradient and the character seed (for deterministic micro-variation).
export interface PartProps {
  palette: Palette;
  gradientMap: THREE.Texture;
  seed: number;
}

// ---------- Animation personalities ----------
// 'bouncy' is the exact original Hero maths (walk cycle sin/cos(t*15),
// bounce 0.15, arm swing 0.8, head tilt 0.1…) — the hero must not change.
export interface PersonalityParams {
  walkFreq: number;      // walk cycle frequency
  bounceAmp: number;     // vertical bounce amplitude
  squash: number;        // squash/stretch multiplier (1 = original)
  armAmp: number;        // arm/leg swing amplitude
  headTilt: number;      // forward head tilt while walking
  headBob: number;       // side-to-side head bob amplitude
  idleFreq: number;      // idle breathing frequency
  idleAmp: number;       // idle bounce amplitude
  blinkInterval: number; // seconds between blinks
}

export const PERSONALITIES: Record<Personality, PersonalityParams> = {
  bouncy: { walkFreq: 15, bounceAmp: 0.15, squash: 1, armAmp: 0.8, headTilt: 0.1, headBob: 0.05, idleFreq: 2, idleAmp: 0.03, blinkInterval: 3 },
  calm: { walkFreq: 11, bounceAmp: 0.09, squash: 0.6, armAmp: 0.55, headTilt: 0.06, headBob: 0.03, idleFreq: 1.4, idleAmp: 0.02, blinkInterval: 4.2 },
  heavy: { walkFreq: 9, bounceAmp: 0.07, squash: 1.4, armAmp: 0.45, headTilt: 0.14, headBob: 0.02, idleFreq: 1, idleAmp: 0.015, blinkInterval: 5 },
  nervous: { walkFreq: 19, bounceAmp: 0.12, squash: 0.8, armAmp: 1, headTilt: 0.08, headBob: 0.08, idleFreq: 4, idleAmp: 0.05, blinkInterval: 1.6 },
};

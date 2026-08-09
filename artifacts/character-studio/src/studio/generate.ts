import { mulberry32 } from '@game/characters/rng';
import type {
  BackKey, CharacterDef, FaceGearKey, HeadwearKey, NeckKey, Personality,
} from '@game/characters/types';
import {
  BACK_KEYS, BODY_TYPES, EYE_SHAPES, FACE_GEAR_KEYS, HEADWEAR_KEYS,
  MOUTH_SHAPES, NECK_KEYS, PERSONALITY_KEYS, RANGES, round2,
} from './defaults';
import { EMISSIVE_INTENSITY, luminance } from './analysis';
import { POST } from './three/constants';

// --------------------------------------------------------------------------
// Couleur
// --------------------------------------------------------------------------

/** HSL (h en degrés, s/l en 0..1) vers `#rrggbb`. */
function hsl(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(hue / 60) % 6;
  const rgb: [number, number, number] =
    seg === 0 ? [c, x, 0]
      : seg === 1 ? [x, c, 0]
        : seg === 2 ? [0, c, x]
          : seg === 3 ? [0, x, c]
            : seg === 4 ? [x, 0, c]
              : [c, 0, x];
  const hex = rgb
    .map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0'))
    .join('');
  return `#${hex}`;
}

/**
 * Schémas d'harmonie classiques : les cinq couleurs d'une palette sont toutes
 * dérivées d'une même teinte de base, jamais tirées indépendamment. C'est ce
 * qui évite les « cinq couleurs criardes sans rapport » du PRD §4.2.
 */
const HARMONIES = {
  analogous: [0, 28, -28],
  complementary: [0, 180, 150],
  triadic: [0, 120, 240],
  splitComplementary: [0, 160, 200],
} as const;

type HarmonyName = keyof typeof HARMONIES;
const HARMONY_NAMES = Object.keys(HARMONIES) as HarmonyName[];

/** Teintes de peau plausibles, pour les archétypes « humains ». */
const SKIN_TONES = ['#ffd9b3', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffe0bd'];

// --------------------------------------------------------------------------
// Archétypes
// --------------------------------------------------------------------------

interface Archetype {
  /** Cle ascii — sert aussi de valeur a `--archetype` en ligne de commande. */
  key: string;
  /** Plage de teinte de base, en degrés. */
  hue: [number, number];
  saturation: [number, number];
  /** Préférences d'accessoires — filtrées contre les registres réels. */
  headwear: HeadwearKey[];
  back: BackKey[];
  neck: NeckKey[];
  faceGear: FaceGearKey[];
  personalities: Personality[];
  /** Peau naturelle, ou teintée comme le corps (créatures). */
  creatureSkin: boolean;
  bodyTypeBias?: typeof BODY_TYPES;
}

const ARCHETYPES: Archetype[] = [
  {
    key: 'foret',
    hue: [70, 160],
    saturation: [0.35, 0.6],
    headwear: ['mushroom', 'leafCrown', 'hood', 'coneHat'],
    back: ['shell', 'cape', 'backpack'],
    neck: ['scarf'],
    faceGear: [],
    personalities: ['calm', 'heavy', 'bouncy'],
    creatureSkin: false,
  },
  {
    key: 'technique',
    hue: [180, 260],
    saturation: [0.55, 0.85],
    headwear: ['visorHelmet', 'antennaDome', 'beanie'],
    back: ['jetpack', 'backpack'],
    neck: ['turtleneck', 'glowNecklace'],
    faceGear: ['tintedVisor', 'roundGlasses', 'mask'],
    personalities: ['nervous', 'calm', 'bouncy'],
    creatureSkin: false,
    bodyTypeBias: ['slim', 'tall', 'round', 'stocky'],
  },
  {
    key: 'village',
    hue: [20, 60],
    saturation: [0.4, 0.7],
    headwear: ['beanie', 'hair', 'hood', 'coneHat'],
    back: ['backpack', 'cape'],
    neck: ['scarf', 'turtleneck'],
    faceGear: ['roundGlasses'],
    personalities: ['bouncy', 'calm'],
    creatureSkin: false,
  },
  {
    key: 'creature',
    hue: [280, 400],
    saturation: [0.6, 0.9],
    headwear: ['hornHelmet', 'hair', 'leafCrown'],
    back: ['wings', 'shell'],
    neck: ['glowNecklace'],
    faceGear: ['mask'],
    personalities: ['nervous', 'heavy'],
    creatureSkin: true,
    bodyTypeBias: ['stocky', 'round', 'slim', 'tall'],
  },
  {
    key: 'noble',
    hue: [230, 320],
    saturation: [0.45, 0.75],
    headwear: ['coneHat', 'hair', 'hornHelmet', 'leafCrown'],
    back: ['cape', 'wings'],
    neck: ['scarf', 'glowNecklace'],
    faceGear: ['roundGlasses'],
    personalities: ['calm', 'heavy'],
    creatureSkin: false,
    bodyTypeBias: ['tall', 'slim', 'round', 'stocky'],
  },
];

// --------------------------------------------------------------------------
// Générateur
// --------------------------------------------------------------------------

type Rnd = () => number;

const pick = <T,>(rnd: Rnd, list: readonly T[]): T => list[Math.floor(rnd() * list.length)];
const between = (rnd: Rnd, min: number, max: number) => min + rnd() * (max - min);

/** Aligne une valeur sur le pas du curseur, pour que le contrôle la reflète exactement. */
const snap = (v: number, { min, max, step }: { min: number; max: number; step: number }) =>
  round2(Math.min(max, Math.max(min, Math.round(v / step) * step)));

/**
 * Filtre les préférences d'un archétype contre le registre réel, et bascule sur
 * le registre entier si l'intersection est vide. Un accessoire ajouté au kit
 * reste ainsi atteignable, et un accessoire retiré ne casse rien.
 */
function poolFor<T extends string>(preferred: readonly T[], registry: readonly T[]): readonly T[] {
  const filtered = preferred.filter((k) => (registry as readonly string[]).includes(k));
  return filtered.length > 0 ? filtered : registry;
}

/**
 * Tire un accessoire, ou `null`. `chance` est la probabilité d'en porter un.
 * Une chance sur six d'ignorer l'archétype et de piocher dans tout le registre :
 * c'est de là que viennent les silhouettes « auxquelles on n'aurait pas pensé ».
 */
function maybePart<T extends string>(
  rnd: Rnd, preferred: readonly T[], registry: readonly T[], chance: number,
): T | null {
  if (rnd() > chance) return null;
  if (registry.length === 0) return null;
  const pool = rnd() < 1 / 6 ? registry : poolFor(preferred, registry);
  return pick(rnd, pool);
}

/** Les archetypes disponibles, dans l'ordre. */
export const ARCHETYPE_NAMES = ARCHETYPES.map((a) => a.key);

export interface SurpriseOptions {
  seed: number;
  id: string;
  /** Force un archetype au lieu d'en tirer un. Ignore s'il est inconnu. */
  archetype?: string;
}

/**
 * Choisit un `glow` qui déclenchera vraiment le bloom du jeu.
 *
 * La clarté HSL ne suffit pas : la luminance perçue dépend surtout de la
 * teinte — le vert pèse 0,72 dans la formule, le bleu seulement 0,07. Un bleu
 * à clarté 0,65 reste donc bien trop sombre pour passer le seuil, et son halo
 * ne s'allume jamais. On éclaircit tant que la luminance émise estimée
 * (`luminance × EMISSIVE_INTENSITY`) n'atteint pas le seuil du jeu.
 *
 * Défaut trouvé par `studio audit` sur les sorties du générateur lui-même.
 */
function bloomingGlow(hue: number, sat: number, startL: number): string {
  let l = startL;
  for (let i = 0; i < 12; i += 1) {
    const hex = hsl(hue, sat, l);
    if (luminance(hex) * EMISSIVE_INTENSITY >= POST.bloom.luminanceThreshold) return hex;
    l += 0.04;
    if (l > 0.92) break;
  }
  return hsl(hue, sat, 0.92);
}

/**
 * Génère un personnage aléatoire mais cohérent (PRD §4.2).
 * Entièrement déterministe : même `seed`, même personnage — on peut donc
 * retomber sur une génération en notant son seed.
 */
export function surpriseDef({ seed, id, archetype: forced }: SurpriseOptions): CharacterDef {
  const rnd = mulberry32(seed);
  // Le tirage est consomme meme quand l'archetype est impose, pour que le
  // reste de la sequence aleatoire ne depende pas de ce choix.
  const drawn = pick(rnd, ARCHETYPES);
  const archetype = forced ? ARCHETYPES.find((a) => a.key === forced) ?? drawn : drawn;

  // --- Palette harmonisée ---
  const harmony = HARMONIES[pick(rnd, HARMONY_NAMES)];
  const baseHue = between(rnd, archetype.hue[0], archetype.hue[1]);
  const baseSat = between(rnd, archetype.saturation[0], archetype.saturation[1]);

  const primary = hsl(baseHue + harmony[0], baseSat, between(rnd, 0.45, 0.62));
  // Le secondaire reste proche mais désaturé : c'est le vêtement, il ne doit
  // pas concurrencer le corps.
  const secondary = hsl(baseHue + harmony[1], baseSat * between(rnd, 0.35, 0.7), between(rnd, 0.6, 0.82));
  const accent = hsl(baseHue + harmony[2], Math.min(0.95, baseSat * 1.2), between(rnd, 0.42, 0.58));
  // Le glow est toujours clair et saturé, sinon l'émissif ne se lit pas.
  const glow = bloomingGlow(
    baseHue + harmony[2] + between(rnd, -20, 20),
    between(rnd, 0.75, 1),
    between(rnd, 0.6, 0.7),
  );
  const skin = archetype.creatureSkin
    ? hsl(baseHue + harmony[0], baseSat * 0.9, between(rnd, 0.5, 0.65))
    : pick(rnd, SKIN_TONES);

  // --- Silhouette ---
  const bodyType = pick(rnd, archetype.bodyTypeBias ?? BODY_TYPES);
  const headwear = maybePart(rnd, archetype.headwear, HEADWEAR_KEYS, 0.85);
  const back = maybePart(rnd, archetype.back, BACK_KEYS, 0.55);
  const neck = maybePart(rnd, archetype.neck, NECK_KEYS, 0.4);
  // Une pièce de visage sous un casque à visière se voit à peine : on l'évite.
  const faceGear = headwear === 'visorHelmet'
    ? null
    : maybePart(rnd, archetype.faceGear, FACE_GEAR_KEYS, 0.35);

  return {
    id,
    seed,
    bodyType,
    headScale: snap(between(rnd, 0.85, 1.3), RANGES.headScale),
    limbThickness: snap(between(rnd, 0.75, 1.3), RANGES.limbThickness),
    scale: snap(between(rnd, 0.68, 1.0), RANGES.scale),
    primary,
    secondary,
    accent,
    skin,
    glow,
    headwear,
    back,
    neck,
    faceGear,
    eyeShape: pick(rnd, EYE_SHAPES),
    mouth: pick(rnd, MOUTH_SHAPES),
    brows: rnd() < 0.4,
    personality: rnd() < 0.75
      ? pick(rnd, poolFor(archetype.personalities, PERSONALITY_KEYS))
      : pick(rnd, PERSONALITY_KEYS),
  };
}

/** Un personnage neuf, sobre : un point de départ, pas une surprise. */
export function blankDef(id: string, seed: number): CharacterDef {
  return { id, seed, primary: '#57cc99' };
}

/** Nouveau seed aléatoire — appelé depuis un gestionnaire d'événement, jamais en rendu. */
export const randomSeed = () => Math.floor(Math.random() * 100000);

import { resolveDef } from '../kit/types';
import type { CharacterDef } from '../kit/types';
import {
  BACK_KEYS, BODY_TYPES, FACE_GEAR_KEYS, HEADWEAR_KEYS, NECK_KEYS,
  PERSONALITY_KEYS, RANGES,
} from './defaults';
import { LIGHTING, POST } from './three/constants';

/**
 * Analyse d'une bibliothèque, sans rien afficher.
 *
 * L'interface répond visuellement à « ces personnages se ressemblent-ils ? » :
 * on met trente vignettes côte à côte et l'œil tranche. Un agent n'a pas cet
 * œil. Ce module reformule les mêmes questions en nombres — quasi-doublons,
 * pièces jamais utilisées, palettes qui ne tiendront pas au rendu — pour qu'il
 * puisse décider quoi produire ensuite.
 */

// --------------------------------------------------------------------------
// Couleur
// --------------------------------------------------------------------------

type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

/** Luminance relative WCAG, sur des composantes linéarisées. */
export function luminance(hex: string): number {
  const lin = hexToRgb(hex).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/**
 * Distance perceptuelle approchée entre deux couleurs, normalisée sur 0..1
 * (formule « redmean » — bien plus proche de l'œil qu'une distance RGB brute,
 * et sans le coût d'une conversion Lab complète).
 */
export function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const rMean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const d = Math.sqrt((2 + rMean) * dr * dr + 4 * dg * dg + (3 - rMean) * db * db);
  return Math.min(1, d / 3);
}

/** Rapport de contraste WCAG, de 1 (identiques) à 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// --------------------------------------------------------------------------
// Distance entre personnages
// --------------------------------------------------------------------------

/**
 * Poids des familles de champs dans la distance. La silhouette domine : deux
 * personnages de morphologie et d'accessoires identiques restent « le même
 * modèle recoloré » même avec des palettes opposées — c'est exactement ce que
 * le PRD §4.1 demande de faire sauter aux yeux.
 */
const WEIGHTS = { silhouette: 0.45, proportions: 0.15, palette: 0.25, face: 0.1, personality: 0.05 };

export interface DistanceBreakdown {
  total: number;
  silhouette: number;
  proportions: number;
  palette: number;
  face: number;
  personality: number;
}

/** 0 = indiscernables, 1 = aussi différents que le kit le permet. */
export function defDistance(a: CharacterDef, b: CharacterDef): DistanceBreakdown {
  const x = resolveDef(a);
  const y = resolveDef(b);
  const diff = (p: boolean) => (p ? 1 : 0);

  const silhouette = (
    diff(x.bodyType !== y.bodyType) * 0.4
    + diff(x.headwear !== y.headwear) * 0.25
    + diff(x.back !== y.back) * 0.15
    + diff(x.neck !== y.neck) * 0.1
    + diff(x.faceGear !== y.faceGear) * 0.1
  );

  // Normalisé par l'amplitude autorisée du curseur : deux personnages aux
  // extrêmes d'un réglage comptent pour une différence pleine.
  const span = (k: keyof typeof RANGES) => RANGES[k].max - RANGES[k].min;
  const proportions = Math.min(1, (
    Math.abs(x.scale - y.scale) / span('scale')
    + Math.abs(x.headScale - y.headScale) / span('headScale')
    + Math.abs(x.limbThickness - y.limbThickness) / span('limbThickness')
  ) / 3);

  const palette = (
    colorDistance(x.palette.primary, y.palette.primary) * 0.45
    + colorDistance(x.palette.secondary, y.palette.secondary) * 0.2
    + colorDistance(x.palette.accent, y.palette.accent) * 0.2
    + colorDistance(x.palette.skin, y.palette.skin) * 0.1
    + colorDistance(x.palette.glow, y.palette.glow) * 0.05
  );

  const face = (
    diff(x.eyeShape !== y.eyeShape) * 0.45
    + diff(x.mouth !== y.mouth) * 0.4
    + diff(x.brows !== y.brows) * 0.15
  );

  const personality = diff(x.personality !== y.personality);

  const total = (
    silhouette * WEIGHTS.silhouette
    + proportions * WEIGHTS.proportions
    + palette * WEIGHTS.palette
    + face * WEIGHTS.face
    + personality * WEIGHTS.personality
  );

  return { total, silhouette, proportions, palette, face, personality };
}

export interface NearDuplicate {
  a: string;
  b: string;
  distance: number;
  breakdown: DistanceBreakdown;
}

/** Toutes les paires plus proches que `threshold`, les plus semblables d'abord. */
export function findNearDuplicates(defs: CharacterDef[], threshold = 0.22): NearDuplicate[] {
  const out: NearDuplicate[] = [];
  for (let i = 0; i < defs.length; i += 1) {
    for (let j = i + 1; j < defs.length; j += 1) {
      const breakdown = defDistance(defs[i], defs[j]);
      if (breakdown.total <= threshold) {
        out.push({ a: defs[i].id, b: defs[j].id, distance: breakdown.total, breakdown });
      }
    }
  }
  return out.sort((p, q) => p.distance - q.distance);
}

// --------------------------------------------------------------------------
// Couverture des registres
// --------------------------------------------------------------------------

export interface Coverage {
  field: string;
  used: string[];
  unused: string[];
  /** Part des options du kit effectivement employées. */
  ratio: number;
}

/**
 * Ce que le kit propose contre ce que la bibliothèque emploie. Un accessoire
 * jamais utilisé est du contenu déjà payé qui ne sert à rien — c'est la piste
 * la plus rentable pour enrichir le casting.
 */
export function registryCoverage(defs: CharacterDef[]): Coverage[] {
  const resolved = defs.map(resolveDef);
  const build = (field: string, options: readonly string[], pick: (r: ReturnType<typeof resolveDef>) => string | null): Coverage => {
    const seen = new Set(resolved.map(pick).filter((v): v is string => v !== null));
    const used = options.filter((o) => seen.has(o));
    const unused = options.filter((o) => !seen.has(o));
    return { field, used, unused, ratio: options.length ? used.length / options.length : 1 };
  };

  return [
    build('bodyType', BODY_TYPES, (r) => r.bodyType),
    build('headwear', HEADWEAR_KEYS, (r) => r.headwear),
    build('back', BACK_KEYS, (r) => r.back),
    build('neck', NECK_KEYS, (r) => r.neck),
    build('faceGear', FACE_GEAR_KEYS, (r) => r.faceGear),
    build('personality', PERSONALITY_KEYS, (r) => r.personality),
  ];
}

// --------------------------------------------------------------------------
// Contrôles de palette
// --------------------------------------------------------------------------

export type IssueSeverity = 'erreur' | 'avertissement' | 'note';

export interface PaletteIssue {
  id: string;
  severity: IssueSeverity;
  code: string;
  message: string;
}

/**
 * `glowMat` du kit rend un `MeshStandardMaterial` dont `emissive` vaut la
 * couleur et `emissiveIntensity` vaut 2 ; le bloom du jeu ne s'allume qu'au
 * dessus d'une luminance de POST.bloom.luminanceThreshold.
 *
 * On approxime donc la luminance émise par `luminance(glow) × 2`. C'est une
 * estimation, pas une simulation du pipeline : la lumière de la scène s'y
 * ajoute, et le seuil s'applique après tonemapping. Elle suffit à repérer un
 * `glow` si sombre qu'il ne brillera visiblement pas — un piège invisible tant
 * qu'on ne regarde pas le rendu.
 */
export const EMISSIVE_INTENSITY = 2;

export function paletteIssues(def: CharacterDef): PaletteIssue[] {
  const r = resolveDef(def);
  const p = r.palette;
  const issues: PaletteIssue[] = [];
  const add = (severity: IssueSeverity, code: string, message: string) =>
    issues.push({ id: r.id, severity, code, message });

  const emitted = luminance(p.glow) * EMISSIVE_INTENSITY;
  if (emitted < POST.bloom.luminanceThreshold) {
    add('avertissement', 'glow-terne',
      `glow ${p.glow} : luminance émise estimée ${emitted.toFixed(2)}, sous le seuil de bloom `
      + `${POST.bloom.luminanceThreshold}. Les parties émissives risquent de ne pas briller. `
      + 'Éclaircir ou saturer la couleur.');
  }

  const onBackground = contrastRatio(p.primary, LIGHTING.background);
  if (onBackground < 1.6) {
    add('avertissement', 'corps-noyé',
      `primary ${p.primary} : contraste ${onBackground.toFixed(2)}:1 avec le fond du jeu `
      + `${LIGHTING.background}. La silhouette se détachera mal.`);
  }

  const pairs: [string, string, string, string, number][] = [
    ['primary', p.primary, 'secondary', p.secondary, 0.12],
    ['primary', p.primary, 'accent', p.accent, 0.12],
    ['primary', p.primary, 'skin', p.skin, 0.1],
  ];
  for (const [n1, c1, n2, c2, min] of pairs) {
    const d = colorDistance(c1, c2);
    if (d < min) {
      add('note', 'couleurs-proches',
        `${n1} ${c1} et ${n2} ${c2} sont quasi identiques (distance ${d.toFixed(3)}). `
        + `Le rôle « ${n2} » sera invisible.`);
    }
  }

  return issues;
}

// --------------------------------------------------------------------------
// Rapport complet
// --------------------------------------------------------------------------

export interface AuditReport {
  count: number;
  /** Distance moyenne entre toutes les paires — la « variété » d'ensemble. */
  averageDistance: number;
  nearDuplicates: NearDuplicate[];
  coverage: Coverage[];
  issues: PaletteIssue[];
  duplicateIds: string[];
}

export function auditDefs(defs: CharacterDef[], threshold = 0.22): AuditReport {
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < defs.length; i += 1) {
    for (let j = i + 1; j < defs.length; j += 1) {
      sum += defDistance(defs[i], defs[j]).total;
      pairs += 1;
    }
  }

  const seen = new Map<string, number>();
  for (const d of defs) seen.set(d.id, (seen.get(d.id) ?? 0) + 1);

  return {
    count: defs.length,
    averageDistance: pairs ? sum / pairs : 0,
    nearDuplicates: findNearDuplicates(defs, threshold),
    coverage: registryCoverage(defs),
    issues: defs.flatMap(paletteIssues),
    duplicateIds: [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id),
  };
}

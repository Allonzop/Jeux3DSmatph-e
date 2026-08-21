import * as THREE from 'three';

/**
 * Les retours visuels du combat : eclats de mort, chiffres de degats, secousse
 * de camera.
 *
 * **Rien ici ne passe par React ni par Zustand.** Un impact peut survenir
 * plusieurs fois par image et par monstre ; le faire remonter dans un magasin
 * re-rendrait tout l'arbre de la scene a chaque coup — exactement l'erreur
 * decrite dans `.agents/memory/r3f-game-perf.md`. Les effets vivent donc dans
 * des tableaux de module, pre-alloues une fois pour toutes, que deux
 * composants viennent lire dans leur boucle : `scene/CombatEffects.tsx` pour
 * la 3D, `ui/Popups.tsx` pour les chiffres.
 *
 * Aucune allocation apres le chargement : les pools sont fixes, un effet de
 * trop ecrase le plus ancien. Perdre un eclat quand il en part quarante d'un
 * coup ne se voit pas ; une pause du ramasse-miettes, si.
 */

// ---------------------------------------------------------------------------
// Eclats — la gerbe qui part d'un monstre qui tombe ou d'un obus qui explose
// ---------------------------------------------------------------------------

export type Burst = {
  active: boolean;
  pos: THREE.Vector3;
  color: THREE.Color;
  /** Temps ecoule, en secondes. */
  life: number;
  duration: number;
  /** Rayon atteint en fin de vie. */
  power: number;
};

const BURST_POOL = 14;
export const bursts: Burst[] = Array.from({ length: BURST_POOL }, () => ({
  active: false,
  pos: new THREE.Vector3(),
  color: new THREE.Color('#ffffff'),
  life: 0,
  duration: 0.55,
  power: 1,
}));

let burstCursor = 0;

export function spawnBurst(
  x: number,
  y: number,
  z: number,
  color: string,
  power = 1,
  duration = 0.55,
): void {
  const b = bursts[burstCursor];
  burstCursor = (burstCursor + 1) % BURST_POOL;
  b.active = true;
  b.pos.set(x, y, z);
  b.color.set(color);
  b.life = 0;
  b.duration = duration;
  b.power = power;
}

// ---------------------------------------------------------------------------
// Chiffres flottants — degats, ressources, experience
// ---------------------------------------------------------------------------

export type PopupKind = 'damage' | 'crit' | 'resource' | 'xp' | 'heal';

export type Popup = {
  active: boolean;
  world: THREE.Vector3;
  text: string;
  kind: PopupKind;
  life: number;
  duration: number;
  /** Decalage horizontal pour que deux chiffres simultanes ne se superposent pas. */
  jitter: number;
};

const POPUP_POOL = 26;
export const popups: Popup[] = Array.from({ length: POPUP_POOL }, () => ({
  active: false,
  world: new THREE.Vector3(),
  text: '',
  kind: 'damage' as PopupKind,
  life: 0,
  duration: 0.9,
  jitter: 0,
}));

let popupCursor = 0;
// Suite deterministe pour le decalage : `Math.random()` dans une boucle de
// rendu est proscrit par les conventions du projet.
let jitterSeed = 0;

export function spawnPopup(
  x: number,
  y: number,
  z: number,
  text: string,
  kind: PopupKind = 'damage',
  duration = 0.9,
): void {
  const p = popups[popupCursor];
  popupCursor = (popupCursor + 1) % POPUP_POOL;
  jitterSeed = (jitterSeed + 1) % 7;
  p.active = true;
  p.world.set(x, y, z);
  p.text = text;
  p.kind = kind;
  p.life = 0;
  p.duration = duration;
  p.jitter = (jitterSeed - 3) * 9;
}

// ---------------------------------------------------------------------------
// Secousse de camera
// ---------------------------------------------------------------------------

/** Amplitude courante, consommee et amortie par `scene/Camera.tsx`. */
export const shake = { amount: 0 };

/** Le maximum l'emporte : dix petits coups ne valent pas une explosion. */
export function addShake(amount: number): void {
  shake.amount = Math.max(shake.amount, Math.min(1.2, amount));
}

// ---------------------------------------------------------------------------
// Projection monde -> ecran
// ---------------------------------------------------------------------------

/**
 * Publiee par `scene/CombatEffects.tsx` (qui est dans le Canvas, donc a acces
 * a la camera) et consommee par `ui/Popups.tsx` (qui est dans le DOM, et n'y a
 * pas acces). Le seul pont entre les deux mondes.
 */
export const projection: {
  project: ((v: THREE.Vector3, out: { x: number; y: number }) => boolean) | null;
} = { project: null };

// ---------------------------------------------------------------------------
// Enchainement de mises a mort
// ---------------------------------------------------------------------------

/**
 * Le compteur d'enchainement. Il se lit dans le HUD, mais il est ecrit par la
 * boucle de combat : meme raison que le reste du fichier, il reste hors React.
 * `ui/ComboMeter.tsx` l'echantillonne a l'image.
 */
export const combo = { count: 0, until: 0, best: 0 };

/** Fenetre d'enchainement, en secondes. */
const COMBO_WINDOW = 3;

export function registerKill(now: number): number {
  if (now > combo.until) combo.count = 0;
  combo.count += 1;
  combo.until = now + COMBO_WINDOW;
  if (combo.count > combo.best) combo.best = combo.count;
  return combo.count;
}

export function comboAt(now: number): number {
  return now > combo.until ? 0 : combo.count;
}

/** Remet tout a zero — au demarrage d'une vague, ou apres un reset de partie. */
export function resetEffects(): void {
  for (const b of bursts) b.active = false;
  for (const p of popups) p.active = false;
  shake.amount = 0;
  combo.count = 0;
  combo.until = 0;
}

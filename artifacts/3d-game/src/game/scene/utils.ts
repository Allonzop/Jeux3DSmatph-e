import * as THREE from 'three';

// Single shared toon gradient texture for the whole app.
// Module-level singleton: every material reuses the same GPU texture,
// nothing to dispose per component instance.
let sharedGradient: THREE.DataTexture | null = null;

export function getToonGradient(): THREE.DataTexture {
  if (!sharedGradient) {
    const data = new Uint8Array([
      80, 80, 80, 255,
      140, 140, 140, 255,
      220, 220, 220, 255,
    ]);
    sharedGradient = new THREE.DataTexture(data, 3, 1);
    sharedGradient.format = THREE.RGBAFormat;
    sharedGradient.type = THREE.UnsignedByteType;
    sharedGradient.needsUpdate = true;
  }
  return sharedGradient;
}

/** @deprecated Utiliser getToonGradient() — ce n'est pas un hook React. */
export function useToonGradient() {
  return getToonGradient();
}

// Live enemy world positions, written imperatively by each EnemyNode every
// frame and read by turrets for targeting. Bypasses React/Zustand so enemy
// movement never triggers React re-renders.
export const enemyPositions = new Map<string, THREE.Vector3>();

/**
 * Etat de combat vivant de chaque monstre, meme principe que `enemyPositions` :
 * ecrit et lu plusieurs fois par image, donc hors de React et de Zustand.
 *
 * - `slow` / `slowUntil` : ralentissement pose par les cryo-diffuseurs. La
 *   tour ecrit une date d'expiration plutot que de retirer l'effet, comme ca
 *   une tour detruite ou un monstre sorti de la zone se debloquent tout seuls.
 * - `altitude` : les tours au sol ne visent pas ce qui vole.
 * - `intangible` : le Spectre, pendant sa phase de dematerialisation.
 */
export type EnemyCombatState = {
  slow: number;
  slowUntil: number;
  altitude: number;
  kind: string;
  intangible?: boolean;
};

export const enemyStates = new Map<string, EnemyCombatState>();

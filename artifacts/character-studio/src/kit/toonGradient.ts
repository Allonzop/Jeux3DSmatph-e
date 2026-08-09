/**
 * Singleton de texture dégradé toon — autonome, sans dépendance au reste
 * du repo. Même données que scene/utils.ts : trois niveaux d'ombre
 * (sombre / mi-teinte / lumière).
 *
 * N'importe pas enemyPositions ni aucune logique de gameplay.
 */
import * as THREE from 'three';

let sharedGradient: THREE.DataTexture | null = null;

export function getToonGradient(): THREE.DataTexture {
  if (!sharedGradient) {
    const data = new Uint8Array([
      80,  80,  80,  255,   // ombre
      140, 140, 140, 255,   // mi-teinte
      220, 220, 220, 255,   // lumière
    ]);
    sharedGradient = new THREE.DataTexture(data, 3, 1);
    sharedGradient.format = THREE.RGBAFormat;
    sharedGradient.type = THREE.UnsignedByteType;
    sharedGradient.needsUpdate = true;
  }
  return sharedGradient;
}

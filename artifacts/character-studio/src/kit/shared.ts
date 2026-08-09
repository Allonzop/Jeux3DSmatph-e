import * as THREE from 'three';
import { getToonGradient } from './toonGradient';

// ---------- Module-level shared geometry cache ----------
// Many humanoids share identical geometries (4 body types × a handful of
// parts). Cache them so 12 villagers/enemies don't create 12× the buffers.
const geomCache = new Map<string, THREE.BufferGeometry>();
export function sharedGeom<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geomCache.get(key);
  if (!g) {
    g = make();
    geomCache.set(key, g);
  }
  return g as T;
}

// ---------- Module-level shared material caches ----------
// The toon gradient map is a singleton, so a material is fully determined
// by its color — cache by color string and reuse across all characters.
const toonMatCache = new Map<string, THREE.MeshToonMaterial>();
export function toonMat(color: string): THREE.MeshToonMaterial {
  let m = toonMatCache.get(color);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: getToonGradient() });
    toonMatCache.set(color, m);
  }
  return m;
}

const basicMatCache = new Map<string, THREE.MeshBasicMaterial>();
export function basicMat(color: string): THREE.MeshBasicMaterial {
  let m = basicMatCache.get(color);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color });
    basicMatCache.set(color, m);
  }
  return m;
}

const glowMatCache = new Map<string, THREE.MeshStandardMaterial>();
export function glowMat(color: string): THREE.MeshStandardMaterial {
  let m = glowMatCache.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2 });
    glowMatCache.set(color, m);
  }
  return m;
}

// Transparent "glass" materials (helmet dome, tinted visor).
const glassMatCache = new Map<string, THREE.MeshStandardMaterial>();
export function glassMat(color: string, opacity: number): THREE.MeshStandardMaterial {
  const key = `${color}:${opacity}`;
  let m = glassMatCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.1 });
    glassMatCache.set(key, m);
  }
  return m;
}

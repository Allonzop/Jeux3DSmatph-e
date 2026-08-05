import * as THREE from 'three';

// Module-level geometry cache: with many character instances, identical
// geometries (same args) are created once and shared on the GPU.
const cache = new Map<string, THREE.BufferGeometry>();

function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = cache.get(key);
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g as T;
}

export const sphereGeo = (r: number, seg = 16) =>
  cached(`s:${r}:${seg}`, () => new THREE.SphereGeometry(r, seg, seg));

export const capsuleGeo = (r: number, l: number) =>
  cached(`c:${r}:${l}`, () => new THREE.CapsuleGeometry(r, l, 8, 16));

export const cylinderGeo = (rt: number, rb: number, h: number, seg = 12) =>
  cached(`cy:${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));

export const coneGeo = (r: number, h: number, seg = 12) =>
  cached(`co:${r}:${h}:${seg}`, () => new THREE.ConeGeometry(r, h, seg));

export const torusGeo = (r: number, t: number, arc = Math.PI * 2) =>
  cached(`t:${r}:${t}:${arc.toFixed(4)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));

export const boxGeo = (w: number, h: number, d: number) =>
  cached(`b:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));

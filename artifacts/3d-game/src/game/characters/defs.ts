import { CharacterDef } from './types';

// Characters are pure data: adding one = adding an object here.
// See ToonHumanoid.tsx for the rig; parts/index.ts for available keys.

/** The astronaut hero — must render identically to the pre-migration model. */
export const heroDef: CharacterDef = {
  id: 'hero',
  seed: 1,
  bodyType: 'round',
  primary: '#ff8c42', // suit
  secondary: '#4cc9f0', // backpack + hands
  accent: '#ffd24c', // antenna light
  skin: '#ffd9b3',
  headwear: 'visorHelmet',
  back: 'satchel',
  eyeShape: 'round',
  mouth: 'smile',
  personality: 'bouncy',
  phase: 0, // exact legacy hero animation timing
};

/** Wave enemies — nervous horned imps. */
export const enemyDef: CharacterDef = {
  id: 'enemy',
  seed: 666,
  bodyType: 'stocky',
  scale: 0.8,
  primary: '#ff4d6d',
  secondary: '#590d22',
  accent: '#ff8fa3',
  skin: '#ff4d6d',
  headwear: 'hornHelmet',
  back: 'wings',
  eyeShape: 'wide',
  mouth: 'grin',
  brows: true,
  personality: 'nervous',
};

/** 8 villagers with clearly distinct silhouettes (not just tints). */
export const villagerDefs: CharacterDef[] = [
  { id: 'v1', seed: 101, bodyType: 'round', scale: 0.75, primary: '#57cc99', secondary: '#ffffff', accent: '#e63946', skin: '#ffd9b3',
    headwear: 'mushroom', back: 'satchel', personality: 'bouncy' },
  { id: 'v2', seed: 202, bodyType: 'slim', scale: 0.72, primary: '#b388eb', secondary: '#3a86ff', accent: '#ffd24c', skin: '#ffe4c9',
    headwear: 'beanie', neck: 'scarf', personality: 'calm' },
  { id: 'v3', seed: 303, bodyType: 'round', scale: 0.8, primary: '#ffd24c', secondary: '#8338ec', accent: '#4cc9f0', skin: '#ffd9b3',
    headwear: 'antennaDome', faceGear: 'roundGlasses', eyeShape: 'oval', personality: 'nervous' },
  { id: 'v4', seed: 404, bodyType: 'stocky', scale: 0.78, primary: '#8a6343', secondary: '#57cc99', accent: '#f4a261', skin: '#e8b98a',
    headwear: 'leafCrown', back: 'shell', mouth: 'neutral', eyeShape: 'sleepy', personality: 'heavy' },
  { id: 'v5', seed: 505, bodyType: 'tall', scale: 0.75, primary: '#4cc9f0', secondary: '#f0f0f0', accent: '#ff70a6', skin: '#ffd9b3',
    headwear: 'coneHat', back: 'cape', mouth: 'o', personality: 'calm', headScale: 0.9 },
  { id: 'v6', seed: 606, bodyType: 'slim', scale: 0.7, primary: '#e07a5f', secondary: '#2b2d42', accent: '#ffd24c', skin: '#f5cba7',
    headwear: 'hair', faceGear: 'tintedVisor', back: 'jetpack', eyeShape: 'wide', personality: 'nervous', limbThickness: 0.9 },
  { id: 'v7', seed: 707, bodyType: 'stocky', scale: 0.82, primary: '#3fa871', secondary: '#f0e6d2', accent: '#e63946', skin: '#d9a066',
    headwear: 'hood', neck: 'turtleneck', mouth: 'grin', brows: true, personality: 'heavy', limbThickness: 1.2 },
  { id: 'v8', seed: 808, bodyType: 'tall', scale: 0.7, primary: '#ff8fa3', secondary: '#8e5ce8', accent: '#4cc9f0', skin: '#ffe4c9',
    headwear: 'hair', neck: 'glowNecklace', eyeShape: 'oval', mouth: 'smile', personality: 'bouncy', headScale: 1.15 },
];

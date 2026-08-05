import type { CharacterDef } from './types';

// Characters are pure data. Creating a new one = adding an object here.
//
// Fully-commented example:
// {
//   id: 'example',          // unique id
//   seed: 1234,             // drives deterministic micro-variations
//   bodyType: 'slim',       // 'slim' | 'round' | 'stocky' | 'tall'
//   headScale: 1.1,         // optional head size multiplier
//   limbThickness: 0.9,     // optional limb radius multiplier
//   scale: 0.8,             // optional whole-character scale
//   primary: '#57cc99',     // body color (required)
//   secondary: '#f0f0f0',   // clothing accents (hair, hood, collar…)
//   accent: '#e63946',      // accessories (hat, backpack, scarf…)
//   skin: '#ffd9b3',        // head color
//   glow: '#ffd24c',        // emissive bits (antenna bulb, necklace)
//   headwear: 'coneHat',    // registry key or null
//   back: 'cape',           //   "
//   neck: 'scarf',          //   "
//   faceGear: 'roundGlasses', // "
//   eyeShape: 'oval',       // 'round' | 'oval' | 'wide' | 'sleepy'
//   mouth: 'grin',          // 'smile' | 'grin' | 'neutral' | 'o'
//   brows: true,
//   personality: 'nervous', // 'bouncy' | 'calm' | 'heavy' | 'nervous'
// }

// The hero — must stay visually identical to the original hand-built rig.
export const heroDef: CharacterDef = {
  id: 'hero',
  seed: 7,
  bodyType: 'round',
  primary: '#ff8c42',
  secondary: '#f0f0f0',
  accent: '#4cc9f0',
  skin: '#ffd9b3',
  glow: '#ffd24c',
  headwear: 'visorHelmet',
  back: 'backpack',
  personality: 'bouncy',
};

export const villagerDefs: CharacterDef[] = [
  { id: 'v1', seed: 101, bodyType: 'round', scale: 0.75, primary: '#57cc99', accent: '#e63946',
    headwear: 'mushroom', personality: 'bouncy' },
  { id: 'v2', seed: 202, bodyType: 'slim', scale: 0.7, primary: '#b388eb', secondary: '#3a86ff', accent: '#ffd24c',
    headwear: 'beanie', neck: 'scarf', personality: 'calm' },
  { id: 'v3', seed: 303, bodyType: 'stocky', scale: 0.8, primary: '#ffd24c', secondary: '#8338ec', accent: '#4cc9f0', glow: '#4cc9f0',
    headwear: 'antennaDome', back: 'jetpack', eyeShape: 'wide', mouth: 'o', personality: 'nervous' },
  { id: 'v4', seed: 404, bodyType: 'tall', scale: 0.75, primary: '#4361ee', secondary: '#f0e6d2', accent: '#7209b7',
    headwear: 'coneHat', back: 'cape', faceGear: 'roundGlasses', eyeShape: 'oval', mouth: 'neutral', personality: 'calm' },
  { id: 'v5', seed: 505, bodyType: 'round', scale: 0.8, headScale: 1.1, primary: '#80b918', secondary: '#d9a066', accent: '#2d6a4f',
    headwear: 'leafCrown', back: 'shell', eyeShape: 'sleepy', personality: 'heavy' },
  { id: 'v6', seed: 606, bodyType: 'slim', scale: 0.72, primary: '#ff70a6', secondary: '#ffd6e0', accent: '#e63946',
    headwear: 'hair', back: 'wings', brows: true, mouth: 'grin', personality: 'bouncy' },
  { id: 'v7', seed: 707, bodyType: 'stocky', scale: 0.78, limbThickness: 1.15, primary: '#9c6644', secondary: '#7f5539', accent: '#e07a5f',
    headwear: 'hood', back: 'backpack', faceGear: 'mask', eyeShape: 'sleepy', personality: 'heavy' },
  { id: 'v8', seed: 808, bodyType: 'tall', scale: 0.74, primary: '#2ec4b6', secondary: '#cbf3f0', accent: '#ff9f1c', glow: '#ff9f1c',
    headwear: 'hornHelmet', neck: 'glowNecklace', faceGear: 'tintedVisor', eyeShape: 'wide', mouth: 'grin', personality: 'nervous' },
];

// Enemies — small horned imps.
export const enemyDef: CharacterDef = {
  id: 'imp',
  seed: 666,
  bodyType: 'stocky',
  scale: 0.68,
  primary: '#ff4d6d',
  secondary: '#590d22',
  accent: '#590d22',
  skin: '#ff4d6d',
  glow: '#ff4d6d',
  headwear: 'hornHelmet',
  back: 'wings',
  eyeShape: 'wide',
  mouth: 'grin',
  personality: 'nervous',
};

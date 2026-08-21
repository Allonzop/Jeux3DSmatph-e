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

// ---------------------------------------------------------------------------
// Le bestiaire
// ---------------------------------------------------------------------------
//
// Un profil de monstre, c'est deux choses : une apparence (ici) et des
// statistiques (`../enemies.ts`). Elles sont separees pour que le studio de
// personnages, qui ne connait que les apparences, puisse afficher et retoucher
// tout le bestiaire sans rien savoir des points de vie.
//
// Le lien entre les deux est l'`id` : `ENEMY_TYPES.colosse` va chercher
// l'apparence dont l'id est `colosse`. Ajouter un monstre demande donc les
// deux moities, et l'`id` doit etre le meme des deux cotes.

export const enemyDefs: CharacterDef[] = [
  // Le monstre d'origine (anciennement `imp`) : la reference visuelle.
  { id: 'grognard', seed: 666, bodyType: 'stocky', scale: 0.68,
    primary: '#ff4d6d', secondary: '#590d22', accent: '#590d22',
    skin: '#ff4d6d', glow: '#ff4d6d',
    headwear: 'hornHelmet', back: 'wings',
    eyeShape: 'wide', mouth: 'grin', personality: 'nervous' },

  // Rapide et fragile : silhouette fine, chapeau pointu, jaune vif.
  { id: 'fileur', seed: 1207, bodyType: 'slim', scale: 0.56, limbThickness: 0.75,
    primary: '#ffd24c', secondary: '#7a4b00', accent: '#ff8c42',
    skin: '#ffd24c', glow: '#fff3b0',
    headwear: 'coneHat', back: 'cape',
    eyeShape: 'wide', mouth: 'o', personality: 'nervous' },

  // Tank : large, membres epais, carapace, demarche lourde.
  //
  // Casque a visiere et col roule plutot que capuche et masque : `studio audit`
  // le donnait a 0.196 du villageois v7 (capuche + sac + masque, meme
  // corpulence), sous le seuil de quasi-doublon. Un allie et un monstre qui se
  // ressemblent a ce point, c'est une hesitation au milieu d'une vague. Le col
  // roule fait au passage entrer `turtleneck` en jeu, le dernier accessoire du
  // registre que personne ne portait.
  //
  // Le `glow` est passe de #e63946 a #ff6b6b : a 0.40 de luminance il tombait
  // sous le seuil de bloom (0.45) et les parties emissives ne brillaient pas.
  { id: 'colosse', seed: 3003, bodyType: 'stocky', scale: 1.05, headScale: 0.85, limbThickness: 1.5,
    primary: '#5c677d', secondary: '#33415c', accent: '#ff6b6b',
    skin: '#8d99ae', glow: '#ff6b6b',
    headwear: 'visorHelmet', back: 'shell', neck: 'turtleneck',
    eyeShape: 'sleepy', mouth: 'neutral', personality: 'heavy' },

  // Volant : reacteur dorsal, dome d'antenne, visiere teintee.
  { id: 'ecumeur', seed: 4404, bodyType: 'slim', scale: 0.62,
    primary: '#48cae4', secondary: '#023e8a', accent: '#90e0ef',
    skin: '#48cae4', glow: '#caf0f8',
    headwear: 'antennaDome', back: 'jetpack', faceGear: 'tintedVisor',
    eyeShape: 'oval', mouth: 'neutral', personality: 'bouncy' },

  // Kamikaze : rond, grosse tete, collier qui rougeoie.
  { id: 'bombeur', seed: 5505, bodyType: 'round', scale: 0.8, headScale: 1.15,
    primary: '#ff7b00', secondary: '#3d0000', accent: '#ffba08',
    skin: '#ff7b00', glow: '#ffba08',
    headwear: 'beanie', neck: 'glowNecklace',
    eyeShape: 'round', mouth: 'o', personality: 'bouncy' },

  // Fantome : longiligne, membres greles, cape, teintes violettes.
  { id: 'spectre', seed: 6606, bodyType: 'tall', scale: 0.72, limbThickness: 0.7,
    primary: '#9d4edd', secondary: '#3c096c', accent: '#e0aaff',
    skin: '#c77dff', glow: '#e0aaff',
    headwear: 'hair', back: 'cape', faceGear: 'roundGlasses',
    eyeShape: 'sleepy', mouth: 'neutral', personality: 'calm' },

  // Soigneur : couronne de feuilles, collier lumineux, vert apaisant.
  { id: 'chaman', seed: 7707, bodyType: 'tall', scale: 0.78,
    primary: '#52b788', secondary: '#1b4332', accent: '#95d5b2',
    skin: '#74c69d', glow: '#b7e4c7',
    headwear: 'leafCrown', back: 'cape', neck: 'glowNecklace',
    eyeShape: 'oval', mouth: 'smile', personality: 'calm' },
];

/**
 * @deprecated Utiliser `enemyDefs`. Conserve parce que le studio de
 * personnages importe ce nom ; il pointe sur le Grognard, le monstre d'origine.
 */
export const enemyDef: CharacterDef = enemyDefs[0];

// ---------------------------------------------------------------------------
// Les Chasseurs spatiaux
// ---------------------------------------------------------------------------
//
// Recrutes par le Bar (un par niveau), ils se battent aux cotes du heros
// pendant les vagues — voir `../scene/Hunters.tsx`. Visuellement ils tiennent
// du villageois (meme echelle) et du heros (casque, equipement) : on doit lire
// « habitant arme », pas « second heros ».

export const hunterDefs: CharacterDef[] = [
  { id: 'h1', seed: 9101, bodyType: 'stocky', scale: 0.82,
    primary: '#3a86ff', secondary: '#dbeafe', accent: '#ffd24c', glow: '#7dd3fc',
    headwear: 'visorHelmet', back: 'backpack',
    eyeShape: 'round', mouth: 'grin', brows: true, personality: 'bouncy' },
  { id: 'h2', seed: 9202, bodyType: 'slim', scale: 0.8,
    primary: '#f72585', secondary: '#ffd6e0', accent: '#4cc9f0', glow: '#f72585',
    headwear: 'hornHelmet', neck: 'scarf', faceGear: 'tintedVisor',
    eyeShape: 'oval', mouth: 'neutral', personality: 'nervous' },
  { id: 'h3', seed: 9303, bodyType: 'tall', scale: 0.84,
    primary: '#06d6a0', secondary: '#073b4c', accent: '#ffd166', glow: '#06d6a0',
    headwear: 'hood', back: 'jetpack',
    eyeShape: 'wide', mouth: 'smile', brows: true, personality: 'calm' },
  { id: 'h4', seed: 9404, bodyType: 'round', scale: 0.86, limbThickness: 1.2,
    primary: '#ff8c42', secondary: '#4a3d5c', accent: '#e0aaff', glow: '#ffd24c',
    headwear: 'antennaDome', back: 'shell', faceGear: 'mask',
    eyeShape: 'sleepy', mouth: 'grin', personality: 'heavy' },
];

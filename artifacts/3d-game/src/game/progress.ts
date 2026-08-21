import type { Resources } from './store';

/**
 * La progression du commandant.
 *
 * Le jeu ne recompensait que par des ressources, et rien ne marquait qu'on
 * progressait : gagner une vague donnait des boulons, point. Le retour
 * d'evaluation le resume par « le jeu manque cruellement de dopamine ».
 *
 * Un niveau de commandant donne ce fil rouge. Il monte a chaque action utile
 * — abattre, recolter, batir, repousser une vague — et **ne redescend
 * jamais**, meme apres une defaite : perdre coute des ressources, jamais la
 * progression. C'est ce qui fait qu'on relance une vague apres l'avoir ratee.
 */

/** Experience a accumuler pour passer du niveau `level` au suivant. */
export function xpForLevel(level: number): number {
  // Courbe douce : 80, 104, 135, 176, 228, 297… Les premiers niveaux tombent
  // en moins d'une vague, exactement ce que demande la « time curve » du
  // backlog — les quinze premieres minutes doivent enchainer les paliers.
  return Math.round(80 * Math.pow(1.3, level - 1));
}

/** Recompense versee en atteignant `level`. */
export function levelUpReward(level: number): Partial<Resources> {
  const reward: Partial<Resources> = { boulons: 120 + level * 80 };
  // Les ressources rares tombent par paliers, pas a chaque niveau : c'est ce
  // qui les garde rares maintenant que les gisements ont ete ralentis.
  if (level % 2 === 0) reward.matiere_floue = Math.ceil(level / 2) * 3;
  if (level % 4 === 0) reward.energie_rire = level / 4;
  return reward;
}

/** Gains d'experience du jeu, au meme endroit pour rester lisibles. */
export const XP = {
  /** Recolter un gisement. */
  harvest: 3,
  /** Batir ou ameliorer un batiment. */
  build: 30,
  /** Repousser une vague, en plus de l'experience des monstres abattus. */
  wave: (wave: number) => 40 + wave * 12,
  /** Renforcer le noyau. */
  coreUpgrade: 60,
  /** Deblayer un element de decor. */
  clearDecor: 6,
  /** Annexer un secteur de la planete. */
  unlockZone: 250,
} as const;

/**
 * Titre du commandant, affiche a cote de son niveau.
 * Purement cosmetique — mais c'est ce qu'on lit en premier sur la barre d'XP.
 */
const TITLES: { from: number; title: string }[] = [
  { from: 1, title: 'Bricoleur' },
  { from: 3, title: 'Contremaître' },
  { from: 5, title: 'Bâtisseur' },
  { from: 8, title: 'Capitaine' },
  { from: 12, title: 'Commandant' },
  { from: 16, title: 'Amiral' },
  { from: 21, title: 'Gardien du cristal' },
  { from: 27, title: 'Légende de la planète' },
];

export function titleForLevel(level: number): string {
  let found = TITLES[0].title;
  for (const t of TITLES) if (level >= t.from) found = t.title;
  return found;
}

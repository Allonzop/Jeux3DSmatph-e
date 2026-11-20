/**
 * Jusqu'ou l'interface recouvre le haut de l'ecran, en pixels CSS.
 *
 * La scene 3D a des etiquettes (`<Html>`) qui flottent au-dessus des objets ;
 * l'interface a des cartes opaques ancrees en haut. Sur un ecran court les
 * deux se rencontrent, et c'est l'etiquette qui disparait. Ce module est le
 * seul fil entre les deux mondes : l'interface y ecrit le bas de ce qu'elle
 * pose en haut, la scene le lit pour s'ecarter.
 *
 * Un objet mutable et pas le magasin Zustand : la valeur est lue a chaque
 * image par `calculatePosition`, et personne n'a besoin d'etre re-rendu quand
 * elle change (voir `.agents/memory/r3f-game-perf.md`).
 */
export const hudClearance = {
  /** Bas de la carte du tutoriel ; 0 quand rien n'est affiche. */
  top: 0,
};

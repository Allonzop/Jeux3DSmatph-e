/**
 * L'orientation de la caméra autour du héros.
 *
 * Demandé au playtest : « ça serait cool d'ajouter la possibilité de faire une
 * rotation de l'écran autour du héros pour changer l'angle de vue ». Un
 * bâtiment posé derrière un arbre, un monstre qui arrive par le côté masqué —
 * il n'y avait aucun moyen de regarder ailleurs.
 *
 * L'angle vit ici, hors de React et de Zustand : il change à chaque image tant
 * qu'un bouton est tenu, exactement le genre de donnée que
 * `.agents/memory/r3f-game-perf.md` interdit de faire passer par le magasin.
 *
 * Deux valeurs : `target` est ce que demandent les commandes, `yaw` la suit
 * avec amortissement — c'est `scene/Camera.tsx` qui les rapproche. Une rotation
 * instantanée donne le mal de mer sur un téléphone.
 *
 * **`yaw` vaut 0 dans toute partie neuve**, et 0 rend exactement le cadrage
 * d'avant : les vérifications de `tools/game-check` ne touchent pas aux
 * commandes, elles voient donc la même scène qu'avant.
 */
export const cameraControl = {
  /** Angle visé, en radians. */
  target: 0,
  /** Angle courant, amorti vers `target`. */
  yaw: 0,
};

/** Vitesse de rotation quand une commande est tenue, en radians par seconde. */
export const ROTATE_SPEED = 1.5;

/** Fait tourner la vue. `delta` en radians. */
export function rotateCamera(delta: number): void {
  cameraControl.target += delta;
}

/** Remet la vue dans l'axe d'origine. */
export function resetCameraYaw(): void {
  cameraControl.target = 0;
}

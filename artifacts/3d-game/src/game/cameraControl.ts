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

/** Vitesse de rotation au début d'une pression, en radians par seconde. */
export const ROTATE_SPEED = 1.5;
/** Vitesse atteinte en tenant : un demi-tour ne prend plus une éternité. */
export const ROTATE_SPEED_MAX = 4;
/** Secondes pour passer de la vitesse de départ à la vitesse max. */
export const ROTATE_RAMP = 0.8;
/** Une pression plus courte que ça (secondes) est un « clic » : cran de 45°. */
export const TAP_MAX = 0.22;
/** Un cran = 45°. */
export const TAP_STEP = Math.PI / 4;

/** Fait avancer la vue jusqu'au prochain cran de 45° dans le sens `dir`. */
export function snapCamera(dir: number): void {
  const k = cameraControl.target / TAP_STEP;
  const next = dir > 0 ? Math.floor(k + 1e-6) + 1 : Math.ceil(k - 1e-6) - 1;
  cameraControl.target = next * TAP_STEP;
}

/** Fait tourner la vue. `delta` en radians. */
export function rotateCamera(delta: number): void {
  cameraControl.target += delta;
}

/** Remet la vue dans l'axe d'origine. */
export function resetCameraYaw(): void {
  cameraControl.target = 0;
}

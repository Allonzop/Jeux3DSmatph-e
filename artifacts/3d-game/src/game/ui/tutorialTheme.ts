/**
 * La couleur du didacticiel.
 *
 * Elle etait ambre. Le probleme releve au playtest : le bouton « Lancer la
 * vague », la barre d'experience, la carte de montee de niveau et le fanion du
 * niveau maximum sont deja ambre ou orange. Un clignotement de plus dans cette
 * teinte ne disait plus « regardez ici », il se noyait — « les joueurs sont
 * perdus ».
 *
 * Le magenta n'est utilise nulle part ailleurs dans le jeu : ni dans une
 * ressource, ni dans un batiment, ni dans un profil de monstre. Tout ce qui
 * clignote en magenta appartient au tutoriel, et rien d'autre.
 *
 * Un seul endroit ou la changer, pour la scene 3D comme pour l'interface.
 */
export const TUTORIAL_COLOR = '#ff4fd8';

/** Variantes prêtes a l'emploi, pour ne pas semer des `#ff4fd8` partout. */
export const TUTORIAL_BORDER = 'rgba(255,79,216,0.55)';
export const TUTORIAL_GLOW = '0 0 24px rgba(255,79,216,0.45)';
export const TUTORIAL_RING_GLOW = '0 0 16px rgba(255,79,216,0.85)';

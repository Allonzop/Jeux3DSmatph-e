/**
 * Téléphone couché : large, mais très peu haut (844×390, 667×375).
 *
 * Le jeu est pensé debout. Couché, la pile du haut (compteurs, barre d'XP,
 * bandeau d'objectif) mangeait plus du tiers de la hauteur. L'interface se
 * réorganise par la variante Tailwind `couche:` (voir `index.css`) ; la caméra,
 * elle, ne lit pas le CSS et passe par ici. **Les deux seuils doivent rester
 * identiques.** Un écran de bureau est en paysage aussi, mais haut : il n'est
 * pas concerné.
 */
export function isShortLandscape(width: number, height: number): boolean {
  return width > height && height <= 500;
}

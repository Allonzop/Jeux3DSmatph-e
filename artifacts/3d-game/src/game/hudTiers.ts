/**
 * L'interface se dévoile au fil des niveaux.
 *
 * Retour de playtest : « pendant les vagues c'est un peu le bordel, on ne
 * comprend pas forcément tout ce qui se passe à l'écran ; il faudrait
 * réfléchir à une solution à mettre en place progressivement ».
 *
 * Tout arrivait d'un coup dès la première vague : chiffres de dégâts,
 * enchaînements, flèches de menace, bandeaux de niveau, gains de ressources.
 * Chacun pris isolément aide ; les cinq ensemble, sur un écran de téléphone
 * pendant qu'on esquive vingt monstres, se neutralisent.
 *
 * Ils s'allument donc l'un après l'autre, à mesure que le joueur monte en
 * niveau — c'est-à-dire à mesure qu'il a le reste en main. Les deux premières
 * vagues ne montrent que l'essentiel : l'objectif, l'état du noyau, le nombre
 * de monstres restants.
 *
 * Le déblocage est annoncé dans la carte de montée de niveau, au moment même
 * où il tombe : pas de notification de plus à absorber.
 */
export type HudFeature = 'damageNumbers' | 'threatMarkers' | 'comboMeter';

/** Niveau de commandant à partir duquel chaque élément apparaît. */
export const HUD_UNLOCKS: Record<HudFeature, number> = {
  /** Les chiffres qui montent des monstres touchés. */
  damageNumbers: 3,
  /** Les flèches de menace au bord de l'écran. */
  threatMarkers: 4,
  /** Le compteur d'enchaînement. */
  comboMeter: 6,
};

/** Nom lisible, pour l'annonce de déblocage. */
export const HUD_FEATURE_LABEL: Record<HudFeature, string> = {
  damageNumbers: 'Les chiffres de dégâts',
  threatMarkers: 'Les flèches de menace',
  comboMeter: 'Le compteur d’enchaînement',
};

export function hudHas(playerLevel: number, feature: HudFeature): boolean {
  return playerLevel >= HUD_UNLOCKS[feature];
}

/** Ce qui s'allume précisément en atteignant ce niveau, s'il y a lieu. */
export function hudUnlockedAt(level: number): HudFeature | null {
  for (const [feature, at] of Object.entries(HUD_UNLOCKS) as [HudFeature, number][]) {
    if (at === level) return feature;
  }
  return null;
}

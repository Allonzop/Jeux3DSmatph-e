import type { GameState } from './store';
import { BUILDINGS, instanceIds } from './gamedata';

/**
 * L'objectif du moment, en une phrase.
 *
 * « L'expérience globale manque de lisibilité, les objectifs doivent être
 * beaucoup plus instinctifs » : le jeu ne disait jamais quoi faire une fois le
 * tutoriel fini. On regardait un village et trois jauges, sans savoir ce qui
 * etait attendu.
 *
 * Cette fonction repond a « et maintenant ? » a tout instant. Elle est
 * volontairement une simple echelle de conditions, prise dans l'ordre : la
 * premiere qui s'applique gagne. Ajouter un palier, c'est ajouter une ligne au
 * bon endroit — rien d'autre a modifier.
 */
export type Objective = {
  /** Ce qu'il faut faire, a l'imperatif, court. */
  text: string;
  /** Avancement de 0 a 1 quand il est mesurable, sinon undefined. */
  progress?: number;
  /** Detail chiffre affiche a droite (« 2/5 »). */
  detail?: string;
};

function placedCount(state: GameState, base: string): number {
  let n = 0;
  for (const id of instanceIds(base)) if (state.buildingPositions[id]) n += 1;
  return n;
}

function builtCount(state: GameState, base: string): number {
  let n = 0;
  for (const id of instanceIds(base)) if ((state.buildingLevels[id] || 0) > 0) n += 1;
  return n;
}

/** Nombre total de tours construites, tous types confondus. */
export function defenseCount(state: GameState): number {
  let n = 0;
  for (const base of Object.keys(BUILDINGS)) {
    if (BUILDINGS[base].role !== 'defense') continue;
    n += builtCount(state, base);
  }
  return n;
}

export function nextObjective(state: GameState): Objective {
  if (state.waveActive) {
    const killed = state.waveKills;
    const total = state.waveEnemyCount || 1;
    // « Éliminez », surtout pas « Repoussez » : `tools/game-check/wave.mjs`
    // lit le texte de la page et conclut a une victoire des qu'il y trouve
    // « repouss ». Cette phrase-la s'affiche *pendant* la vague, et le test
    // annoncait donc une victoire a la seconde ou elle commencait. Le mot est
    // reserve a la carte de victoire (`ui/WaveOutcome.tsx`), nulle part
    // ailleurs dans l'interface.
    return {
      text: 'Éliminez les monstres',
      progress: killed / total,
      detail: `${killed}/${total}`,
    };
  }

  if (builtCount(state, 'hutte') === 0) {
    return { text: 'Bâtissez une hutte' };
  }

  if (defenseCount(state) === 0) {
    return { text: 'Bâtissez une tourelle laser' };
  }

  if (state.waveNumber === 0) {
    return { text: 'Lancez votre première vague' };
  }

  if (state.waveFailed) {
    return { text: `Reprenez la vague ${state.waveNumber}`, detail: 'Renforcez d’abord' };
  }

  // Paliers de mi-partie : chacun pousse vers une mecanique pas encore vue.
  if (state.waveNumber >= 3 && defenseCount(state) < 2) {
    return { text: 'Ajoutez une deuxième défense', detail: `${defenseCount(state)}/2` };
  }
  if (state.waveNumber >= 4 && builtCount(state, 'bar') === 0) {
    return { text: 'Ouvrez le Bar : il recrute des chasseurs' };
  }
  if (state.waveNumber >= 5 && builtCount(state, 'tesla') === 0) {
    return { text: 'Montez un Tesla : les Écumeurs volent' };
  }
  if (state.waveNumber >= 6 && builtCount(state, 'cryo') === 0) {
    return { text: 'Un Cryo-diffuseur ralentirait tout ça' };
  }
  if (placedCount(state, 'hutte') < 2) {
    return { text: 'Une seconde hutte doublerait vos boulons' };
  }

  return {
    text: `Lancez la vague ${state.waveNumber + 1}`,
    detail: state.bestWave > 0 ? `record : ${state.bestWave}` : undefined,
  };
}

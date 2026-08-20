import { Resources } from './store';

export type BuildingData = {
  id: string;
  name: string;
  color: string;
  maxLevel: number;
  levels: {
    cost: Partial<Resources>;
    passive: Partial<Resources>;
  }[];
};

// ---- Wave stakes ----

/**
 * Dégâts infligés au noyau par un monstre qui l'atteint.
 *
 * Calculé pour que la règle soit toujours la même quelle que soit la taille de
 * la vague : **laisser passer plus de la moitié des monstres détruit le
 * noyau**. C'est ce qui rend une vague perdable — auparavant chaque monstre
 * retirait 10 points fixes sur 100, si bien que les deux premières vagues (3
 * puis 5 monstres) étaient mathématiquement ingagnables par l'adversaire.
 *
 * Vague de 3  → 50 par monstre : on peut en laisser passer 1, il faut en tuer 2.
 * Vague de 5  → 33 par monstre : on peut en laisser passer 2, il faut en tuer 3.
 * Vague de 11 → 17 par monstre : on peut en laisser passer 5, il faut en tuer 6.
 */
export function coreBreachDamage(enemyCount: number, coreMaxHp: number): number {
  const survivable = Math.floor(enemyCount / 2);
  return coreMaxHp / (survivable + 1);
}

// Victory: resource bonus growing with the wave number, proportionnel à ce que
// le joueur a réellement abattu. Survivre de justesse ne rapporte pas autant
// que nettoyer la vague.
export function waveVictoryReward(wave: number, killRatio = 1): Partial<Resources> {
  // Un plancher : avoir tenu vaut toujours quelque chose.
  const share = 0.4 + 0.6 * Math.min(1, Math.max(0, killRatio));
  const scale = (n: number) => Math.max(1, Math.round(n * share));

  const reward: Partial<Resources> = { boulons: scale(40 + wave * 30) };
  if (wave >= 2) reward.matiere_floue = scale((wave - 1) * 3);
  if (wave >= 4) reward.energie_rire = scale(wave - 3);
  return reward;
}

// Defeat: lose a fraction of current resources — tangible but never blocking.
export const DEFEAT_LOSS_RATIO = 0.2;

export function waveDefeatLoss(resources: Resources): Partial<Resources> {
  return {
    boulons: Math.floor(resources.boulons * DEFEAT_LOSS_RATIO),
    matiere_floue: Math.floor(resources.matiere_floue * DEFEAT_LOSS_RATIO),
    energie_rire: Math.floor(resources.energie_rire * DEFEAT_LOSS_RATIO),
  };
}

export const BUILDINGS: Record<string, BuildingData> = {
  hutte: {
    id: 'hutte',
    name: 'Hutte',
    color: '#f4a261',
    maxLevel: 5,
    levels: [
      { cost: { boulons: 50 }, passive: { boulons: 4 } },
      { cost: { boulons: 120 }, passive: { boulons: 6 } },
      { cost: { boulons: 400 }, passive: { boulons: 8 } },
      { cost: { boulons: 900, matiere_floue: 10 }, passive: { boulons: 14 } },
      { cost: { boulons: 2000, matiere_floue: 30 }, passive: { boulons: 24 } }
    ]
  },
  ferme: {
    id: 'ferme',
    name: 'Ferme',
    color: '#57cc99',
    maxLevel: 4,
    levels: [
      { cost: { boulons: 150 }, passive: {} },
      { cost: { boulons: 450, matiere_floue: 5 }, passive: { matiere_floue: 0.2 } },
      { cost: { boulons: 1200, matiere_floue: 15 }, passive: { matiere_floue: 0.5 } },
      { cost: { boulons: 3000, matiere_floue: 40 }, passive: { matiere_floue: 1 } }
    ]
  },
  bar: {
    id: 'bar',
    name: 'Bar Spatial',
    color: '#e07a5f',
    maxLevel: 4,
    levels: [
      { cost: { boulons: 250 }, passive: {} },
      { cost: { boulons: 700, matiere_floue: 10 }, passive: {} },
      { cost: { boulons: 2000, matiere_floue: 30 }, passive: {} },
      { cost: { boulons: 4500, matiere_floue: 60 }, passive: {} }
    ]
  },
  antenne: {
    id: 'antenne',
    name: 'Antenne',
    color: '#e63946',
    maxLevel: 4,
    levels: [
      { cost: { boulons: 600, matiere_floue: 15 }, passive: {} },
      { cost: { boulons: 1500, matiere_floue: 35 }, passive: {} },
      { cost: { boulons: 3500, matiere_floue: 70 }, passive: {} },
      { cost: { boulons: 7000, matiere_floue: 120 }, passive: {} }
    ]
  },
  marche: {
    id: 'marche',
    name: 'Marché',
    color: '#ffd24c',
    maxLevel: 3,
    levels: [
      { cost: { boulons: 1000, matiere_floue: 25 }, passive: { energie_rire: 0.05 } },
      { cost: { boulons: 2500, matiere_floue: 50 }, passive: { energie_rire: 0.12 } },
      { cost: { boulons: 5000, matiere_floue: 100, energie_rire: 10 }, passive: { energie_rire: 0.25 } }
    ]
  },
  tourelle: {
    id: 'tourelle',
    name: 'Tourelle',
    color: '#4cc9f0',
    maxLevel: 5,
    levels: [
      { cost: { boulons: 300 }, passive: {} },
      { cost: { boulons: 800, matiere_floue: 10 }, passive: {} },
      { cost: { boulons: 2000, matiere_floue: 25 }, passive: {} },
      { cost: { boulons: 4000, matiere_floue: 50 }, passive: {} },
      { cost: { boulons: 8000, matiere_floue: 100 }, passive: {} }
    ]
  }
};

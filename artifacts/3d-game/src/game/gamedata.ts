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
// Victory: resource bonus growing with the wave number.
export function waveVictoryReward(wave: number): Partial<Resources> {
  const reward: Partial<Resources> = { boulons: 40 + wave * 30 };
  if (wave >= 2) reward.matiere_floue = (wave - 1) * 3;
  if (wave >= 4) reward.energie_rire = wave - 3;
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
      { cost: { boulons: 50 }, passive: { boulons: 2 } },
      { cost: { boulons: 120 }, passive: { boulons: 3 } },
      { cost: { boulons: 400 }, passive: { boulons: 4 } },
      { cost: { boulons: 900, matiere_floue: 10 }, passive: { boulons: 7 } },
      { cost: { boulons: 2000, matiere_floue: 30 }, passive: { boulons: 12 } }
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

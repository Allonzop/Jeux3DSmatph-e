import { Resources } from './store';

export type BuildingRole = 'production' | 'defense' | 'soutien';

/** Comment une tour attaque. Lu par `Buildings.tsx`, jamais code en dur ailleurs. */
export type TurretMode = 'laser' | 'mortier' | 'cryo' | 'tesla';

export type TurretStats = {
  mode: TurretMode;
  /** Portee en unites du monde, mesuree a plat (x, z). */
  range: number;
  /** Degats par seconde sur la cible principale. */
  dps: number;
  /** Rayon d'effet pour le mortier et le cryo. 0 pour les tours mono-cible. */
  splash: number;
  /** Nombre de cibles simultanees (tesla). 1 pour les autres. */
  targets: number;
  /** Ralentissement applique, de 0 (aucun) a 1 (immobile). */
  slow: number;
  /** La tour atteint-elle les monstres volants ? */
  hitsAir: boolean;
};

export type BuildingData = {
  id: string;
  name: string;
  color: string;
  role: BuildingRole;
  /** Une phrase, affichee partout ou le batiment apparait. C'est *la* reponse
   *  a « a quoi ca sert ? » — le point le plus signale du retour d'evaluation. */
  blurb: string;
  maxLevel: number;
  /** Combien d'exemplaires le joueur peut poser. Voir `instanceIds` plus bas. */
  maxInstances: number;
  /**
   * Rayon d'encombrement au sol, en unites du monde, echelle de rendu comprise.
   *
   * Le placement demandait auparavant un ecart fixe de 3,4 unites entre deux
   * batiments, quel que soit leur gabarit : une antenne — un mat de 0,5 de
   * rayon — reservait autant de terrain qu'un marche de 2,2 de large. « Le
   * placement des batiments est trop rigide », disait le backlog, avec pour
   * action « revoir la taille des colliders ». C'est ce chiffre.
   *
   * Deux batiments se genent si la distance entre leurs centres est inferieure
   * a la somme de leurs deux rayons. Le socle octogonal colore est dessine a
   * ce rayon exactement : **l'anneau qu'on voit au sol est l'encombrement
   * reel**, il n'y a rien a deviner.
   */
  footprint: number;
  levels: {
    cost: Partial<Resources>;
    passive: Partial<Resources>;
    /** Present uniquement sur les tours. Une entree par niveau. */
    turret?: TurretStats;
    /** Effet non chiffrable en ressources, affiche tel quel dans le panneau. */
    effect?: string;
  }[];
};

// ---------------------------------------------------------------------------
// Instances multiples
// ---------------------------------------------------------------------------
//
// Le jeu ne permettait qu'un exemplaire de chaque batiment : une seule
// tourelle, une seule hutte. Le retour d'evaluation demande de lever ce cap.
//
// Plutot que de changer la forme du magasin — `buildingLevels` et
// `buildingPositions` sont des `Record<string, …>` sur lesquels repose tout le
// jeu, y compris les sauvegardes et l'outil de verification — les exemplaires
// supplementaires prennent un identifiant derive : `tourelle`, `tourelle#2`,
// `tourelle#3`. Le premier exemplaire garde l'identifiant nu, donc **toutes
// les sauvegardes existantes restent valides sans migration**.
//
// Une seule regle a retenir : partout ou on lit `BUILDINGS[id]`, passer par
// `buildingData(id)`.

/** Type de base d'un identifiant d'exemplaire (`tourelle#2` -> `tourelle`). */
export function baseId(instanceId: string): string {
  const hash = instanceId.indexOf('#');
  return hash === -1 ? instanceId : instanceId.slice(0, hash);
}

/** Definition du batiment derriere un identifiant d'exemplaire. */
export function buildingData(instanceId: string): BuildingData | undefined {
  return BUILDINGS[baseId(instanceId)];
}

/** Tous les identifiants d'exemplaires possibles pour un type, dans l'ordre. */
export function instanceIds(base: string): string[] {
  const data = BUILDINGS[base];
  if (!data) return [base];
  return Array.from({ length: data.maxInstances }, (_, i) => (i === 0 ? base : `${base}#${i + 1}`));
}

/** Numero affiche d'un exemplaire (1 pour l'identifiant nu). */
export function instanceNumber(instanceId: string): number {
  const hash = instanceId.indexOf('#');
  return hash === -1 ? 1 : Number(instanceId.slice(hash + 1)) || 1;
}

/** Le premier exemplaire de `base` qui n'est pas encore pose, ou null si complet. */
export function nextFreeInstance(
  base: string,
  positions: Record<string, [number, number, number]>,
): string | null {
  for (const id of instanceIds(base)) {
    if (!positions[id]) return id;
  }
  return null;
}

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
 * Vague de 3 → 50 par monstre : on peut en laisser passer 1, il faut en tuer 2.
 * Vague de 5 → 33 par monstre : on peut en laisser passer 2, il faut en tuer 3.
 * Vague de 7 → 25 par monstre : on peut en laisser passer 3, il faut en tuer 4.
 *
 * `coreLevel` est le renforcement paye par le joueur : chaque cran lui accorde
 * un monstre de tolerance en plus. A 0 — la valeur de toute partie neuve et de
 * `wave.mjs --check` — la formule est exactement celle d'avant.
 */
export function coreBreachDamage(enemyCount: number, coreMaxHp: number, coreLevel = 0): number {
  const survivable = Math.floor(enemyCount / 2) + coreLevel;
  return coreMaxHp / (survivable + 1);
}

// ---- Renforcement du noyau ----
//
// Le puits de ressources rares qui manquait. Monter le noyau n'ajoute pas de
// points de vie — la formule ci-dessus est proportionnelle, donc doubler les
// pv ne changerait strictement rien — mais un monstre de tolerance en plus,
// ce qui est directement lisible : « le noyau encaisse un monstre de plus ».
export const CORE_MAX_LEVEL = 3;

export function coreUpgradeCost(level: number): Partial<Resources> {
  const tiers: Partial<Resources>[] = [
    { boulons: 1200, matiere_floue: 40 },
    { boulons: 3000, matiere_floue: 90, energie_rire: 6 },
    { boulons: 7000, matiere_floue: 180, energie_rire: 18 },
  ];
  return tiers[level] ?? tiers[tiers.length - 1];
}

// Victory: resource bonus growing with the wave number, proportionnel à ce que
// le joueur a réellement abattu. Survivre de justesse ne rapporte pas autant
// que nettoyer la vague. `lootBonus` vient du Marché (voir son `blurb`).
export function waveVictoryReward(wave: number, killRatio = 1, lootBonus = 1): Partial<Resources> {
  // Un plancher : avoir tenu vaut toujours quelque chose.
  const share = (0.4 + 0.6 * Math.min(1, Math.max(0, killRatio))) * lootBonus;
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

// ---- Effets des batiments de soutien ----

/** Portee et degats du heros gagnes par niveau d'Antenne. */
export const ANTENNE_HERO_RANGE = 1.1;
export const ANTENNE_HERO_DPS = 12;

/** Un Chasseur spatial par niveau de Bar. Voir `scene/Hunters.tsx`. */
export const HUNTER_DPS = 26;
export const HUNTER_RANGE = 4.5;

/** Bonus de butin par niveau de Marche. */
export const MARCHE_LOOT_BONUS = 0.15;

// ---------------------------------------------------------------------------
// Les batiments
// ---------------------------------------------------------------------------

/** Raccourci de lisibilite pour les tours mono-cible. */
const laser = (range: number, dps: number): TurretStats => ({
  mode: 'laser', range, dps, splash: 0, targets: 1, slow: 0, hitsAir: false,
});

// Le cout en boulons du niveau 1 (le deblocage) de chaque batiment est rabote
// d'environ 40 % par rapport a ce qu'il etait avant cette passe. Le jeu n'a
// aucun timer de construction : l'attente du debut de partie, c'est le temps
// d'accumuler des boulons. Rien d'autre n'a bouge — couts des niveaux 2 et
// plus, production passive — pour garder la pente qui ralentit ensuite.
export const BUILDINGS: Record<string, BuildingData> = {
  hutte: {
    id: 'hutte',
    name: 'Hutte',
    color: '#f4a261',
    role: 'production',
    blurb: 'Produit des boulons en continu, même jeu fermé. Un villageois vient s’y installer.',
    maxLevel: 5,
    maxInstances: 3,
    footprint: 1.6,
    levels: [
      { cost: { boulons: 50 }, passive: { boulons: 4 } },
      { cost: { boulons: 120 }, passive: { boulons: 6 } },
      { cost: { boulons: 400 }, passive: { boulons: 8 } },
      // Niveaux 4 et 5 rabotes (14 -> 11, 24 -> 16) et le dernier renchéri.
      // Le playtest la trouve « un chouia trop puissante a partir d'un certain
      // niveau » : trois huttes de niveau 5 rapportaient 72 boulons/seconde,
      // de quoi payer une tourelle toutes les quatre secondes et vider tout
      // interet a la recolte. Les niveaux 1 a 3 ne bougent pas — c'est le
      // debut de partie, et il doit rester genereux (voir le buff du 20/08).
      { cost: { boulons: 900, matiere_floue: 10 }, passive: { boulons: 11 } },
      { cost: { boulons: 2600, matiere_floue: 30 }, passive: { boulons: 16 } }
    ]
  },
  ferme: {
    id: 'ferme',
    name: 'Ferme',
    color: '#57cc99',
    role: 'production',
    blurb: 'La seule source régulière de matière floue, la ressource des tours.',
    maxLevel: 4,
    maxInstances: 2,
    footprint: 1.35,
    levels: [
      { cost: { boulons: 90 }, passive: {}, effect: 'Se met à produire au niveau 2.' },
      { cost: { boulons: 450, matiere_floue: 5 }, passive: { matiere_floue: 0.2 } },
      { cost: { boulons: 1200, matiere_floue: 15 }, passive: { matiere_floue: 0.5 } },
      { cost: { boulons: 3000, matiere_floue: 40 }, passive: { matiere_floue: 1 } }
    ]
  },
  bar: {
    id: 'bar',
    name: 'Bar Spatial',
    color: '#e07a5f',
    role: 'soutien',
    blurb: 'Recrute un Chasseur spatial par niveau : ils se battent à vos côtés pendant les vagues.',
    maxLevel: 4,
    maxInstances: 1,
    footprint: 1.45,
    levels: [
      { cost: { boulons: 150 }, passive: {}, effect: '1 Chasseur spatial' },
      { cost: { boulons: 700, matiere_floue: 10 }, passive: {}, effect: '2 Chasseurs spatiaux' },
      { cost: { boulons: 2000, matiere_floue: 30 }, passive: {}, effect: '3 Chasseurs spatiaux' },
      { cost: { boulons: 4500, matiere_floue: 60 }, passive: {}, effect: '4 Chasseurs spatiaux' }
    ]
  },
  antenne: {
    id: 'antenne',
    name: 'Antenne',
    color: '#e63946',
    role: 'soutien',
    blurb: 'Relais de combat : allonge la portée du héros et renforce son rayon.',
    maxLevel: 4,
    maxInstances: 1,
    footprint: 1.1,
    levels: [
      { cost: { boulons: 350, matiere_floue: 15 }, passive: {}, effect: 'Héros : +1,1 portée, +12 dégâts/sec' },
      { cost: { boulons: 1500, matiere_floue: 35 }, passive: {}, effect: 'Héros : +2,2 portée, +24 dégâts/sec' },
      { cost: { boulons: 3500, matiere_floue: 70 }, passive: {}, effect: 'Héros : +3,3 portée, +36 dégâts/sec' },
      { cost: { boulons: 7000, matiere_floue: 120 }, passive: {}, effect: 'Héros : +4,4 portée, +48 dégâts/sec' }
    ]
  },
  marche: {
    id: 'marche',
    name: 'Marché',
    color: '#ffd24c',
    role: 'production',
    blurb: 'Produit de l’énergie de rire et majore le butin de chaque vague gagnée.',
    maxLevel: 3,
    maxInstances: 1,
    footprint: 1.6,
    levels: [
      { cost: { boulons: 600, matiere_floue: 25 }, passive: { energie_rire: 0.05 }, effect: 'Butin de vague +15 %' },
      { cost: { boulons: 2500, matiere_floue: 50 }, passive: { energie_rire: 0.12 }, effect: 'Butin de vague +30 %' },
      { cost: { boulons: 5000, matiere_floue: 100, energie_rire: 10 }, passive: { energie_rire: 0.25 }, effect: 'Butin de vague +45 %' }
    ]
  },

  // ---- Les tours ----
  //
  // Quatre roles distincts, volontairement non interchangeables : le laser
  // tape fort et loin sur une cible, le mortier nettoie les paquets, le cryo
  // ne tue presque rien mais donne du temps a tout le reste, et le tesla est
  // le seul, avec le heros, a atteindre les monstres volants.
  tourelle: {
    id: 'tourelle',
    name: 'Tourelle laser',
    color: '#4cc9f0',
    role: 'defense',
    blurb: 'Rayon continu sur le monstre le plus proche. Ne touche pas les volants.',
    maxLevel: 5,
    maxInstances: 3,
    footprint: 1.15,
    levels: [
      { cost: { boulons: 180 }, passive: {}, turret: laser(8, 50) },
      { cost: { boulons: 800, matiere_floue: 10 }, passive: {}, turret: laser(8.6, 70) },
      { cost: { boulons: 2000, matiere_floue: 25 }, passive: {}, turret: laser(9.2, 95) },
      { cost: { boulons: 4000, matiere_floue: 50 }, passive: {}, turret: laser(9.8, 125) },
      { cost: { boulons: 8000, matiere_floue: 100 }, passive: {}, turret: laser(10.5, 160) }
    ]
  },
  mortier: {
    id: 'mortier',
    name: 'Mortier à plasma',
    color: '#ff7b00',
    role: 'defense',
    blurb: 'Obus lents qui explosent en zone : redoutable sur les groupes serrés.',
    maxLevel: 4,
    maxInstances: 2,
    footprint: 1.25,
    levels: [
      { cost: { boulons: 420, matiere_floue: 20 }, passive: {},
        turret: { mode: 'mortier', range: 9, dps: 42, splash: 2.4, targets: 1, slow: 0, hitsAir: false } },
      { cost: { boulons: 1800, matiere_floue: 45 }, passive: {},
        turret: { mode: 'mortier', range: 9.8, dps: 62, splash: 2.8, targets: 1, slow: 0, hitsAir: false } },
      { cost: { boulons: 3800, matiere_floue: 90 }, passive: {},
        turret: { mode: 'mortier', range: 10.6, dps: 88, splash: 3.2, targets: 1, slow: 0, hitsAir: false } },
      { cost: { boulons: 7000, matiere_floue: 160, energie_rire: 8 }, passive: {},
        turret: { mode: 'mortier', range: 11.5, dps: 120, splash: 3.7, targets: 1, slow: 0, hitsAir: false } }
    ]
  },
  cryo: {
    id: 'cryo',
    name: 'Cryo-diffuseur',
    color: '#7dd3fc',
    role: 'defense',
    blurb: 'Ralentit tous les monstres de sa zone, volants compris. Tue peu, sauve beaucoup.',
    maxLevel: 3,
    maxInstances: 2,
    footprint: 1.15,
    levels: [
      { cost: { boulons: 540, matiere_floue: 30 }, passive: {},
        turret: { mode: 'cryo', range: 5, dps: 8, splash: 5, targets: 99, slow: 0.35, hitsAir: true },
        effect: 'Ralentit de 35 % dans un rayon de 5' },
      { cost: { boulons: 2200, matiere_floue: 70 }, passive: {},
        turret: { mode: 'cryo', range: 6, dps: 12, splash: 6, targets: 99, slow: 0.45, hitsAir: true },
        effect: 'Ralentit de 45 % dans un rayon de 6' },
      { cost: { boulons: 5000, matiere_floue: 140, energie_rire: 6 }, passive: {},
        turret: { mode: 'cryo', range: 7, dps: 18, splash: 7, targets: 99, slow: 0.55, hitsAir: true },
        effect: 'Ralentit de 55 % dans un rayon de 7' }
    ]
  },
  tesla: {
    id: 'tesla',
    name: 'Bobine Tesla',
    color: '#b388eb',
    role: 'defense',
    blurb: 'Arc qui frappe plusieurs monstres à la fois — la seule tour qui abat les volants.',
    maxLevel: 4,
    maxInstances: 2,
    footprint: 1.2,
    levels: [
      { cost: { boulons: 720, matiere_floue: 40, energie_rire: 4 }, passive: {},
        turret: { mode: 'tesla', range: 6.5, dps: 40, splash: 0, targets: 2, slow: 0, hitsAir: true },
        effect: '2 cibles simultanées' },
      { cost: { boulons: 2800, matiere_floue: 80, energie_rire: 8 }, passive: {},
        turret: { mode: 'tesla', range: 7.2, dps: 54, splash: 0, targets: 3, slow: 0, hitsAir: true },
        effect: '3 cibles simultanées' },
      { cost: { boulons: 6000, matiere_floue: 150, energie_rire: 16 }, passive: {},
        turret: { mode: 'tesla', range: 7.9, dps: 72, splash: 0, targets: 4, slow: 0, hitsAir: true },
        effect: '4 cibles simultanées' },
      { cost: { boulons: 12000, matiere_floue: 260, energie_rire: 30 }, passive: {},
        turret: { mode: 'tesla', range: 8.6, dps: 95, splash: 0, targets: 5, slow: 0, hitsAir: true },
        effect: '5 cibles simultanées' }
    ]
  }
};

/** Les statistiques de tour d'un batiment a son niveau courant, ou null. */
export function turretStats(instanceId: string, level: number): TurretStats | null {
  const data = buildingData(instanceId);
  if (!data || level <= 0) return null;
  return data.levels[level - 1]?.turret ?? null;
}

/** Libelle court du role, pour les pastilles de l'interface. */
export const ROLE_LABEL: Record<BuildingRole, string> = {
  production: 'Production',
  defense: 'Défense',
  soutien: 'Soutien',
};

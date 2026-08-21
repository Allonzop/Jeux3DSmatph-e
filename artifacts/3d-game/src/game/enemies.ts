import type { CharacterDef } from './characters/types';
import { enemyDefs } from './characters/defs';

/** Apparences du bestiaire, indexees par id — voir `characters/defs.ts`. */
const APPEARANCE: Record<string, CharacterDef> = Object.fromEntries(
  enemyDefs.map((d) => [d.id, d]),
);

/**
 * Le bestiaire.
 *
 * Avant : un seul monstre, une seule vitesse, une seule ligne droite. Le
 * retour d'evaluation le dit sans detour — « les ennemis se ressemblent tous
 * et se contentent de foncer en ligne droite, ce qui rend le jeu monotone ».
 *
 * Chaque profil ci-dessous change **une** chose au comportement de base, et
 * une seule : c'est ce qui rend chacun reconnaissable et contrable. Un
 * monstre qui serait a la fois rapide, resistant et volant ne se lit pas.
 *
 * ---
 *
 * ## Ajouter un monstre
 *
 * 1. Ajouter une entree a `ENEMY_TYPES` ci-dessous. Tous les champs sont
 *    obligatoires : c'est voulu, une valeur oubliee est un monstre qui se
 *    comporte comme un grognard sans qu'on sache pourquoi.
 * 2. L'inscrire dans `WAVE_ROSTER` a la vague ou il doit apparaitre.
 * 3. C'est tout. `Enemies.tsx` lit ces donnees, rien a y toucher.
 *
 * L'apparence n'est pas ici : elle vit dans `characters/defs.ts`, sous le
 * meme `id`, pour que le studio de personnages puisse l'afficher et la
 * retoucher. `def` la retrouve automatiquement.
 *
 * ## Les multiplicateurs
 *
 * `hp`, `speed` et `breach` multiplient les valeurs de base de la vague
 * (`100 + vague*20` points de vie, 1.5 unite/s, les degats au noyau calcules
 * par `coreBreachDamage`). Un profil a 1.0 partout **est** l'ancien monstre :
 * l'equilibrage d'origine reste la reference, on s'en ecarte volontairement.
 */
export type EnemyKind =
  | 'grognard'
  | 'fileur'
  | 'colosse'
  | 'ecumeur'
  | 'bombeur'
  | 'spectre'
  | 'chaman';

export type EnemyType = {
  kind: EnemyKind;
  name: string;
  /** Une ligne, affichee dans le radar de vague. Ce qu'il faut savoir pour s'adapter. */
  tip: string;
  /** Multiplicateur de points de vie sur la base de la vague. */
  hp: number;
  /** Multiplicateur de vitesse sur les 1.5 unite/s de base. */
  speed: number;
  /** Multiplicateur de degats au noyau. */
  breach: number;
  /** Hauteur de vol. 0 = marche au sol. */
  altitude: number;
  /** Experience gagnee en l'abattant. */
  xp: number;
  /** Couleur de sa barre de vie et de ses eclats de mort. */
  tint: string;
};

/**
 * L'apparence d'un profil : le `CharacterDef` de meme id dans
 * `characters/defs.ts`. Un id sans apparence retombe sur le grognard plutot
 * que de rendre un personnage vide — une cle manquante disparait en silence
 * dans le rig, c'est l'avertissement d'AGENTS.md.
 */
export function enemyAppearance(kind: EnemyKind): CharacterDef {
  return APPEARANCE[kind] ?? APPEARANCE.grognard;
}

export const ENEMY_TYPES: Record<EnemyKind, EnemyType> = {
  // Le monstre d'origine, inchange : c'est l'etalon de l'equilibrage.
  grognard: {
    kind: 'grognard',
    name: 'Grognard',
    tip: 'Fonce droit sur le cristal.',
    hp: 1,
    speed: 1,
    breach: 1,
    altitude: 0,
    xp: 10,
    tint: '#ff4d6d',
  },

  // Deux fois plus rapide, deux fois moins resistant : il passe si on
  // l'ignore, il tombe des qu'on le vise.
  fileur: {
    kind: 'fileur',
    name: 'Fileur',
    tip: 'Deux fois plus rapide, mais fragile.',
    hp: 0.45,
    speed: 2.1,
    breach: 1,
    altitude: 0,
    xp: 14,
    tint: '#ffe066',
  },

  // Lent et epais. Il faut commencer a lui tirer dessus tot, sinon il arrive.
  colosse: {
    kind: 'colosse',
    name: 'Colosse',
    tip: 'Très résistant et lent. Concentrez le feu tôt.',
    hp: 2.6,
    speed: 0.55,
    breach: 1.5,
    altitude: 0,
    xp: 30,
    tint: '#8d99ae',
  },

  // Vole : hors de portee des tourelles au sol, seul le heros et le tesla
  // l'atteignent. Voir `canHit` dans Enemies.tsx.
  ecumeur: {
    kind: 'ecumeur',
    name: 'Écumeur',
    tip: 'Vole : les tourelles au sol ne le touchent pas.',
    hp: 0.75,
    speed: 1.4,
    breach: 1,
    altitude: 2.2,
    xp: 22,
    tint: '#7dd3fc',
  },

  // Degats au noyau presque doubles. Le laisser passer coute cher.
  bombeur: {
    kind: 'bombeur',
    name: 'Bombeur',
    tip: 'Explose au contact : dégâts doublés sur le cristal.',
    hp: 1.1,
    speed: 0.9,
    breach: 1.9,
    altitude: 0,
    xp: 26,
    tint: '#ff7b00',
  },

  // Se dematerialise par intermittence : intouchable une seconde sur trois.
  // Il faut du feu continu, pas un pic.
  spectre: {
    kind: 'spectre',
    name: 'Spectre',
    tip: 'Se dématérialise par à-coups : intouchable par instants.',
    hp: 0.9,
    speed: 1.15,
    breach: 1,
    altitude: 0.4,
    xp: 28,
    tint: '#c77dff',
  },

  // Soigne les monstres autour de lui. Le tuer en premier change la vague.
  chaman: {
    kind: 'chaman',
    name: 'Chaman',
    tip: 'Soigne les monstres proches. À abattre en priorité.',
    hp: 1.3,
    speed: 0.8,
    breach: 1,
    altitude: 0,
    xp: 34,
    tint: '#52b788',
  },
};

/** Rayon de soin du chaman, et points de vie rendus par seconde. */
export const CHAMAN_HEAL_RADIUS = 4.5;
export const CHAMAN_HEAL_PER_SEC = 14;

/**
 * Qui apparait, et a partir de quelle vague.
 *
 * Un profil rejoint le tirage a sa vague d'entree et n'en sort plus. Les
 * poids donnent sa part du peloton : le grognard reste le fond de vague,
 * les profils recents restent minoritaires pour qu'on ait le temps de les
 * apprendre un par un.
 *
 * **Les vagues 1 et 2 sont volontairement 100 % grognards.** C'est le
 * scenario que joue `tools/game-check/wave.mjs --check`, le test de
 * non-regression du coeur du jeu, et c'est aussi le moment ou le joueur
 * apprend les commandes : rien d'exotique avant qu'il ait gagne une fois.
 */
type RosterEntry = { kind: EnemyKind; from: number; weight: number };

const WAVE_ROSTER: RosterEntry[] = [
  { kind: 'grognard', from: 1, weight: 10 },
  { kind: 'fileur', from: 3, weight: 5 },
  { kind: 'colosse', from: 4, weight: 3 },
  { kind: 'ecumeur', from: 5, weight: 4 },
  { kind: 'bombeur', from: 6, weight: 3 },
  { kind: 'spectre', from: 8, weight: 3 },
  { kind: 'chaman', from: 10, weight: 2 },
];

/** Les profils qui peuvent apparaitre a cette vague, dans l'ordre d'entree. */
export function rosterForWave(wave: number): EnemyType[] {
  return WAVE_ROSTER.filter((e) => wave >= e.from).map((e) => ENEMY_TYPES[e.kind]);
}

/**
 * Compose la vague : quel profil pour chacun des `count` monstres.
 *
 * Deterministe a partir de `wave` — deux lancements de la meme vague donnent
 * la meme composition, donc reessayer apres une defaite rejoue bien la meme
 * epreuve, et le radar de vague (`WaveRadar` dans le HUD) peut l'annoncer
 * avant qu'elle ne commence.
 *
 * Le premier monstre est toujours un grognard : la vague s'ouvre sur quelque
 * chose de connu, meme tard dans la partie.
 */
export function composeWave(wave: number, count: number): EnemyKind[] {
  const roster = WAVE_ROSTER.filter((e) => wave >= e.from);
  const total = roster.reduce((sum, e) => sum + e.weight, 0);
  const out: EnemyKind[] = [];

  // Generateur deterministe simple (mulberry32 sur la graine de la vague).
  let seed = wave * 0x9e3779b1;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = 0; i < count; i++) {
    if (i === 0) {
      out.push('grognard');
      continue;
    }
    let pick = rand() * total;
    let chosen: EnemyKind = 'grognard';
    for (const entry of roster) {
      pick -= entry.weight;
      if (pick <= 0) {
        chosen = entry.kind;
        break;
      }
    }
    out.push(chosen);
  }
  return out;
}

/** Recapitulatif « 3 Grognards, 2 Fileurs » pour le radar de vague. */
export function waveSummary(kinds: EnemyKind[]): { type: EnemyType; count: number }[] {
  const counts = new Map<EnemyKind, number>();
  for (const k of kinds) counts.set(k, (counts.get(k) || 0) + 1);
  return [...counts.entries()].map(([kind, count]) => ({ type: ENEMY_TYPES[kind], count }));
}

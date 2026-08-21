import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LEGACY_BUILDING_POSITIONS, ENEMY_SPAWN_RADIUS } from './world';
import {
  coreBreachDamage,
  waveVictoryReward,
  waveDefeatLoss,
  CORE_MAX_LEVEL,
  coreUpgradeCost,
  BUILDINGS,
  MARCHE_LOOT_BONUS,
} from './gamedata';
import { composeWave, ENEMY_TYPES, type EnemyKind } from './enemies';
import { clearableKind, type ClearableKind } from './world';
import { ZONES } from './zones';
import { heroTrack, type HeroTrackId } from './hero';
import { xpForLevel, levelUpReward, XP } from './progress';
import { resetPowers } from './heroPowers';

export type ResourceType = 'boulons' | 'matiere_floue' | 'energie_rire';

export type Resources = {
  boulons: number;
  matiere_floue: number;
  energie_rire: number;
};

export type Enemy = {
  id: string;
  pos: [number, number, number];
  hp: number;
  maxHp: number;
  /** Profil du bestiaire (voir enemies.ts) : vitesse, resistance, vol, degats. */
  kind: EnemyKind;
};

/** Montee de niveau a feter — consommee par l'overlay puis remise a null. */
export type LevelUp = {
  level: number;
  reward: Partial<Resources>;
};

export type WaveOutcome = {
  type: 'victory' | 'defeat';
  wave: number;
  /** resources gained (victory) */
  gains?: Partial<Resources>;
  /** resources lost (defeat) */
  losses?: Partial<Resources>;
};

export type Particle = {
  id: string;
  from: [number, number, number];
  progress: number;
  resource: ResourceType;
};

export interface GameState {
  resources: Resources;
  buildingLevels: Record<string, number>;
  heroPos: [number, number, number];
  heroDir: [number, number];
  coreHp: number;
  coreMaxHp: number;
  waveActive: boolean;
  waveNumber: number;
  /** true after the current waveNumber was lost: the next startWave retries it instead of advancing */
  waveFailed: boolean;
  enemies: Enemy[];
  particles: Particle[];
  selectedBuilding: string | null;
  /** world position of each placed building (absent = not placed yet) */
  buildingPositions: Record<string, [number, number, number]>;
  /** building id currently being placed by tapping the ground */
  placingBuilding: string | null;
  /** guided tutorial step: 0 move, 1 harvest, 2 build, 3 wave, 4 finished toast, 5 done */
  tutorialStep: number;
  /** result of the last finished wave, shown as an outcome toast then cleared */
  lastWaveOutcome: WaveOutcome | null;
  /** dégâts au noyau par monstre qui l'atteint, fixés au lancement de la vague */
  breachDamage: number;
  /** taille de la vague en cours, et nombre de monstres réellement abattus */
  waveEnemyCount: number;
  waveKills: number;

  // ---- Progression du joueur ----
  /** Experience accumulee dans le niveau en cours. */
  xp: number;
  /** Niveau du commandant. Monte en jouant, ne redescend jamais. */
  playerLevel: number;
  /** Derniere montee de niveau, affichee puis effacee. */
  levelUp: LevelUp | null;
  /** Meilleure vague jamais repoussee — le record que le joueur vient battre. */
  bestWave: number;
  /** Monstres abattus depuis le debut de la partie. */
  totalKills: number;
  /** Niveau de renforcement du noyau : chaque niveau encaisse un monstre de plus. */
  coreLevel: number;

  // ---- Deblayage du decor ----
  /** Elements de decor retires par le joueur. Ils ne bloquent plus le placement. */
  clearedDecor: Record<string, true>;
  /** Element de decor selectionne, dont le panneau de deblayage est ouvert. */
  selectedDecor: string | null;

  // ---- Annexion des zones ----
  /** Secteurs de la planete annexes par le joueur. Voir zones.ts. */
  unlockedZones: Record<string, true>;
  /** Secteur dont la fiche d'annexion est ouverte. */
  selectedZone: string | null;

  // ---- Le heros ----
  /** Niveau atteint sur chaque piste d'amelioration. Voir hero.ts. */
  heroUpgrades: Record<string, number>;

  addResources: (res: Partial<Resources>) => void;
  spendResources: (res: Partial<Resources>) => boolean;
  upgradeBuilding: (id: string, cost: Partial<Resources>) => void;
  setHeroPos: (pos: [number, number, number]) => void;
  setHeroDir: (dir: [number, number]) => void;
  selectBuilding: (id: string | null) => void;
  startPlacing: (id: string) => void;
  cancelPlacing: () => void;
  placeBuilding: (id: string, pos: [number, number, number]) => void;
  startWave: () => void;
  damageCore: (amount: number) => void;
  damageEnemy: (id: string, amount: number) => void;
  /** Même chose sur plusieurs monstres, en une seule écriture. */
  damageEnemies: (ids: string[], amount: number) => void;
  removeEnemy: (id: string) => void;
  setEnemyPos: (id: string, pos: [number, number, number]) => void;
  addParticle: (p: Omit<Particle, 'progress' | 'id'>) => void;
  removeParticle: (id: string) => void;
  updateParticles: (delta: number) => void;
  tickPassive: (amounts: Partial<Resources>) => void;
  /** advance the tutorial when the matching player action happens */
  notifyTutorial: (event: 'move' | 'harvest' | 'build' | 'waveEnd') => void;
  advanceTutorial: () => void;
  skipTutorial: () => void;
  clearWaveOutcome: () => void;
  /** Monte d'un cran une piste d'amelioration du heros. */
  upgradeHero: (track: HeroTrackId) => boolean;
  selectZone: (id: string | null) => void;
  /** Annexe un secteur si le niveau et les ressources suivent. */
  unlockZone: (id: string) => boolean;
  selectDecor: (id: string | null) => void;
  /** Retire un element de decor et verse sa recompense. */
  clearDecor: (id: string) => void;
  /** Gagne de l'experience ; declenche une montee de niveau si le seuil est franchi. */
  addXp: (amount: number) => void;
  clearLevelUp: () => void;
  /** Renforce le noyau d'un cran contre des ressources rares. */
  upgradeCore: () => boolean;
  /** Dev/test helper: wipes the save and restarts the whole game from zero. */
  resetGame: () => void;
}

/**
 * Ce que rapporte le deblayage d'un element de decor.
 *
 * Volontairement modeste : c'est une recompense de nettoyage, pas une source
 * de revenu. Le decor ne repousse pas, donc chaque gain est unique — le total
 * de la planete tient dans les cent premieres secondes de production d'une
 * hutte de niveau 2.
 */
export const DECOR_REWARD: Record<ClearableKind, Partial<Resources>> = {
  tree: { boulons: 12 },
  rock: { boulons: 18 },
  bush: { boulons: 6 },
  mush: { boulons: 9 },
  crystal: { boulons: 10, matiere_floue: 2 },
};

/** Nom affiche de chaque famille de decor. */
export const DECOR_LABEL: Record<ClearableKind, string> = {
  tree: 'Arbre',
  rock: 'Rocher',
  bush: 'Buisson',
  mush: 'Champignon géant',
  crystal: 'Géode',
};

export const TUTORIAL_DONE = 5;
// Which player event completes each tutorial step.
const TUTORIAL_EVENTS: Record<number, 'move' | 'harvest' | 'build' | 'waveEnd'> = {
  0: 'move',
  1: 'harvest',
  2: 'build',
  3: 'waveEnd',
};

// Grant the victory reward when a wave just ended with the core still alive.
function rewardVictory(
  set: (partial: Partial<GameState> | ((s: GameState) => Partial<GameState>)) => void,
  get: () => GameState,
) {
  const state = get();
  if (state.coreHp <= 0 || state.waveNumber === 0) return;
  const ratio = state.waveEnemyCount > 0 ? state.waveKills / state.waveEnemyCount : 1;
  // Le Marche majore le butin — c'est ce que promet son `blurb`.
  const lootBonus = 1 + MARCHE_LOOT_BONUS * (state.buildingLevels['marche'] || 0);
  const gains = waveVictoryReward(state.waveNumber, ratio, lootBonus);
  set((s) => ({
    resources: {
      boulons: s.resources.boulons + (gains.boulons || 0),
      matiere_floue: s.resources.matiere_floue + (gains.matiere_floue || 0),
      energie_rire: s.resources.energie_rire + (gains.energie_rire || 0),
    },
    lastWaveOutcome: { type: 'victory', wave: s.waveNumber, gains },
    bestWave: Math.max(s.bestWave, s.waveNumber),
  }));
  get().addXp(XP.wave(state.waveNumber));
}

// Fresh-game snapshot, reused by resetGame. Functions return new arrays/objects
// so a reset never shares references with the previous session.
const initialGameState = () => ({
  resources: { boulons: 50, matiere_floue: 0, energie_rire: 0 },
  // Derive de BUILDINGS : ajouter un batiment a gamedata.ts suffit, il n'y a
  // pas de seconde liste a tenir a jour ici.
  buildingLevels: Object.fromEntries(Object.keys(BUILDINGS).map((id) => [id, 0])) as Record<string, number>,
  heroPos: [0, 0, 0] as [number, number, number],
  heroDir: [0, 0] as [number, number],
  coreHp: 100,
  coreMaxHp: 100,
  waveActive: false,
  waveNumber: 0,
  waveFailed: false,
  enemies: [] as Enemy[],
  particles: [] as GameState['particles'],
  selectedBuilding: null,
  buildingPositions: {} as Record<string, [number, number, number]>,
  placingBuilding: null,
  tutorialStep: 0,
  lastWaveOutcome: null,
  breachDamage: 0,
  waveEnemyCount: 0,
  waveKills: 0,
  xp: 0,
  playerLevel: 1,
  levelUp: null,
  bestWave: 0,
  totalKills: 0,
  coreLevel: 0,
  clearedDecor: {} as Record<string, true>,
  selectedDecor: null,
  unlockedZones: {} as Record<string, true>,
  selectedZone: null,
  heroUpgrades: {} as Record<string, number>,
});

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialGameState(),

      addResources: (res) =>
        set((state) => ({
          resources: {
            boulons: state.resources.boulons + (res.boulons || 0),
            matiere_floue: state.resources.matiere_floue + (res.matiere_floue || 0),
            energie_rire: state.resources.energie_rire + (res.energie_rire || 0),
          },
        })),

      spendResources: (res) => {
        const state = get();
        const canAfford =
          state.resources.boulons >= (res.boulons || 0) &&
          state.resources.matiere_floue >= (res.matiere_floue || 0) &&
          state.resources.energie_rire >= (res.energie_rire || 0);

        if (canAfford) {
          set((state) => ({
            resources: {
              boulons: state.resources.boulons - (res.boulons || 0),
              matiere_floue: state.resources.matiere_floue - (res.matiere_floue || 0),
              energie_rire: state.resources.energie_rire - (res.energie_rire || 0),
            },
          }));
          return true;
        }
        return false;
      },

      upgradeBuilding: (id, cost) => {
        const spent = get().spendResources(cost);
        if (spent) {
          set((state) => ({
            buildingLevels: {
              ...state.buildingLevels,
              [id]: (state.buildingLevels[id] || 0) + 1,
            },
          }));
          get().notifyTutorial('build');
          get().addXp(XP.build);
        }
      },

      setHeroPos: (pos) => set({ heroPos: pos }),
      setHeroDir: (dir) => set({ heroDir: dir }),
      selectBuilding: (id) => set({ selectedBuilding: id }),

      startPlacing: (id) => set({ placingBuilding: id, selectedBuilding: null }),
      cancelPlacing: () => set({ placingBuilding: null }),
      placeBuilding: (id, pos) =>
        set((state) => ({
          buildingPositions: { ...state.buildingPositions, [id]: pos },
          placingBuilding: null,
          // Open the build popup right away so the player can construct it.
          selectedBuilding: id,
        })),

      startWave: () => {
        const state = get();
        if (state.waveActive) return;

        // A lost wave keeps its index: the player retries it, never skips
        // ahead to a harder one just for having failed.
        const nextWave = state.waveFailed ? state.waveNumber : state.waveNumber + 1;
        // Une seule formule linéaire : +2 monstres à chaque vague (3, 5, 7, 9…).
        // L'ancienne version passait par des cas spéciaux pour les vagues 1 et
        // 2 (3 puis 5) avant de basculer sur `5 + nextWave * 2` à partir de la
        // vague 3, ce qui produisait un bond de 5 à 11 monstres — un mur
        // infranchissable signalé dans BACKLOG.md. `1 + nextWave * 2` retombe
        // exactement sur 3 et 5 pour les deux premières vagues sans cas
        // particulier, et continue la même progression sans à-coup ensuite.
        const enemyCount = 1 + nextWave * 2;

        // Qui compose la vague — voir enemies.ts. Les vagues 1 et 2 restent
        // 100 % grognards, donc l'equilibrage d'origine et le test de
        // non-regression (`wave.mjs --check`) jouent exactement la meme chose
        // qu'avant. La variete arrive ensuite, un profil a la fois.
        const kinds = composeWave(nextWave, enemyCount);
        const baseHp = 100 + nextWave * 20;

        const newEnemies: Enemy[] = [];
        for (let i = 0; i < enemyCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = ENEMY_SPAWN_RADIUS;
          const kind = kinds[i];
          const hp = Math.round(baseHp * ENEMY_TYPES[kind].hp);
          newEnemies.push({
            id: `enemy_${nextWave}_${i}_${Math.random()}`,
            pos: [Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius],
            hp,
            maxHp: hp,
            kind,
          });
        }

        // The core is fully repaired before each wave (rule shown in the HUD).
        set({
          waveActive: true,
          waveNumber: nextWave,
          waveFailed: false,
          enemies: newEnemies,
          coreHp: state.coreMaxHp,
          lastWaveOutcome: null,
          breachDamage: coreBreachDamage(enemyCount, state.coreMaxHp, state.coreLevel),
          waveEnemyCount: enemyCount,
          waveKills: 0,
        });
      },

      damageCore: (amount) => {
        const wasActive = get().waveActive;
        set((state) => {
          const newHp = Math.max(0, state.coreHp - amount);
          if (newHp === 0 && state.waveActive) {
            // Wave failed: lose a share of current resources.
            const losses = waveDefeatLoss(state.resources);
            return {
              coreHp: 0,
              waveActive: false,
              waveFailed: true,
              enemies: [],
              resources: {
                boulons: state.resources.boulons - (losses.boulons || 0),
                matiere_floue: state.resources.matiere_floue - (losses.matiere_floue || 0),
                energie_rire: state.resources.energie_rire - (losses.energie_rire || 0),
              },
              lastWaveOutcome: { type: 'defeat', wave: state.waveNumber, losses },
            };
          }
          return { coreHp: newHp };
        });
        if (wasActive && !get().waveActive) get().notifyTutorial('waveEnd');
      },

      damageEnemy: (id, amount) => {
        const wasActive = get().waveActive;
        // Le monstre est relu avant et apres l'ecriture : TypeScript ne suit
        // pas les affectations faites dans le rappel de `set`, et une variable
        // capturee y serait vue comme toujours nulle.
        const before = get().enemies.find(e => e.id === id);
        set((state) => {
          let justKilled = false;
          const enemies = state.enemies.map(e => {
            if (e.id === id) {
              const hp = Math.max(0, e.hp - amount);
              if (hp === 0 && e.hp > 0) justKilled = true;
              return { ...e, hp };
            }
            return e;
          });
          // Le monstre reste dans `enemies` à 0 pv : `EnemyNode` (Enemies.tsx)
          // joue son animation de mort puis se retire lui-même via
          // `removeEnemy`. Le filtrer ici démonterait le composant avant que
          // l'animation ait pu jouer.
          const waveActive = enemies.some(e => e.hp > 0);
          return {
            enemies,
            waveActive: state.waveActive ? waveActive : false,
            waveKills: state.waveKills + (justKilled ? 1 : 0),
            totalKills: state.totalKills + (justKilled ? 1 : 0),
          };
        });
        // L'experience est versee hors du `set` : `addXp` peut declencher une
        // montee de niveau, donc son propre `set`, et imbriquer les deux
        // rendrait l'ordre des ecritures dependant de zustand.
        const after = get().enemies.find(e => e.id === id);
        if (before && before.hp > 0 && after && after.hp <= 0) {
          get().addXp(ENEMY_TYPES[before.kind]?.xp ?? ENEMY_TYPES.grognard.xp);
        }
        if (wasActive && !get().waveActive) {
          get().notifyTutorial('waveEnd');
          rewardVictory(set, get);
        }
      },

      /**
       * Dégâts de zone : mortier, cryo-diffuseur.
       *
       * Appeler `damageEnemy` en boucle marchait, mais chaque appel remplace
       * le tableau `enemies` du magasin, donc re-rend tout l'arbre des
       * monstres. Un cryo qui couvre vingt monstres produisait quatre-vingts
       * rendus complets par seconde — exactement ce que proscrit
       * `.agents/memory/r3f-game-perf.md`. Une seule passe, une seule
       * écriture, la même expérience versée.
       */
      damageEnemies: (ids, amount) => {
        if (ids.length === 0 || amount <= 0) return;
        const wasActive = get().waveActive;
        const targets = new Set(ids);
        const killed: EnemyKind[] = [];

        set((state) => {
          const enemies = state.enemies.map((e) => {
            if (!targets.has(e.id) || e.hp <= 0) return e;
            const hp = Math.max(0, e.hp - amount);
            if (hp === 0) killed.push(e.kind);
            return { ...e, hp };
          });
          const waveActive = enemies.some((e) => e.hp > 0);
          return {
            enemies,
            waveActive: state.waveActive ? waveActive : false,
            waveKills: state.waveKills + killed.length,
            totalKills: state.totalKills + killed.length,
          };
        });

        for (const kind of killed) {
          get().addXp(ENEMY_TYPES[kind]?.xp ?? ENEMY_TYPES.grognard.xp);
        }
        if (wasActive && !get().waveActive) {
          get().notifyTutorial('waveEnd');
          rewardVictory(set, get);
        }
      },

      removeEnemy: (id) => {
        const wasActive = get().waveActive;
        set((state) => {
          const enemies = state.enemies.filter((e) => e.id !== id);
          const waveActive = enemies.length > 0;
          return { enemies, waveActive: state.waveActive ? waveActive : false };
        });
        if (wasActive && !get().waveActive) {
          get().notifyTutorial('waveEnd');
          rewardVictory(set, get);
        }
      },

      setEnemyPos: (id, pos) => {
        set((state) => ({
          enemies: state.enemies.map(e => e.id === id ? { ...e, pos } : e)
        }));
      },

      addParticle: (p) => {
        set((state) => ({
          particles: [
            ...state.particles,
            { ...p, id: `p_${Math.random()}`, progress: 0 },
          ],
        }));
      },

      removeParticle: (id) => {
        set((state) => ({
          particles: state.particles.filter((p) => p.id !== id),
        }));
      },
      
      updateParticles: (delta) => {
        set((state) => {
          const speed = 2 * delta; // 0 to 1 in 0.5 seconds
          const newParticles = state.particles.map(p => ({
            ...p,
            progress: p.progress + speed
          })).filter(p => p.progress < 1);
          return { particles: newParticles };
        });
      },

      tickPassive: (amounts) => {
        get().addResources(amounts);
      },

      notifyTutorial: (event) => {
        const step = get().tutorialStep;
        if (step >= TUTORIAL_DONE) return;
        // Never count a wave end before any wave has actually been launched.
        if (event === 'waveEnd' && get().waveNumber === 0) return;
        if (TUTORIAL_EVENTS[step] === event) {
          set({ tutorialStep: step + 1 });
        }
      },
      advanceTutorial: () => {
        const step = get().tutorialStep;
        if (step < TUTORIAL_DONE) set({ tutorialStep: step + 1 });
      },
      skipTutorial: () => set({ tutorialStep: TUTORIAL_DONE }),
      clearWaveOutcome: () => set({ lastWaveOutcome: null }),

      upgradeHero: (trackId) => {
        const track = heroTrack(trackId);
        const level = get().heroUpgrades[trackId] || 0;
        if (level >= track.maxLevel) return false;
        if (!get().spendResources(track.cost(level))) return false;
        set((s2) => ({
          heroUpgrades: { ...s2.heroUpgrades, [trackId]: level + 1 },
        }));
        get().addXp(XP.heroUpgrade);
        return true;
      },

      selectZone: (id) => set({ selectedZone: id }),

      unlockZone: (id) => {
        const state = get();
        if (state.unlockedZones[id]) return false;
        const zone = ZONES.find((z) => z.id === id);
        if (!zone) return false;
        if (state.playerLevel < zone.requiredLevel) return false;
        if (!get().spendResources(zone.cost)) return false;
        set((s2) => ({
          unlockedZones: { ...s2.unlockedZones, [id]: true as const },
          selectedZone: null,
        }));
        get().addXp(XP.unlockZone);
        return true;
      },

      selectDecor: (id) => set({ selectedDecor: id }),

      clearDecor: (id) => {
        if (get().clearedDecor[id]) return;
        const kind = clearableKind(id);
        if (!kind) return;
        const reward = DECOR_REWARD[kind];
        set((state) => ({
          clearedDecor: { ...state.clearedDecor, [id]: true as const },
          selectedDecor: null,
          resources: {
            boulons: state.resources.boulons + (reward.boulons || 0),
            matiere_floue: state.resources.matiere_floue + (reward.matiere_floue || 0),
            energie_rire: state.resources.energie_rire + (reward.energie_rire || 0),
          },
        }));
        get().addXp(XP.clearDecor);
      },

      addXp: (amount) => {
        if (amount <= 0) return;
        const state = get();
        let xp = state.xp + amount;
        let level = state.playerLevel;
        let gained = 0;
        const reward: Resources = { boulons: 0, matiere_floue: 0, energie_rire: 0 };

        // Boucle : un gros gain peut franchir deux paliers d'un coup, surtout
        // aux premiers niveaux ou le seuil est bas.
        while (xp >= xpForLevel(level)) {
          xp -= xpForLevel(level);
          level += 1;
          gained += 1;
          const r = levelUpReward(level);
          reward.boulons += r.boulons || 0;
          reward.matiere_floue += r.matiere_floue || 0;
          reward.energie_rire += r.energie_rire || 0;
        }

        if (gained === 0) {
          set({ xp });
          return;
        }

        // Les ressources a zero ne sont pas listees dans la carte de montee de
        // niveau : « +0 energie de rire » n'apprend rien.
        const shown: Partial<Resources> = { boulons: reward.boulons };
        if (reward.matiere_floue > 0) shown.matiere_floue = reward.matiere_floue;
        if (reward.energie_rire > 0) shown.energie_rire = reward.energie_rire;

        set((s) => ({
          xp,
          playerLevel: level,
          levelUp: { level, reward: shown },
          resources: {
            boulons: s.resources.boulons + reward.boulons,
            matiere_floue: s.resources.matiere_floue + reward.matiere_floue,
            energie_rire: s.resources.energie_rire + reward.energie_rire,
          },
        }));
      },

      clearLevelUp: () => set({ levelUp: null }),

      upgradeCore: () => {
        const state = get();
        if (state.coreLevel >= CORE_MAX_LEVEL) return false;
        const cost = coreUpgradeCost(state.coreLevel);
        if (!get().spendResources(cost)) return false;
        set((s) => ({ coreLevel: s.coreLevel + 1 }));
        get().addXp(XP.coreUpgrade);
        return true;
      },
      resetGame: () => {
        set(initialGameState());
        resetPowers();
        // Wipe the save so a page reload also starts fresh.
        useGameStore.persist.clearStorage();
      },
    }),
    {
      name: 'village-spatial-storage',
      version: 2,
      partialize: (state) => ({
        resources: state.resources,
        buildingLevels: state.buildingLevels,
        buildingPositions: state.buildingPositions,
        tutorialStep: state.tutorialStep,
        // La progression survit a la fermeture de l'onglet — c'est tout
        // l'interet d'un niveau. Les sauvegardes anterieures n'ont aucun de
        // ces champs : zustand garde alors la valeur initiale, sans migration.
        xp: state.xp,
        playerLevel: state.playerLevel,
        bestWave: state.bestWave,
        totalKills: state.totalKills,
        coreLevel: state.coreLevel,
        clearedDecor: state.clearedDecor,
        unlockedZones: state.unlockedZones,
        heroUpgrades: state.heroUpgrades,
      }),
      migrate: (persisted: any, version) => {
        if (version < 2 && persisted) {
          // Old saves had fixed building spots: keep already-built buildings
          // at their legacy positions; unbuilt ones become freely placeable.
          const positions: Record<string, [number, number, number]> = {};
          const levels: Record<string, number> = persisted.buildingLevels || {};
          for (const [id, level] of Object.entries(levels)) {
            if ((level as number) > 0 && LEGACY_BUILDING_POSITIONS[id]) {
              positions[id] = LEGACY_BUILDING_POSITIONS[id];
            }
          }
          persisted.buildingPositions = positions;
        }
        return persisted;
      },
    }
  )
);

/**
 * Le magasin, accessible depuis la page.
 *
 * `tools/game-check/*.mjs` pilote le jeu construit dans un vrai navigateur :
 * il n'a aucun moyen d'importer ce module, et la sauvegarde ne porte que
 * quatre champs (voir `partialize`). Sans cette poignee, impossible de
 * *regarder* une vague tardive — donc impossible de verifier a l'oeil les
 * profils de monstres qui n'apparaissent qu'a partir de la vague 8.
 *
 * C'est un jeu entierement local, sans serveur ni compte : exposer son etat ne
 * donne au joueur que ce qu'il pourrait deja editer dans son localStorage.
 */
declare global {
  interface Window {
    __villageStore?: typeof useGameStore;
  }
}

if (typeof window !== 'undefined') {
  window.__villageStore = useGameStore;
}

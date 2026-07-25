import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  enemies: Enemy[];
  particles: Particle[];
  selectedBuilding: string | null;

  addResources: (res: Partial<Resources>) => void;
  spendResources: (res: Partial<Resources>) => boolean;
  upgradeBuilding: (id: string, cost: Partial<Resources>) => void;
  setHeroPos: (pos: [number, number, number]) => void;
  setHeroDir: (dir: [number, number]) => void;
  selectBuilding: (id: string | null) => void;
  startWave: () => void;
  damageCore: (amount: number) => void;
  damageEnemy: (id: string, amount: number) => void;
  removeEnemy: (id: string) => void;
  setEnemyPos: (id: string, pos: [number, number, number]) => void;
  addParticle: (p: Omit<Particle, 'progress' | 'id'>) => void;
  removeParticle: (id: string) => void;
  updateParticles: (delta: number) => void;
  tickPassive: (amounts: Partial<Resources>) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      resources: { boulons: 50, matiere_floue: 0, energie_rire: 0 },
      buildingLevels: { hutte: 0, ferme: 0, bar: 0, antenne: 0, marche: 0, tourelle: 0 },
      heroPos: [0, 0, 0],
      heroDir: [0, 0],
      coreHp: 100,
      coreMaxHp: 100,
      waveActive: false,
      waveNumber: 0,
      enemies: [],
      particles: [],
      selectedBuilding: null,

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
        }
      },

      setHeroPos: (pos) => set({ heroPos: pos }),
      setHeroDir: (dir) => set({ heroDir: dir }),
      selectBuilding: (id) => set({ selectedBuilding: id }),

      startWave: () => {
        const state = get();
        if (state.waveActive) return;

        const nextWave = state.waveNumber + 1;
        const enemyCount = nextWave === 1 ? 3 : nextWave === 2 ? 5 : 5 + nextWave * 2;
        
        const newEnemies: Enemy[] = [];
        for (let i = 0; i < enemyCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 9;
          newEnemies.push({
            id: `enemy_${nextWave}_${i}_${Math.random()}`,
            pos: [Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius],
            hp: 100 + nextWave * 20,
            maxHp: 100 + nextWave * 20,
          });
        }

        set({ waveActive: true, waveNumber: nextWave, enemies: newEnemies, coreHp: state.coreMaxHp });
      },

      damageCore: (amount) => {
        set((state) => {
          const newHp = Math.max(0, state.coreHp - amount);
          if (newHp === 0) {
            return { coreHp: 0, waveActive: false, enemies: [] }; // Wave failed
          }
          return { coreHp: newHp };
        });
      },

      damageEnemy: (id, amount) => {
        set((state) => {
          const enemies = state.enemies.map(e => {
            if (e.id === id) {
              return { ...e, hp: Math.max(0, e.hp - amount) };
            }
            return e;
          });
          const livingEnemies = enemies.filter(e => e.hp > 0);
          const waveActive = livingEnemies.length > 0;
          return { 
            enemies: livingEnemies,
            waveActive: state.waveActive ? waveActive : false,
          };
        });
      },

      removeEnemy: (id) => {
        set((state) => {
          const enemies = state.enemies.filter((e) => e.id !== id);
          const waveActive = enemies.length > 0;
          return { enemies, waveActive: state.waveActive ? waveActive : false };
        });
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
    }),
    {
      name: 'village-spatial-storage',
      partialize: (state) => ({
        resources: state.resources,
        buildingLevels: state.buildingLevels,
      }),
    }
  )
);
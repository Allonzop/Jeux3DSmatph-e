import React from 'react';
import { useGameStore, ResourceType } from '../store';
import { BUILDINGS } from '../gamedata';
import { ResourceIcon, BuildingIcon, CloseIcon, MoveIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

function PassiveYield({ passive }: { passive: Partial<Record<string, number>> }) {
  const entries = Object.entries(passive).filter(([, val]) => val !== undefined);
  if (entries.length === 0) return <span className="text-white/40">—</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {entries.map(([key, val]) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          +{val}
          <ResourceIcon type={key as ResourceType} className="w-4 h-4 shrink-0" />
          <span className="text-white/50 text-xs">/sec</span>
        </span>
      ))}
    </span>
  );
}

export function BuildingPopup() {
  const selectedBuilding = useGameStore(state => state.selectedBuilding);
  const selectBuilding = useGameStore(state => state.selectBuilding);
  const buildingLevels = useGameStore(state => state.buildingLevels);
  const upgradeBuilding = useGameStore(state => state.upgradeBuilding);
  const resources = useGameStore(state => state.resources);
  const startPlacing = useGameStore(state => state.startPlacing);

  if (!selectedBuilding) return null;

  const data = BUILDINGS[selectedBuilding];
  const level = buildingLevels[selectedBuilding] || 0;
  const isMax = level >= data.maxLevel;
  
  const nextLevelData = !isMax ? data.levels[level] : null;
  const currentLevelData = level > 0 ? data.levels[level - 1] : null;

  let canAfford = false;
  if (nextLevelData) {
    canAfford = 
      resources.boulons >= (nextLevelData.cost.boulons || 0) &&
      resources.matiere_floue >= (nextLevelData.cost.matiere_floue || 0) &&
      resources.energie_rire >= (nextLevelData.cost.energie_rire || 0);
  }

  return (
    <AnimatePresence>
      <div
        className="absolute inset-0 pointer-events-auto flex items-center justify-center bg-black/60 backdrop-blur-sm z-50"
        style={{
          padding: '1rem',
          paddingTop: 'calc(1rem + var(--safe-top))',
          paddingBottom: 'calc(1rem + var(--safe-bottom))',
          paddingLeft: 'calc(1rem + var(--safe-left))',
          paddingRight: 'calc(1rem + var(--safe-right))',
        }}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[#1e2336] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-full"
          style={{ boxShadow: `0 0 40px ${data.color}33` }}
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-white/10" style={{ backgroundColor: `${data.color}22` }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center shadow-inner border border-white/5">
                <BuildingIcon id={data.id} className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">{data.name}</h2>
                <div className="text-sm font-medium" style={{ color: data.color }}>
                  Level {level} <span className="text-white/30">/ {data.maxLevel}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => startPlacing(selectedBuilding)}
                title="Déplacer ce bâtiment"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                <MoveIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => selectBuilding(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col gap-6">
            
            {/* Current Stats */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
              <div className="text-xs uppercase tracking-wider text-white/40 mb-2">Current Production</div>
              <div className="text-white font-medium">
                <PassiveYield passive={currentLevelData?.passive || {}} />
              </div>
              {data.id === 'tourelle' && level > 0 && (
                <div className="text-cyan-400 font-medium text-sm mt-1">Fires beam dealing 50 dmg/sec</div>
              )}
            </div>

            {/* Upgrade Section */}
            {!isMax ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm uppercase tracking-wider text-white/40">Next Level Cost</div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {Object.entries(nextLevelData!.cost).map(([key, val]) => {
                    const have = resources[key as ResourceType];
                    const enough = have >= val;
                    return (
                      <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${enough ? 'bg-white/5 border-white/10' : 'bg-red-500/10 border-red-500/30'}`}>
                        <ResourceIcon type={key as ResourceType} className="w-4 h-4 shrink-0" />
                        <span className={`font-mono font-bold ${enough ? 'text-white' : 'text-red-400'}`}>
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-sm bg-blue-500/10 text-blue-300 p-3 rounded-xl border border-blue-500/20">
                  <span className="font-bold uppercase text-xs mr-2">New Yield:</span> 
                  <PassiveYield passive={nextLevelData!.passive || {}} />
                  {data.id === 'tourelle' && (
                    <span>(Increased fire rate / range implicit)</span>
                  )}
                </div>

                <button
                  disabled={!canAfford}
                  onClick={() => upgradeBuilding(selectedBuilding, nextLevelData!.cost)}
                  className={`mt-2 py-3 px-6 rounded-xl font-bold uppercase tracking-wider transition-all
                    ${canAfford 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_0_#1e3a8a] active:translate-y-1 active:shadow-[0_0px_0_#1e3a8a] hover:brightness-110' 
                      : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                    }
                  `}
                >
                  {canAfford ? (level === 0 ? 'Build' : 'Upgrade') : 'Not enough resources'}
                </button>
              </div>
            ) : (
              <div className="py-8 text-center flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-transparent to-black/20 rounded-xl">
                <ResourceIcon type="energie_rire" className="w-10 h-10" />
                <div className="text-amber-400 font-bold uppercase tracking-widest">Maximum Level Reached</div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

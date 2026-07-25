import React, { useEffect, useState } from 'react';
import { useGameStore, ResourceType } from '../store';
import { BUILDINGS } from '../gamedata';
import { BuildingPopup } from './BuildingPopup';
import { motion, AnimatePresence } from 'framer-motion';

export function HUD() {
  const waveActive = useGameStore(state => state.waveActive);
  const waveNumber = useGameStore(state => state.waveNumber);
  const coreHp = useGameStore(state => state.coreHp);
  const coreMaxHp = useGameStore(state => state.coreMaxHp);
  const startWave = useGameStore(state => state.startWave);
  const selectBuilding = useGameStore(state => state.selectBuilding);
  const buildingLevels = useGameStore(state => state.buildingLevels);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col justify-between overflow-hidden">
      {/* Top Bar */}
      <div 
        className="flex items-start justify-center gap-4 p-4"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
      >
        <ResourcePill type="boulons" icon="🔩" color="#c9c9c9" />
        <ResourcePill type="matiere_floue" icon="🌀" color="#8e5ce8" />
        <ResourcePill type="energie_rire" icon="😄" color="#ffd24c" />
      </div>

      {/* Bottom Area */}
      <div className="flex justify-between items-end p-4 pointer-events-none" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
        
        {/* Empty left space for Joystick to breathe */}
        <div className="w-[150px]" />

        {/* Center Building Chips */}
        <div className="flex gap-2 bg-black/40 backdrop-blur-md p-2 rounded-2xl pointer-events-auto border border-white/10 mx-auto">
          {Object.values(BUILDINGS).map(b => (
            <button
              key={b.id}
              onClick={() => selectBuilding(b.id)}
              className="w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-white/10 active:scale-95 transition-all border border-white/5 relative"
            >
              <span className="text-xl leading-none drop-shadow-md">{b.icon}</span>
              <div className="flex gap-[2px]">
                {Array.from({ length: b.maxLevel }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 h-1.5 rounded-full ${i < (buildingLevels[b.id] || 0) ? 'bg-white shadow-[0_0_4px_#fff]' : 'bg-white/20'}`}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Right Action / Wave Status */}
        <div className="w-[150px] flex justify-end pointer-events-auto">
          <AnimatePresence mode="wait">
            {!waveActive ? (
              <motion.button
                key="launch"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={startWave}
                className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold py-3 px-5 rounded-xl shadow-[0_4px_0_#b45309,0_0_20px_rgba(245,158,11,0.5)] active:translate-y-1 active:shadow-[0_0px_0_#b45309,0_0_10px_rgba(245,158,11,0.5)] transition-all uppercase tracking-wider text-sm whitespace-nowrap"
              >
                Launch Wave
              </motion.button>
            ) : (
              <motion.div
                key="status"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-red-500/30 flex flex-col items-end gap-2 w-40"
              >
                <span className="text-red-400 font-bold uppercase tracking-wider text-xs">
                  Wave {waveNumber}
                </span>
                <div className="w-full bg-black/50 rounded-full h-3 border border-black overflow-hidden relative">
                  <motion.div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 to-red-400"
                    initial={{ width: '100%' }}
                    animate={{ width: `${(coreHp / coreMaxHp) * 100}%` }}
                    transition={{ type: 'spring', bounce: 0 }}
                  />
                </div>
                <span className="text-white text-xs font-mono">{Math.ceil(coreHp)} / {coreMaxHp}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <BuildingPopup />
    </div>
  );
}

function ResourcePill({ type, icon, color }: { type: ResourceType, icon: string, color: string }) {
  const amount = useGameStore(state => state.resources[type]);
  const [bump, setBump] = useState(false);
  const [displayAmount, setDisplayAmount] = useState(amount);

  useEffect(() => {
    if (Math.floor(amount) > Math.floor(displayAmount)) {
      setBump(true);
      const timer = setTimeout(() => setBump(false), 200);
      setDisplayAmount(amount);
      return () => clearTimeout(timer);
    }
    setDisplayAmount(amount);
    return undefined;
  }, [amount, displayAmount]);

  return (
    <div 
      className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1f3599] backdrop-blur-md border border-white/10"
      style={{ boxShadow: `0 0 10px ${color}33, inset 0 0 5px ${color}33`, borderColor: `${color}66` }}
    >
      <span className="text-xl drop-shadow-md">{icon}</span>
      <motion.span 
        animate={bump ? { scale: 1.3, color: '#ffffff' } : { scale: 1, color: '#f8fafc' }}
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        className="font-mono font-bold text-lg min-w-[3ch]"
      >
        {Math.floor(amount)}
      </motion.span>
    </div>
  );
}

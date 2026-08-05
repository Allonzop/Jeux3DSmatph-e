import React, { useEffect, useState } from 'react';
import { useGameStore, ResourceType } from '../store';
import { BUILDINGS } from '../gamedata';
import { BuildingPopup } from './BuildingPopup';
import { Tutorial } from './Tutorial';
import { ResourceIcon, BuildingIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

export function HUD() {
  const waveActive = useGameStore(state => state.waveActive);
  const waveNumber = useGameStore(state => state.waveNumber);
  const coreHp = useGameStore(state => state.coreHp);
  const coreMaxHp = useGameStore(state => state.coreMaxHp);
  const startWave = useGameStore(state => state.startWave);
  const selectBuilding = useGameStore(state => state.selectBuilding);
  const buildingLevels = useGameStore(state => state.buildingLevels);
  const buildingPositions = useGameStore(state => state.buildingPositions);
  const placingBuilding = useGameStore(state => state.placingBuilding);
  const startPlacing = useGameStore(state => state.startPlacing);
  const cancelPlacing = useGameStore(state => state.cancelPlacing);
  const tutorialStep = useGameStore(state => state.tutorialStep);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col justify-between overflow-hidden">
      {/* Top Bar — resource pills */}
      <div
        className="flex items-start justify-center flex-wrap gap-[clamp(0.375rem,1.5vw,1rem)]"
        style={{
          paddingTop: 'calc(0.75rem + var(--safe-top))',
          paddingLeft: 'calc(0.75rem + var(--safe-left))',
          paddingRight: 'calc(0.75rem + var(--safe-right))',
        }}
      >
        <ResourcePill type="boulons" color="#c9c9c9" />
        <ResourcePill type="matiere_floue" color="#8e5ce8" />
        <ResourcePill type="energie_rire" color="#ffd24c" />
      </div>

      {/* Placement mode banner */}
      <AnimatePresence>
        {placingBuilding && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
            style={{ top: 'calc(4.5rem + var(--safe-top))' }}
          >
            <div className="bg-black/70 backdrop-blur-md border border-white/15 rounded-xl px-4 py-2 text-white text-[clamp(0.75rem,3vw,0.875rem)] font-bold text-center whitespace-nowrap">
              Touchez le sol pour placer&nbsp;: {BUILDINGS[placingBuilding]?.name}
            </div>
            <button
              onClick={cancelPlacing}
              className="pointer-events-auto bg-red-500/80 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl border border-red-300/30"
            >
              Annuler
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Area — wave button above, build chips below, everything inside safe areas */}
      <div
        className="flex flex-col items-center gap-2"
        style={{
          paddingBottom: 'calc(0.75rem + var(--safe-bottom))',
          paddingLeft: 'calc(0.75rem + var(--safe-left))',
          paddingRight: 'calc(0.75rem + var(--safe-right))',
        }}
      >
        {/* Wave action / status */}
        <div className="w-full flex justify-end">
          <AnimatePresence mode="wait">
            {!waveActive ? (
              <motion.button
                key="launch"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={startWave}
                className="pointer-events-auto bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold py-2.5 px-4 rounded-xl shadow-[0_4px_0_#b45309,0_0_20px_rgba(245,158,11,0.5)] active:translate-y-1 active:shadow-[0_0px_0_#b45309,0_0_10px_rgba(245,158,11,0.5)] transition-all uppercase tracking-wider text-[clamp(0.7rem,3vw,0.875rem)] whitespace-nowrap"
              >
                Lancer la vague
              </motion.button>
            ) : (
              <motion.div
                key="status"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="pointer-events-auto bg-black/60 backdrop-blur-md rounded-xl p-3 border border-red-500/30 flex flex-col items-end gap-2 w-[min(10rem,40vw)]"
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

        {/* Building Chips — sized with clamp() so all 6 always fit on-screen */}
        <div className="flex max-w-full gap-[clamp(0.25rem,1.2vw,0.5rem)] bg-black/40 backdrop-blur-md p-[clamp(0.375rem,1.2vw,0.5rem)] rounded-2xl pointer-events-auto border border-white/10">
          {Object.values(BUILDINGS).map(b => (
            <button
              key={b.id}
              onClick={() => {
                if (buildingPositions[b.id]) {
                  selectBuilding(b.id);
                } else if (placingBuilding === b.id) {
                  cancelPlacing();
                } else {
                  startPlacing(b.id);
                }
              }}
              className={`w-[clamp(2.5rem,12vw,3rem)] aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 bg-white/5 hover:bg-white/10 active:scale-95 transition-all border relative shrink-0 ${
                tutorialStep === 2 && b.id === 'hutte'
                  ? 'border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-pulse'
                  : 'border-white/5'
              }`}
            >
              <BuildingIcon id={b.id} className="w-[58%] h-[58%] drop-shadow-md" />
              <div className="flex gap-[2px]">
                {Array.from({ length: b.maxLevel }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 h-1 rounded-full ${i < (buildingLevels[b.id] || 0) ? 'bg-white shadow-[0_0_4px_#fff]' : 'bg-white/20'}`}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tutorial overlay (hidden while placing a building so banners don't overlap) */}
      {!placingBuilding && <Tutorial />}

      <BuildingPopup />
    </div>
  );
}

function ResourcePill({ type, color }: { type: ResourceType; color: string }) {
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
      className="pointer-events-auto flex items-center gap-1.5 px-[clamp(0.625rem,2.5vw,1rem)] py-1.5 rounded-full bg-[#1a1f3599] backdrop-blur-md border border-white/10"
      style={{ boxShadow: `0 0 10px ${color}33, inset 0 0 5px ${color}33`, borderColor: `${color}66` }}
    >
      <ResourceIcon type={type} className="w-[clamp(1.05rem,4vw,1.35rem)] h-[clamp(1.05rem,4vw,1.35rem)] drop-shadow-md shrink-0" />
      <motion.span
        animate={bump ? { scale: 1.3, color: '#ffffff' } : { scale: 1, color: '#f8fafc' }}
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        className="font-mono font-bold text-[clamp(0.875rem,3.5vw,1.125rem)] min-w-[3ch]"
      >
        {Math.floor(amount)}
      </motion.span>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore, ResourceType } from '../store';
import { buildingData } from '../gamedata';
import { nextObjective } from '../objectives';
import { BuildingPopup } from './BuildingPopup';
import { BuildSheet } from './BuildSheet';
import { Tutorial } from './Tutorial';
import { WaveOutcome } from './WaveOutcome';
import { WaveRadar } from './WaveRadar';
import { XpBar } from './XpBar';
import { ComboMeter } from './ComboMeter';
import { LevelUp } from './LevelUp';
import { Popups } from './Popups';
import { ThreatMarkers } from './ThreatMarkers';
import { ResourceIcon, HammerIcon, SpeakerIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { sfx, isMuted, toggleMute } from '../sfx';

/**
 * L'interface.
 *
 * Elle a ete redecoupee : haut = qui je suis et ce que j'ai, milieu = ce qu'on
 * me demande, bas = ce que je peux faire. Avant, les neuf pastilles de
 * construction et le bouton de vague se partageaient la meme rangee, sans que
 * rien ne dise quoi faire ni pourquoi.
 *
 * Tout est en `clamp()` : le jeu vise un telephone de 390 px de large, et
 * chaque element doit tenir sans deborder ni sur un iPhone SE ni sur une
 * tablette.
 */
export function HUD() {
  const waveActive = useGameStore(state => state.waveActive);
  const waveNumber = useGameStore(state => state.waveNumber);
  const waveKills = useGameStore(state => state.waveKills);
  const waveEnemyCount = useGameStore(state => state.waveEnemyCount);
  const waveFailed = useGameStore(state => state.waveFailed);
  const coreHp = useGameStore(state => state.coreHp);
  const coreMaxHp = useGameStore(state => state.coreMaxHp);
  const startWave = useGameStore(state => state.startWave);
  const placingBuilding = useGameStore(state => state.placingBuilding);
  const cancelPlacing = useGameStore(state => state.cancelPlacing);
  const tutorialStep = useGameStore(state => state.tutorialStep);
  const [sheetOpen, setSheetOpen] = useState(false);

  const nextWave = waveFailed ? waveNumber : waveNumber + 1;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col justify-between overflow-hidden">
      {/* ---------- Haut : ressources, progression ---------- */}
      <div
        className="flex flex-col items-center gap-1.5"
        style={{
          paddingTop: 'calc(0.6rem + var(--safe-top))',
          paddingLeft: 'calc(0.75rem + var(--safe-left))',
          paddingRight: 'calc(0.75rem + var(--safe-right))',
        }}
      >
        <div className="flex items-start justify-center flex-wrap gap-[clamp(0.375rem,1.5vw,1rem)]">
          <ResourcePill type="boulons" color="#c9c9c9" />
          <ResourcePill type="matiere_floue" color="#8e5ce8" />
          <ResourcePill type="energie_rire" color="#ffd24c" />
          <MuteButton />
          <ResetButton />
        </div>
        <XpBar />
      </div>

      {/* ---------- Milieu : objectif, tutoriel, bandeau de pose ---------- */}
      <AnimatePresence>
        {placingBuilding && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
            style={{ top: 'calc(6.5rem + var(--safe-top))' }}
          >
            <div className="bg-black/75 backdrop-blur-md border border-white/15 rounded-xl px-4 py-2 text-white text-[clamp(0.75rem,3vw,0.875rem)] font-bold text-center whitespace-nowrap">
              Touchez le sol vert : {buildingData(placingBuilding)?.name}
            </div>
            <div className="text-white/50 text-[0.65rem] font-bold uppercase tracking-wider">
              vert = possible · rouge = occupé
            </div>
            <button
              onClick={() => { sfx.tap(); cancelPlacing(); }}
              className="pointer-events-auto bg-red-500/80 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl border border-red-300/30"
            >
              Annuler
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!placingBuilding && tutorialStep >= 5 && <ObjectiveChip />}

      {/* ---------- Bas : agir ---------- */}
      <div
        className="flex flex-col items-stretch gap-2"
        style={{
          paddingBottom: 'calc(0.75rem + var(--safe-bottom))',
          paddingLeft: 'calc(0.75rem + var(--safe-left))',
          paddingRight: 'calc(0.75rem + var(--safe-right))',
        }}
      >
        <div className="flex items-end justify-end">
          <ComboMeter />
        </div>

        <div className="flex items-end justify-between gap-3">
          {/* Construire */}
          <button
            onClick={() => { sfx.tap(); setSheetOpen(true); }}
            className={`pointer-events-auto shrink-0 flex items-center gap-2 bg-[#1e2336ee] backdrop-blur-md border rounded-2xl px-4 py-3 text-white font-black uppercase tracking-wider text-[clamp(0.7rem,3vw,0.8rem)] active:scale-95 transition-transform ${
              tutorialStep === 2
                ? 'border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.8)] animate-pulse'
                : 'border-white/12'
            }`}
          >
            <HammerIcon className="w-[clamp(1rem,4vw,1.25rem)] h-[clamp(1rem,4vw,1.25rem)] text-amber-300" />
            Construire
          </button>

          {/* Vague */}
          <div className="flex flex-col items-end gap-1.5 min-w-0">
            {/* Pas de `mode="wait"` ici, et c'est deliberé. Avec lui, le
                panneau de vague n'apparaissait jamais : l'AnimatePresence
                attendait la fin de la sortie du bouton « Lancer la vague »,
                qui ne se signalait pas, si bien que le bouton restait fige a
                l'ecran — avec son libelle d'avant la vague — pendant tout le
                combat. Sans `mode="wait"`, le nouveau panneau se monte tout de
                suite et ne depend de rien. Duree explicite pour la meme
                raison : ne rien laisser au ressort par defaut. */}
            <AnimatePresence>
              {!waveActive ? (
                <motion.div
                  key="launch"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col items-end gap-1.5"
                >
                  <WaveRadar />
                  <button
                    onClick={() => { sfx.waveStart(); startWave(); }}
                    className={`pointer-events-auto bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black py-3 px-5 rounded-2xl shadow-[0_4px_0_#b45309,0_0_20px_rgba(245,158,11,0.5)] active:translate-y-1 active:shadow-[0_0px_0_#b45309,0_0_10px_rgba(245,158,11,0.5)] transition-all uppercase tracking-wider text-[clamp(0.7rem,3vw,0.875rem)] whitespace-nowrap ${
                      tutorialStep === 3 ? 'animate-pulse ring-2 ring-white/70' : ''
                    }`}
                  >
                    Lancer la vague {nextWave}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="status"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.18 }}
                  className="pointer-events-auto bg-black/65 backdrop-blur-md rounded-2xl p-3 border border-red-500/30 flex flex-col items-end gap-1.5 w-[min(11rem,44vw)]"
                >
                  <span className="text-red-400 font-black uppercase tracking-wider text-[0.7rem]">
                    Vague {waveNumber}
                  </span>

                  {/* Monstres restants : le vrai indicateur d'avancement. Le
                      joueur ne savait pas combien il en restait. */}
                  <div className="w-full flex items-center justify-between text-[0.62rem] font-mono text-white/60">
                    <span>abattus</span>
                    <span className="text-white">{waveKills}/{waveEnemyCount}</span>
                  </div>
                  <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-400"
                      animate={{ width: `${waveEnemyCount ? (waveKills / waveEnemyCount) * 100 : 0}%` }}
                      transition={{ type: 'spring', bounce: 0 }}
                    />
                  </div>

                  <div className="w-full flex items-center justify-between text-[0.62rem] font-mono text-white/60 mt-1">
                    <span>noyau</span>
                    <span className="text-white">{Math.ceil(coreHp)}/{coreMaxHp}</span>
                  </div>
                  <div className="w-full bg-black/50 rounded-full h-3 border border-black overflow-hidden relative">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 to-red-400"
                      initial={{ width: '100%' }}
                      animate={{ width: `${(coreHp / coreMaxHp) * 100}%` }}
                      transition={{ type: 'spring', bounce: 0 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Tutorial overlay (hidden while placing a building so banners don't overlap) */}
      {!placingBuilding && <Tutorial />}

      <Popups />
      <ThreatMarkers />
      <WaveOutcome />
      <LevelUp />
      <BuildSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <BuildingPopup />
    </div>
  );
}

/** L'objectif du moment — voir `objectives.ts`. */
function ObjectiveChip() {
  // `nextObjective` fabrique un objet neuf a chaque appel : le passer en
  // selecteur a zustand ferait croire au magasin que l'etat change a chaque
  // rendu, et la boucle ne s'arreterait jamais (React #185, « maximum update
  // depth exceeded » — vu en vrai). On s'abonne donc aux champs qui comptent,
  // tous comparables par identite, et on recalcule quand l'un d'eux bouge.
  const waveActive = useGameStore((s) => s.waveActive);
  const waveKills = useGameStore((s) => s.waveKills);
  const waveEnemyCount = useGameStore((s) => s.waveEnemyCount);
  const waveNumber = useGameStore((s) => s.waveNumber);
  const waveFailed = useGameStore((s) => s.waveFailed);
  const bestWave = useGameStore((s) => s.bestWave);
  const buildingLevels = useGameStore((s) => s.buildingLevels);
  const buildingPositions = useGameStore((s) => s.buildingPositions);

  const objective = useMemo(
    () => nextObjective(useGameStore.getState()),
    [waveActive, waveKills, waveEnemyCount, waveNumber, waveFailed, bestWave, buildingLevels, buildingPositions],
  );

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none w-[min(20rem,88vw)]"
      style={{ top: 'calc(5.6rem + var(--safe-top))' }}
    >
      <div className="bg-[#0f172ae0] backdrop-blur-md border border-white/12 rounded-xl px-3 py-2 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0 shadow-[0_0_8px_#fbbf24]" />
        <span className="text-white/90 text-[clamp(0.72rem,3.1vw,0.82rem)] font-bold leading-tight truncate">
          {objective.text}
        </span>
        {objective.detail && (
          <span className="ml-auto shrink-0 text-white/45 text-[0.65rem] font-mono">{objective.detail}</span>
        )}
      </div>
      {objective.progress !== undefined && (
        <div className="h-[3px] mx-3 bg-black/50 rounded-b-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-all duration-300"
            style={{ width: `${Math.min(100, objective.progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

/** Coupe le son. Le jeu en fait beaucoup : il faut pouvoir l'arreter. */
function MuteButton() {
  const [muted, setMuted] = useState(isMuted);
  return (
    <button
      onClick={() => setMuted(toggleMute())}
      title={muted ? 'Réactiver le son' : 'Couper le son'}
      className="pointer-events-auto flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-md border border-white/10 bg-[#1a1f3599] text-white/70 hover:text-white active:scale-95 transition-all"
    >
      <SpeakerIcon className="w-4 h-4" muted={muted} />
    </button>
  );
}

/** Bouton de test : réinitialise stats, bâtiments, tutoriel et sauvegarde. */
function ResetButton() {
  const resetGame = useGameStore(state => state.resetGame);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return undefined;
    const timer = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <button
      onClick={() => {
        if (confirming) {
          resetGame();
          setConfirming(false);
        } else {
          setConfirming(true);
        }
      }}
      className={`pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md border transition-all active:scale-95 text-[clamp(0.65rem,2.8vw,0.75rem)] font-bold ${
        confirming
          ? 'bg-red-600/80 border-red-300/50 text-white animate-pulse'
          : 'bg-[#1a1f3599] border-white/10 text-white/70 hover:text-white'
      }`}
      title="Réinitialiser la partie"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
      </svg>
      {confirming ? 'Sûr ?' : ''}
    </button>
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
      className="pointer-events-auto flex items-center gap-1.5 px-[clamp(0.5rem,2.2vw,0.9rem)] py-1.5 rounded-full bg-[#1a1f3599] backdrop-blur-md border border-white/10"
      style={{ boxShadow: `0 0 10px ${color}33, inset 0 0 5px ${color}33`, borderColor: `${color}66` }}
    >
      <ResourceIcon type={type} className="w-[clamp(0.95rem,3.6vw,1.25rem)] h-[clamp(0.95rem,3.6vw,1.25rem)] drop-shadow-md shrink-0" />
      <motion.span
        animate={bump ? { scale: 1.3, color: '#ffffff' } : { scale: 1, color: '#f8fafc' }}
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        className="font-mono font-bold text-[clamp(0.8rem,3.2vw,1.05rem)] min-w-[3ch]"
      >
        {Math.floor(amount)}
      </motion.span>
    </div>
  );
}

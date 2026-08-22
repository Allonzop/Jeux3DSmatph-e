import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store';
import { composeWave, waveSummary } from '../enemies';
import { addShake } from '../effects';

/**
 * L'annonce de vague.
 *
 * « Un truc plus significatif pour faire comprendre qu'on passe en vague
 * d'attaque quand on appuie. » Le passage en combat ne se voyait qu'à un
 * changement de panneau en bas à droite : on lançait une vague sans le
 * remarquer, et les monstres arrivaient sur un joueur encore en train de
 * construire.
 *
 * Le bandeau prend l'écran une seconde et demie, annonce le numéro de vague et
 * ce qui arrive, puis s'efface. Il ne bloque rien — `pointer-events-none` : on
 * peut déjà courir se placer pendant qu'il défile, ce qui est précisément le
 * bon réflexe.
 *
 * Il se déclenche sur le passage de `waveActive` à vrai, pas sur le clic du
 * bouton : une vague lancée autrement — par les outils de vérification, par un
 * futur déclencheur — s'annonce pareil.
 */
export function WaveIntro() {
  const waveActive = useGameStore((s) => s.waveActive);
  const waveNumber = useGameStore((s) => s.waveNumber);
  const waveEnemyCount = useGameStore((s) => s.waveEnemyCount);
  const [showing, setShowing] = useState(false);
  const wasActive = useRef(false);

  useEffect(() => {
    if (waveActive && !wasActive.current) {
      setShowing(true);
      addShake(0.35);
      const t = setTimeout(() => setShowing(false), 1900);
      wasActive.current = true;
      return () => clearTimeout(t);
    }
    if (!waveActive) wasActive.current = false;
    return undefined;
  }, [waveActive]);

  const summary = showing ? waveSummary(composeWave(waveNumber, waveEnemyCount)) : [];

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          key={waveNumber}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-[115] pointer-events-none flex items-center justify-center overflow-hidden"
        >
          {/* Deux lames rouges qui balaient l'écran en sens inverse. Le
              mouvement horizontal est ce qui accroche l'œil — un simple fondu
              se confond avec les autres apparitions du HUD. */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            className="absolute inset-x-0 h-[6.5rem]"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(190,18,60,0.92) 18%, rgba(120,10,40,0.95) 82%, transparent)',
            }}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 110, damping: 20 }}
            className="absolute inset-x-0 h-[6.5rem] border-y-2 border-rose-300/50"
          />

          <motion.div
            initial={{ scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 20 }}
            className="relative text-center px-4"
          >
            <div className="text-rose-200/80 text-[0.7rem] font-black uppercase tracking-[0.45em]">
              Attaque
            </div>
            <div className="text-white font-black leading-none text-[clamp(2.6rem,14vw,4.5rem)] drop-shadow-[0_0_26px_rgba(244,63,94,0.9)]">
              VAGUE {waveNumber}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
              {summary.map(({ type, count }) => (
                <span
                  key={type.kind}
                  className="text-[0.72rem] font-bold"
                  style={{ color: type.tint, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                >
                  {count}× {type.name}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

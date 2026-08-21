import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, Resources } from '../store';
import { titleForLevel } from '../progress';
import { ResourceIcon } from './icons';
import { sfx } from '../sfx';

const LABELS: Record<keyof Resources, string> = {
  boulons: 'Boulons',
  matiere_floue: 'Matière floue',
  energie_rire: 'Énergie de rire',
};

/**
 * La carte de montee de niveau.
 *
 * C'est le moment de gratification du jeu : elle prend l'ecran, elle sonne,
 * elle donne quelque chose. Elle se ferme toute seule au bout de quatre
 * secondes ou a la premiere touche — jamais de bouton a chercher.
 *
 * **Sauf pendant une vague.** Les niveaux se gagnent surtout en abattant des
 * monstres, donc la fanfare tombait en plein combat : quatre secondes d'ecran
 * assombri et de clics avales pendant que le reste de la vague avancait sur le
 * cristal. Une celebration qui fait perdre la partie n'est plus une
 * recompense. En combat, elle se reduit donc a un bandeau qui ne masque rien
 * et n'intercepte aucune touche ; la carte pleine est reservee aux moments ou
 * le joueur peut la regarder.
 */
export function LevelUp() {
  const levelUp = useGameStore((s) => s.levelUp);
  const clearLevelUp = useGameStore((s) => s.clearLevelUp);
  const waveActive = useGameStore((s) => s.waveActive);

  useEffect(() => {
    if (!levelUp) return undefined;
    sfx.levelUp();
    const t = setTimeout(() => clearLevelUp(), waveActive ? 2600 : 4200);
    return () => clearTimeout(t);
  }, [levelUp, waveActive, clearLevelUp]);

  if (waveActive) {
    return (
      <AnimatePresence>
        {levelUp && (
          <motion.div
            key={levelUp.level}
            initial={{ opacity: 0, y: -24, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
            className="absolute left-1/2 -translate-x-1/2 z-[120] pointer-events-none"
            style={{ top: 'calc(9.5rem + var(--safe-top))' }}
          >
            <div className="flex items-center gap-3 rounded-2xl border border-amber-300/50 bg-[#241a3fe8] backdrop-blur-md px-4 py-2 shadow-[0_0_28px_rgba(245,158,11,0.5)]">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-black font-black text-sm shrink-0">
                {levelUp.level}
              </span>
              <div className="leading-tight">
                <div className="text-amber-300 text-[0.62rem] font-black uppercase tracking-[0.2em]">
                  Niveau supérieur
                </div>
                <div className="flex items-center gap-2 text-white font-bold text-[0.8rem]">
                  {(Object.keys(LABELS) as (keyof Resources)[])
                    .filter((k) => (levelUp.reward[k] || 0) > 0)
                    .map((k) => (
                      <span key={k} className="inline-flex items-center gap-1">
                        <ResourceIcon type={k} className="w-4 h-4 shrink-0" />
                        +{levelUp.reward[k]}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {levelUp && (
        <motion.div
          key={levelUp.level}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={clearLevelUp}
          className="absolute inset-0 z-[120] flex items-center justify-center pointer-events-auto"
          style={{ background: 'radial-gradient(circle at center, rgba(88,28,135,0.55), rgba(0,0,0,0.75))' }}
        >
          {/* Rayons : une couronne de lames qui tourne lentement derriere la
              carte. Rien d'autre dans le jeu ne fait ca — c'est ce qui rend le
              moment reconnaissable au premier coup d'oeil. */}
          <motion.div
            className="absolute w-[130vmin] h-[130vmin] pointer-events-none"
            initial={{ rotate: 0, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 360, scale: 1, opacity: 0.5 }}
            transition={{ rotate: { duration: 18, repeat: Infinity, ease: 'linear' }, default: { duration: 0.6 } }}
            style={{
              background:
                'repeating-conic-gradient(from 0deg, rgba(255,210,76,0.22) 0deg 6deg, transparent 6deg 20deg)',
              maskImage: 'radial-gradient(circle, black 12%, transparent 62%)',
              WebkitMaskImage: 'radial-gradient(circle, black 12%, transparent 62%)',
            }}
          />

          <motion.div
            initial={{ scale: 0.5, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="relative w-[min(22rem,86vw)] rounded-3xl border border-amber-300/50 bg-[#241a3ff2] backdrop-blur-md px-6 py-7 text-center shadow-[0_0_50px_rgba(245,158,11,0.45)]"
          >
            <div className="text-amber-300/80 text-[0.7rem] font-black uppercase tracking-[0.35em]">
              Niveau supérieur
            </div>

            <motion.div
              initial={{ scale: 0.3 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.12 }}
              className="my-2 text-[3.6rem] leading-none font-black text-white drop-shadow-[0_0_22px_rgba(255,210,76,0.75)]"
            >
              {levelUp.level}
            </motion.div>

            <div className="text-amber-200 font-bold tracking-wide text-[clamp(0.9rem,4vw,1.1rem)]">
              {titleForLevel(levelUp.level)}
            </div>

            <div className="mt-4 rounded-2xl bg-black/35 border border-white/10 px-4 py-3">
              <div className="text-white/45 text-[0.65rem] uppercase tracking-widest mb-2">
                Récompense
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                {(Object.keys(LABELS) as (keyof Resources)[])
                  .filter((k) => (levelUp.reward[k] || 0) > 0)
                  .map((k) => (
                    <span key={k} className="inline-flex items-center gap-1.5 text-white font-bold">
                      <ResourceIcon type={k} className="w-5 h-5 shrink-0" />
                      +{levelUp.reward[k]}
                    </span>
                  ))}
              </div>
            </div>

            <div className="mt-3 text-white/35 text-[0.65rem]">Touchez pour continuer</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

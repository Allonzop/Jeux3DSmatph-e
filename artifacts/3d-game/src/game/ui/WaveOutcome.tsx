import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, Resources } from '../store';
import { sfx } from '../sfx';

const RESOURCE_LABELS: Record<keyof Resources, { label: string; color: string }> = {
  boulons: { label: 'Boulons', color: '#c9c9c9' },
  matiere_floue: { label: 'Matière floue', color: '#8e5ce8' },
  energie_rire: { label: 'Énergie de rire', color: '#ffd24c' },
};

function ResourceList({ amounts, sign }: { amounts: Partial<Resources>; sign: '+' | '-' }) {
  const entries = (Object.keys(RESOURCE_LABELS) as (keyof Resources)[]).filter(
    (k) => (amounts[k] || 0) > 0,
  );
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1.5">
      {entries.map((k) => (
        <span
          key={k}
          className="text-[clamp(0.75rem,3.2vw,0.875rem)] font-bold"
          style={{ color: RESOURCE_LABELS[k].color }}
        >
          {sign}{amounts[k]} {RESOURCE_LABELS[k].label}
        </span>
      ))}
    </div>
  );
}

/** Victory / defeat toast shown when a wave ends, listing gains or losses. */
export function WaveOutcome() {
  const outcome = useGameStore((state) => state.lastWaveOutcome);
  const clearWaveOutcome = useGameStore((state) => state.clearWaveOutcome);
  // Une vague gagnee fait souvent monter de niveau : les deux cartes sont
  // centrees et se superposaient, illisibles toutes les deux. La montee de
  // niveau passe devant, et le butin attend son tour — son minuteur ne demarre
  // qu'une fois la fanfare finie, donc il garde ses sept secondes entieres.
  const levelUp = useGameStore((state) => state.levelUp);

  useEffect(() => {
    if (!outcome || levelUp) return undefined;
    // La fanfare part ici, pas dans le magasin : le son suit ce qui s'affiche,
    // et un magasin qui joue des sons devient impossible a tester.
    if (outcome.type === 'victory') sfx.victory();
    else sfx.defeat();
    const t = setTimeout(() => clearWaveOutcome(), 7000);
    return () => clearTimeout(t);
  }, [outcome, levelUp, clearWaveOutcome]);

  return (
    <AnimatePresence>
      {outcome && !levelUp && (
        <motion.div
          key={`${outcome.type}-${outcome.wave}`}
          initial={{ opacity: 0, scale: 0.85, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto w-[min(20rem,85vw)]"
          onClick={clearWaveOutcome}
        >
          <div
            className={`rounded-2xl px-5 py-4 text-center backdrop-blur-md border ${
              outcome.type === 'victory'
                ? 'bg-[#12301fe6] border-emerald-400/40 shadow-[0_0_28px_rgba(52,211,153,0.35)]'
                : 'bg-[#301218e6] border-rose-400/40 shadow-[0_0_28px_rgba(251,113,133,0.3)]'
            }`}
          >
            <div
              className={`font-black uppercase tracking-widest text-[clamp(1rem,4.5vw,1.25rem)] ${
                outcome.type === 'victory' ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {outcome.type === 'victory' ? `Vague ${outcome.wave} repoussée !` : 'Défaite…'}
            </div>
            <p className="text-white/80 text-[clamp(0.7rem,3vw,0.8rem)] mt-1 leading-snug">
              {outcome.type === 'victory'
                ? 'Butin de victoire :'
                : 'Le noyau a cédé. Ressources pillées :'}
            </p>
            <ResourceList
              amounts={(outcome.type === 'victory' ? outcome.gains : outcome.losses) || {}}
              sign={outcome.type === 'victory' ? '+' : '-'}
            />
            <p className="text-white/40 text-[0.65rem] mt-2.5 leading-snug">
              Le noyau est réparé à 100 % avant chaque vague.
              <br />
              (Touchez pour fermer)
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

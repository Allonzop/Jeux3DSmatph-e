import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store';
import { xpForLevel, titleForLevel } from '../progress';
import { StarIcon, SkullIcon } from './icons';

/**
 * La barre d'experience : le fil rouge de la partie.
 *
 * Elle repond a « ou j'en suis ? » en un coup d'oeil, ce que ni les ressources
 * ni le numero de vague ne faisaient — les premieres montent et descendent, le
 * second recule quand on perd. Le niveau, lui, ne redescend jamais.
 */
export function XpBar() {
  const xp = useGameStore((s) => s.xp);
  const level = useGameStore((s) => s.playerLevel);
  const bestWave = useGameStore((s) => s.bestWave);
  const totalKills = useGameStore((s) => s.totalKills);

  const need = xpForLevel(level);
  const pct = Math.min(100, (xp / need) * 100);

  return (
    <div className="pointer-events-none flex items-center gap-2 w-[min(20rem,86vw)]">
      {/* Ecusson de niveau */}
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center shadow-[0_0_14px_rgba(245,158,11,0.55)]">
          <span className="text-black font-black text-sm leading-none">{level}</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-amber-200/90 text-[0.62rem] font-black uppercase tracking-[0.15em] truncate">
            {titleForLevel(level)}
          </span>
          <span className="flex items-center gap-2 shrink-0 text-white/40 text-[0.58rem] font-mono">
            <span className="inline-flex items-center gap-0.5">
              <StarIcon className="w-2.5 h-2.5" />
              {bestWave}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <SkullIcon className="w-2.5 h-2.5" />
              {totalKills}
            </span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400"
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 24 }}
            style={{ boxShadow: '0 0 10px rgba(245,158,11,0.7)' }}
          />
        </div>
      </div>
    </div>
  );
}

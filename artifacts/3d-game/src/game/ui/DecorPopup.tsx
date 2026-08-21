import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, DECOR_LABEL, DECOR_REWARD, ResourceType } from '../store';
import { clearableKind, SCATTER } from '../world';
import { ResourceIcon, CloseIcon } from './icons';
import { spawnBurst, spawnPopup } from '../effects';
import { surfaceY } from '../world';
import { sfx } from '../sfx';

/**
 * Le panneau de déblayage.
 *
 * Une touche sur un arbre ne le fait pas disparaître directement : elle ouvre
 * ce bandeau. Le geste est irréversible — le décor ne repousse pas — et le
 * joystick renvoie les touches brèves au canevas, donc un doigt qui glisse
 * près d'un rocher rase la moitié de la planète sans ce garde-fou.
 *
 * Il tient en bas de l'écran, au-dessus des commandes, pour ne pas masquer ce
 * qu'on est en train de regarder.
 */

/** Retrouve la position d'un élément de décor pour y faire partir l'effet. */
function positionOf(id: string): [number, number, number] | null {
  const all = [
    ...SCATTER.trees, ...SCATTER.rocks, ...SCATTER.bushes,
    ...SCATTER.crystals, ...SCATTER.mushrooms,
  ];
  const found = all.find((item) => item.id === id);
  return found ? found.pos : null;
}

export function DecorPopup() {
  const selectedDecor = useGameStore((state) => state.selectedDecor);
  const selectDecor = useGameStore((state) => state.selectDecor);
  const clearDecor = useGameStore((state) => state.clearDecor);

  const kind = selectedDecor ? clearableKind(selectedDecor) : null;

  return (
    <AnimatePresence>
      {selectedDecor && kind && (
        <motion.div
          key={selectedDecor}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.18 }}
          className="absolute left-1/2 -translate-x-1/2 z-[105] pointer-events-auto w-[min(20rem,90vw)]"
          style={{ bottom: 'calc(9.5rem + var(--safe-bottom))' }}
        >
          <div className="rounded-2xl border border-amber-300/40 bg-[#161a2bf2] backdrop-blur-md px-4 py-3 shadow-[0_0_26px_rgba(251,191,36,0.25)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-amber-300 text-[0.62rem] font-black uppercase tracking-[0.18em]">
                  Décor
                </div>
                <div className="text-white font-bold text-[0.95rem] leading-tight">
                  {DECOR_LABEL[kind]}
                </div>
                <p className="text-white/50 text-[0.7rem] leading-snug mt-0.5">
                  Le déblayer libère la place pour un bâtiment.
                </p>
              </div>
              <button
                onClick={() => selectDecor(null)}
                className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => {
                const pos = positionOf(selectedDecor);
                clearDecor(selectedDecor);
                sfx.boom();
                if (pos) {
                  const y = surfaceY(pos[0], pos[2]);
                  spawnBurst(pos[0], y + 0.5, pos[2], '#c29d72', 1.2, 0.5);
                  const gain = DECOR_REWARD[kind];
                  spawnPopup(pos[0], y + 1.5, pos[2], `+${gain.boulons ?? 0}`, 'resource');
                }
              }}
              className="mt-3 w-full py-2.5 rounded-xl bg-amber-400 text-black font-black uppercase tracking-wider text-[0.75rem] active:scale-[0.98] transition-transform shadow-[0_3px_0_#b45309] flex items-center justify-center gap-2"
            >
              Déblayer
              <span className="inline-flex items-center gap-1.5">
                {(Object.entries(DECOR_REWARD[kind]) as [ResourceType, number][]).map(([key, val]) => (
                  <span key={key} className="inline-flex items-center gap-0.5">
                    +{val}
                    <ResourceIcon type={key} className="w-3.5 h-3.5 shrink-0" />
                  </span>
                ))}
              </span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

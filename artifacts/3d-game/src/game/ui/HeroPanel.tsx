import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, ResourceType } from '../store';
import { HERO_TRACKS, trackBonus, POWERS } from '../hero';
import { titleForLevel } from '../progress';
import { ResourceIcon, CloseIcon } from './icons';
import { sfx } from '../sfx';

/**
 * La fiche du commandant.
 *
 * Elle s'ouvre en touchant l'écusson de niveau, en haut à gauche : c'est déjà
 * là qu'on regarde pour savoir où on en est, et ça évite un cinquième onglet
 * dans une feuille de construction qui n'a plus de place sur un écran de
 * 390 pixels.
 *
 * Trois pistes chiffrées et deux pouvoirs. Les pistes se paient, les pouvoirs
 * s'ouvrent au niveau — on ne peut pas acheter la puissance de fin de partie
 * avec un stock de boulons.
 */
export function HeroPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const resources = useGameStore((s) => s.resources);
  const upgrades = useGameStore((s) => s.heroUpgrades);
  const upgradeHero = useGameStore((s) => s.upgradeHero);
  const playerLevel = useGameStore((s) => s.playerLevel);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[112] pointer-events-auto bg-black/55 backdrop-blur-sm flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[#161a2b] border-t border-white/10 rounded-t-3xl flex flex-col max-h-[82vh]"
            style={{ paddingBottom: 'var(--safe-bottom)' }}
          >
            <div className="shrink-0 px-4 pt-3 pb-2">
              <div className="mx-auto w-10 h-1 rounded-full bg-white/20 mb-3" />
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-black uppercase tracking-wider text-sm">Commandant</h2>
                  <div className="text-amber-300 text-[0.7rem] font-bold">
                    Niveau {playerLevel} · {titleForLevel(playerLevel)}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-4 pb-4 flex flex-col gap-2.5">
              {HERO_TRACKS.map((track) => {
                const level = upgrades[track.id] || 0;
                const maxed = level >= track.maxLevel;
                const cost = track.cost(level);
                const canPay = (Object.entries(cost) as [ResourceType, number][])
                  .every(([key, val]) => !val || resources[key] >= val);

                return (
                  <div key={track.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-bold text-white text-[0.92rem]">{track.name}</span>
                      <span className="text-[0.65rem] font-mono text-white/40">
                        {level}/{track.maxLevel}
                      </span>
                    </div>
                    <p className="text-white/50 text-[0.72rem] leading-snug mt-0.5">{track.blurb}</p>

                    {/* Barre de rang : le niveau se lit sans compter. */}
                    <div className="flex gap-1 mt-2">
                      {Array.from({ length: track.maxLevel }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full ${i < level ? 'bg-amber-300' : 'bg-white/10'}`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-2.5">
                      <div className="text-[0.72rem] font-mono text-white/70">
                        +{trackBonus(track, level).toFixed(track.perLevel < 1 ? 1 : 0)} {track.unit}
                        {!maxed && (
                          <span className="text-emerald-300">
                            {' '}→ +{trackBonus(track, level + 1).toFixed(track.perLevel < 1 ? 1 : 0)}
                          </span>
                        )}
                      </div>

                      {maxed ? (
                        <span className="text-[0.65rem] text-amber-300/70 uppercase font-black">Max</span>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex gap-1.5">
                            {(Object.entries(cost) as [ResourceType, number][])
                              .filter(([, val]) => val > 0)
                              .map(([key, val]) => (
                                <span
                                  key={key}
                                  className={`inline-flex items-center gap-1 text-[0.68rem] font-mono font-bold ${
                                    resources[key] >= val ? 'text-white' : 'text-red-400'
                                  }`}
                                >
                                  <ResourceIcon type={key} className="w-3.5 h-3.5 shrink-0" />
                                  {Math.round(val)}
                                </span>
                              ))}
                          </div>
                          <button
                            disabled={!canPay}
                            onClick={() => { if (upgradeHero(track.id)) sfx.build(); }}
                            className={`px-3 py-1.5 rounded-xl text-[0.7rem] font-black uppercase tracking-wider ${
                              canPay
                                ? 'bg-amber-400 text-black active:scale-95'
                                : 'bg-white/5 text-white/25 border border-white/10'
                            }`}
                          >
                            Monter
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="text-white/40 text-[0.62rem] font-black uppercase tracking-[0.2em] mt-2 px-1">
                Pouvoirs
              </div>

              {Object.values(POWERS).map((power) => {
                const unlocked = playerLevel >= power.requiredLevel;
                return (
                  <div
                    key={power.id}
                    className="rounded-2xl border border-white/10 bg-black/25 p-3 flex items-center gap-3"
                    style={{ boxShadow: `inset 3px 0 0 ${unlocked ? power.color : '#4a4356'}` }}
                  >
                    <div
                      className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border border-white/10"
                      style={{ backgroundColor: unlocked ? `${power.color}22` : '#241f2c' }}
                    >
                      <PowerGlyph id={power.id} color={unlocked ? power.color : '#6b6478'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white text-[0.88rem]">{power.name}</div>
                      <p className="text-white/50 text-[0.7rem] leading-snug">
                        {unlocked ? power.blurb : `S’ouvre au niveau ${power.requiredLevel}.`}
                      </p>
                    </div>
                    <span className="shrink-0 text-[0.62rem] font-mono text-white/40">
                      {power.cooldown}s
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Le pictogramme d'un pouvoir, partagé avec le bouton du HUD. */
export function PowerGlyph({ id, color }: { id: string; color: string }) {
  if (id === 'onde') {
    return (
      <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
        <circle cx="12" cy="12" r="2.6" fill={color} />
        <circle cx="12" cy="12" r="6" fill="none" stroke={color} strokeWidth="1.8" opacity="0.7" />
        <circle cx="12" cy="12" r="9.6" fill="none" stroke={color} strokeWidth="1.4" opacity="0.35" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
      <path d="M13.4 2 L5 13.2 h5.2 L9.6 22 L19 10.4 h-5.4 Z" fill={color} />
    </svg>
  );
}

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, ResourceType, Resources } from '../store';
import { ZONES } from '../zones';
import { ResourceIcon, CloseIcon } from './icons';
import { sfx } from '../sfx';

/**
 * La fiche d'annexion d'un secteur.
 *
 * Elle s'ouvre en touchant une zone verrouillée. Elle dit trois choses, et
 * c'est tout ce qu'il faut : ce qu'on y trouve, ce que ça coûte, et à quel
 * niveau de commandant ça s'ouvre — parce qu'un bouton grisé sans raison est
 * pire qu'un bouton absent.
 */
export function ZonePopup() {
  const selectedZone = useGameStore((s) => s.selectedZone);
  const selectZone = useGameStore((s) => s.selectZone);
  const unlockZone = useGameStore((s) => s.unlockZone);
  const resources = useGameStore((s) => s.resources);
  const playerLevel = useGameStore((s) => s.playerLevel);

  const zone = selectedZone ? ZONES.find((z) => z.id === selectedZone) : null;
  if (!zone) return null;

  const levelOk = playerLevel >= zone.requiredLevel;
  const canPay = (Object.entries(zone.cost) as [ResourceType, number][])
    .every(([key, val]) => resources[key] >= val);
  const ready = levelOk && canPay;

  return (
    <AnimatePresence>
      <div
        className="absolute inset-0 z-[108] pointer-events-auto flex items-end justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => selectZone(null)}
        style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-[min(22rem,92vw)] rounded-2xl border bg-[#161a2bf5] backdrop-blur-md overflow-hidden"
          style={{ borderColor: `${zone.palette.glow}55`, boxShadow: `0 0 34px ${zone.palette.glow}33` }}
        >
          <div
            className="px-4 py-3 flex items-start justify-between gap-3"
            style={{ backgroundColor: `${zone.palette.glow}18` }}
          >
            <div className="min-w-0">
              <div
                className="text-[0.6rem] font-black uppercase tracking-[0.2em]"
                style={{ color: zone.palette.glow }}
              >
                Secteur à annexer
              </div>
              <h2 className="text-white font-bold text-lg leading-tight truncate">{zone.name}</h2>
            </div>
            <button
              onClick={() => selectZone(null)}
              className="shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 flex flex-col gap-3">
            <p className="text-white/65 text-[0.82rem] leading-snug">{zone.blurb}</p>

            <div className="rounded-xl bg-black/25 border border-white/5 p-3 flex flex-col gap-1.5 text-[0.75rem]">
              <div className="flex justify-between">
                <span className="text-white/45">Terrain gagné</span>
                <span className="text-white font-mono">un quart de la couronne</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/45">Niveau requis</span>
                <span className={`font-mono ${levelOk ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {zone.requiredLevel} {levelOk ? '✓' : `(vous : ${playerLevel})`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/45">Cœur du secteur</span>
                <span className="text-white/40 font-mono">à défendre plus tard</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(Object.entries(zone.cost) as [ResourceType, number][]).map(([key, val]) => {
                const enough = resources[key] >= val;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                      enough ? 'bg-white/5 border-white/10' : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <ResourceIcon type={key} className="w-4 h-4 shrink-0" />
                    <span className={`font-mono font-bold ${enough ? 'text-white' : 'text-red-400'}`}>
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              disabled={!ready}
              onClick={() => { if (unlockZone(zone.id)) sfx.levelUp(); }}
              className={`py-3 rounded-xl font-black uppercase tracking-wider text-[0.8rem] transition-all ${
                ready
                  ? 'text-black active:translate-y-0.5'
                  : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
              }`}
              style={ready ? { backgroundColor: zone.palette.glow, boxShadow: '0 4px 0 rgba(0,0,0,0.35)' } : undefined}
            >
              {!levelOk
                ? `Niveau ${zone.requiredLevel} requis`
                : !canPay
                  ? 'Ressources insuffisantes'
                  : 'Annexer ce secteur'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * Le panneau « Empire », dans la feuille de construction.
 *
 * Le playtest fixe l'horizon : « quand la planète sera parfaite, l'objectif
 * sera de débloquer d'autres planètes et de créer un empire spatial ». Ce
 * panneau tient la place — il montre les secteurs de la planète courante, et
 * annonce la suite sans la promettre pour tout de suite.
 *
 * Ce n'est pas de l'ornement : c'est là que se lit d'un coup d'œil ce qui reste
 * à annexer, et c'est le point d'entrée tout trouvé pour une seconde planète
 * (voir le commentaire de tête de `zones.ts`).
 */
export function EmpirePanel({ onClose }: { onClose: () => void }) {
  const unlocked = useGameStore((s) => s.unlockedZones);
  const selectZone = useGameStore((s) => s.selectZone);
  const playerLevel = useGameStore((s) => s.playerLevel);
  const resources = useGameStore((s) => s.resources);

  const owned = ZONES.filter((z) => unlocked[z.id]).length;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
        <div className="flex items-baseline justify-between">
          <span className="font-bold text-white text-[0.92rem]">Planète Racine</span>
          <span className="text-[0.65rem] font-mono text-white/45">
            {owned + 1}/{ZONES.length + 1} secteurs
          </span>
        </div>
        <p className="text-white/50 text-[0.72rem] leading-snug mt-0.5">
          Votre monde de départ. Le plateau central est à vous ; le reste s’annexe.
        </p>
      </div>

      {ZONES.map((zone) => {
        const isOwned = !!unlocked[zone.id];
        const levelOk = playerLevel >= zone.requiredLevel;
        const canPay = (Object.entries(zone.cost) as [ResourceType, number][])
          .every(([key, val]) => resources[key] >= val);
        return (
          <div
            key={zone.id}
            className="rounded-2xl border border-white/10 bg-black/25 p-3 flex gap-3 items-center"
            style={{ boxShadow: `inset 3px 0 0 ${isOwned ? zone.palette.glow : '#4a4356'}` }}
          >
            <div
              className="w-10 h-10 shrink-0 rounded-xl border border-white/10"
              style={{
                background: isOwned
                  ? `linear-gradient(135deg, ${zone.palette.ground}, ${zone.palette.accent})`
                  : '#39323f',
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white text-[0.88rem] truncate">{zone.name}</div>
              <p className="text-white/50 text-[0.7rem] leading-snug">
                {isOwned ? 'Annexé.' : levelOk ? zone.blurb : `S’ouvre au niveau ${zone.requiredLevel}.`}
              </p>
            </div>
            {isOwned ? (
              <span className="shrink-0 text-[0.65rem] font-black uppercase text-emerald-300">À vous</span>
            ) : (
              <button
                onClick={() => { sfx.tap(); selectZone(zone.id); onClose(); }}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-[0.7rem] font-black uppercase tracking-wider ${
                  levelOk && canPay ? 'text-black' : 'bg-white/8 border border-white/10 text-white/60'
                }`}
                style={levelOk && canPay ? { backgroundColor: zone.palette.glow } : undefined}
              >
                Voir
              </button>
            )}
          </div>
        );
      })}

      <div className="rounded-2xl border border-dashed border-white/12 bg-black/15 p-3">
        <div className="flex items-baseline justify-between">
          <span className="font-bold text-white/60 text-[0.9rem]">Deuxième planète</span>
          <span className="text-[0.62rem] font-mono text-white/30 uppercase">à venir</span>
        </div>
        <p className="text-white/35 text-[0.72rem] leading-snug mt-0.5">
          Annexez les quatre secteurs de la Racine, et l’empire s’étendra plus loin.
        </p>
      </div>
    </div>
  );
}

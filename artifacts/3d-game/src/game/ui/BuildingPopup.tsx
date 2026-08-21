import React from 'react';
import { useGameStore, ResourceType } from '../store';
import {
  buildingData,
  instanceNumber,
  ROLE_LABEL,
  type BuildingRole,
  type TurretStats,
} from '../gamedata';
import { ResourceIcon, BuildingIcon, CloseIcon, MoveIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { sfx } from '../sfx';

const ROLE_TINT: Record<BuildingRole, string> = {
  defense: '#f87171',
  production: '#4ade80',
  soutien: '#60a5fa',
};

function PassiveYield({ passive }: { passive: Partial<Record<string, number>> }) {
  const entries = Object.entries(passive).filter(([, val]) => val !== undefined);
  if (entries.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {entries.map(([key, val]) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          +{val}
          <ResourceIcon type={key as ResourceType} className="w-4 h-4 shrink-0" />
          <span className="text-white/50 text-xs">/sec</span>
        </span>
      ))}
    </span>
  );
}

/**
 * Fiche technique d'une tour.
 *
 * Le panneau annoncait « (cadence de tir / portée augmentées) » entre
 * parentheses, sans un seul chiffre. On ameliorait a l'aveugle. Les quatre
 * lignes ci-dessous sont les memes donnees que celles que lit la boucle de
 * combat — impossible qu'elles mentent.
 */
function TurretSheet({ stats, next }: { stats: TurretStats | null; next?: TurretStats | null }) {
  if (!stats) return null;
  const rows: { label: string; value: string; nextValue?: string }[] = [
    { label: 'Dégâts', value: `${stats.dps}/sec`, nextValue: next ? `${next.dps}/sec` : undefined },
    { label: 'Portée', value: stats.range.toFixed(1), nextValue: next ? next.range.toFixed(1) : undefined },
  ];
  if (stats.splash > 0) {
    rows.push({
      label: stats.mode === 'cryo' ? 'Zone de gel' : 'Rayon d’explosion',
      value: stats.splash.toFixed(1),
      nextValue: next && next.splash > 0 ? next.splash.toFixed(1) : undefined,
    });
  }
  if (stats.slow > 0) {
    rows.push({
      label: 'Ralentissement',
      value: `${Math.round(stats.slow * 100)} %`,
      nextValue: next && next.slow > 0 ? `${Math.round(next.slow * 100)} %` : undefined,
    });
  }
  if (stats.targets > 1 && stats.targets < 90) {
    rows.push({
      label: 'Cibles',
      value: String(stats.targets),
      nextValue: next && next.targets > 1 && next.targets < 90 ? String(next.targets) : undefined,
    });
  }
  rows.push({ label: 'Atteint les volants', value: stats.hitsAir ? 'oui' : 'non' });

  return (
    <div className="flex flex-col gap-1">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between text-sm">
          <span className="text-white/45">{r.label}</span>
          <span className="font-mono text-white">
            {r.value}
            {r.nextValue && r.nextValue !== r.value && (
              <span className="text-emerald-300"> → {r.nextValue}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BuildingPopup() {
  const selectedBuilding = useGameStore(state => state.selectedBuilding);
  const selectBuilding = useGameStore(state => state.selectBuilding);
  const buildingLevels = useGameStore(state => state.buildingLevels);
  const upgradeBuilding = useGameStore(state => state.upgradeBuilding);
  const resources = useGameStore(state => state.resources);
  const startPlacing = useGameStore(state => state.startPlacing);

  if (!selectedBuilding) return null;

  const data = buildingData(selectedBuilding);
  if (!data) return null;

  const level = buildingLevels[selectedBuilding] || 0;
  const isMax = level >= data.maxLevel;
  const copy = instanceNumber(selectedBuilding);

  const nextLevelData = !isMax ? data.levels[level] : null;
  const currentLevelData = level > 0 ? data.levels[level - 1] : null;

  let canAfford = false;
  if (nextLevelData) {
    canAfford =
      resources.boulons >= (nextLevelData.cost.boulons || 0) &&
      resources.matiere_floue >= (nextLevelData.cost.matiere_floue || 0) &&
      resources.energie_rire >= (nextLevelData.cost.energie_rire || 0);
  }

  const shownLevelData = level > 0 ? currentLevelData : nextLevelData;
  const hasPassive = Object.keys(shownLevelData?.passive || {}).length > 0;

  return (
    <AnimatePresence>
      <div
        className="absolute inset-0 pointer-events-auto flex items-center justify-center bg-black/60 backdrop-blur-sm z-50"
        style={{
          padding: '1rem',
          paddingTop: 'calc(1rem + var(--safe-top))',
          paddingBottom: 'calc(1rem + var(--safe-bottom))',
          paddingLeft: 'calc(1rem + var(--safe-left))',
          paddingRight: 'calc(1rem + var(--safe-right))',
        }}
        onClick={() => selectBuilding(null)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#1e2336] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-full"
          style={{ boxShadow: `0 0 40px ${data.color}33` }}
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-white/10" style={{ backgroundColor: `${data.color}22` }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-black/30 flex items-center justify-center shadow-inner border border-white/5">
                <BuildingIcon id={data.id} className="w-8 h-8" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-white tracking-wide truncate">
                  {data.name}
                  {copy > 1 && <span className="text-white/40 text-base"> nº{copy}</span>}
                </h2>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span style={{ color: data.color }}>
                    Niveau {level} <span className="text-white/30">/ {data.maxLevel}</span>
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[0.6rem] font-black uppercase tracking-wider"
                    style={{ backgroundColor: `${ROLE_TINT[data.role]}22`, color: ROLE_TINT[data.role] }}
                  >
                    {ROLE_LABEL[data.role]}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { sfx.tap(); startPlacing(selectedBuilding); }}
                title="Déplacer ce bâtiment"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                <MoveIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => selectBuilding(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* À quoi ça sert — la premiere chose lue, avant les chiffres. */}
          <div className="px-5 pt-4">
            <p className="text-white/70 text-sm leading-snug">{data.blurb}</p>
          </div>

          {/* Body */}
          <div className="p-5 flex flex-col gap-4">

            {/* Current Stats */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/5 flex flex-col gap-2">
              <div className="text-xs uppercase tracking-wider text-white/40">
                {level > 0 ? 'Actuellement' : 'Une fois construit'}
              </div>
              {hasPassive && (
                <div className="text-white font-medium">
                  <PassiveYield passive={shownLevelData?.passive || {}} />
                </div>
              )}
              {shownLevelData?.effect && (
                <div className="text-white/80 text-sm">{shownLevelData.effect}</div>
              )}
              <TurretSheet
                stats={shownLevelData?.turret ?? null}
                next={level > 0 ? nextLevelData?.turret ?? null : null}
              />
              {!hasPassive && !shownLevelData?.effect && !shownLevelData?.turret && (
                <span className="text-white/40">—</span>
              )}
            </div>

            {/* Upgrade Section */}
            {!isMax ? (
              <div className="flex flex-col gap-3">
                <div className="text-sm uppercase tracking-wider text-white/40">
                  {level === 0 ? 'Coût de construction' : 'Coût du niveau suivant'}
                </div>

                <div className="flex flex-wrap gap-2">
                  {Object.entries(nextLevelData!.cost).map(([key, val]) => {
                    const have = resources[key as ResourceType];
                    const enough = have >= val;
                    return (
                      <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${enough ? 'bg-white/5 border-white/10' : 'bg-red-500/10 border-red-500/30'}`}>
                        <ResourceIcon type={key as ResourceType} className="w-4 h-4 shrink-0" />
                        <span className={`font-mono font-bold ${enough ? 'text-white' : 'text-red-400'}`}>
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {level > 0 && (
                  <div className="text-sm bg-blue-500/10 text-blue-300 p-3 rounded-xl border border-blue-500/20 flex flex-col gap-1">
                    <span className="font-bold uppercase text-xs">Après amélioration</span>
                    {Object.keys(nextLevelData!.passive || {}).length > 0 && (
                      <PassiveYield passive={nextLevelData!.passive} />
                    )}
                    {nextLevelData!.effect && <span>{nextLevelData!.effect}</span>}
                  </div>
                )}

                <button
                  disabled={!canAfford}
                  onClick={() => {
                    upgradeBuilding(selectedBuilding, nextLevelData!.cost);
                    sfx.build();
                  }}
                  className={`mt-1 py-3 px-6 rounded-xl font-bold uppercase tracking-wider transition-all
                    ${canAfford
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_0_#1e3a8a] active:translate-y-1 active:shadow-[0_0px_0_#1e3a8a] hover:brightness-110'
                      : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                    }
                  `}
                >
                  {canAfford ? (level === 0 ? 'Construire' : 'Améliorer') : 'Ressources insuffisantes'}
                </button>
              </div>
            ) : (
              <div className="py-8 text-center flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-transparent to-black/20 rounded-xl">
                <ResourceIcon type="energie_rire" className="w-10 h-10" />
                <div className="text-amber-400 font-bold uppercase tracking-widest">Niveau maximum atteint</div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, ResourceType, Resources } from '../store';
import {
  BUILDINGS,
  ROLE_LABEL,
  instanceIds,
  nextFreeInstance,
  coreUpgradeCost,
  CORE_MAX_LEVEL,
  type BuildingRole,
} from '../gamedata';
import { ResourceIcon, BuildingIcon, CloseIcon } from './icons';
import { EmpirePanel } from './ZonePopup';
import { sfx } from '../sfx';

/**
 * Le panneau de construction.
 *
 * Avant : une rangee de six pastilles muettes, une par batiment. On ne savait
 * ni ce que faisait un batiment, ni ce qu'il coutait, ni combien on pouvait en
 * poser — trois des reproches du retour d'evaluation d'un coup. Et avec neuf
 * batiments, la rangee ne tenait plus sur un telephone.
 *
 * Desormais une feuille qui monte du bas, groupee par role, ou chaque entree
 * dit tout : ce que ca fait, ce que ca coute, combien sont deja poses. Elle
 * defile, donc ajouter un batiment ne casse rien.
 */

const ROLE_ORDER: BuildingRole[] = ['defense', 'production', 'soutien'];

/** Le quatrieme onglet n'est pas un role de batiment : c'est la carte des zones. */
type Tab = BuildingRole | 'empire';

const ROLE_TINT: Record<BuildingRole, string> = {
  defense: '#f87171',
  production: '#4ade80',
  soutien: '#60a5fa',
};

function canAfford(resources: Resources, cost: Partial<Resources>): boolean {
  return (
    resources.boulons >= (cost.boulons || 0) &&
    resources.matiere_floue >= (cost.matiere_floue || 0) &&
    resources.energie_rire >= (cost.energie_rire || 0)
  );
}

function CostRow({ cost }: { cost: Partial<Resources> }) {
  const resources = useGameStore((s) => s.resources);
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.entries(cost) as [ResourceType, number][]).map(([key, val]) => {
        const enough = resources[key] >= val;
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[0.7rem] font-mono font-bold border ${
              enough ? 'bg-white/5 border-white/10 text-white' : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <ResourceIcon type={key} className="w-3.5 h-3.5 shrink-0" />
            {val}
          </span>
        );
      })}
    </div>
  );
}

export function BuildSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const buildingLevels = useGameStore((s) => s.buildingLevels);
  const buildingPositions = useGameStore((s) => s.buildingPositions);
  const startPlacing = useGameStore((s) => s.startPlacing);
  const selectBuilding = useGameStore((s) => s.selectBuilding);
  const [tab, setTab] = useState<Tab>('defense');

  const groups = ROLE_ORDER.map((role) => ({
    role,
    entries: Object.values(BUILDINGS).filter((b) => b.role === role),
  }));
  const shown = groups.find((g) => g.role === tab)?.entries ?? [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[110] pointer-events-auto bg-black/55 backdrop-blur-sm flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[#161a2b] border-t border-white/10 rounded-t-3xl flex flex-col max-h-[80vh]"
            style={{ paddingBottom: 'var(--safe-bottom)' }}
          >
            {/* Poignee + titre */}
            <div className="shrink-0 px-4 pt-3 pb-2">
              <div className="mx-auto w-10 h-1 rounded-full bg-white/20 mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="text-white font-black uppercase tracking-wider text-sm">Construire</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Onglets par role : trois familles, pas neuf pastilles. */}
              <div className="flex gap-1.5 mt-3">
                {groups.map((g) => (
                  <button
                    key={g.role}
                    onClick={() => { sfx.tap(); setTab(g.role); }}
                    className={`flex-1 py-2 rounded-xl text-[0.66rem] font-black uppercase tracking-wider border transition-colors ${
                      tab === g.role
                        ? 'text-black border-transparent'
                        : 'text-white/50 bg-white/5 border-white/10'
                    }`}
                    style={tab === g.role ? { backgroundColor: ROLE_TINT[g.role] } : undefined}
                  >
                    {ROLE_LABEL[g.role]}
                  </button>
                ))}
                <button
                  onClick={() => { sfx.tap(); setTab('empire'); }}
                  className={`flex-1 py-2 rounded-xl text-[0.66rem] font-black uppercase tracking-wider border transition-colors ${
                    tab === 'empire' ? 'bg-violet-400 text-black border-transparent' : 'text-white/50 bg-white/5 border-white/10'
                  }`}
                >
                  Empire
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-4 pb-4 flex flex-col gap-2.5">
              {tab === 'empire' && <EmpirePanel onClose={onClose} />}
              {tab === 'defense' && <CoreCard />}

              {shown.map((data) => {
                const ids = instanceIds(data.id);
                const placed = ids.filter((id) => buildingPositions[id]).length;
                const free = nextFreeInstance(data.id, buildingPositions);
                // Un exemplaire pose mais pas encore construit compte : sans
                // ca, poser les trois tourelles sans en batir aucune affichait
                // « Complet » et ne laissait plus aucun moyen d'y revenir.
                const firstPlacedId = ids.find((id) => buildingPositions[id]);
                const built = firstPlacedId ? (buildingLevels[firstPlacedId] || 0) > 0 : false;

                return (
                  <div
                    key={data.id}
                    className="rounded-2xl border border-white/10 bg-black/25 p-3 flex gap-3"
                    style={{ boxShadow: `inset 3px 0 0 ${data.color}` }}
                  >
                    <div
                      className="w-11 h-11 shrink-0 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center"
                    >
                      <BuildingIcon id={data.id} className="w-7 h-7" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-white text-[0.92rem] truncate">{data.name}</span>
                        {data.maxInstances > 1 && (
                          <span className="text-[0.65rem] font-mono text-white/40 shrink-0">
                            {placed}/{data.maxInstances}
                          </span>
                        )}
                      </div>
                      <p className="text-white/55 text-[0.72rem] leading-snug mt-0.5">{data.blurb}</p>
                      <div className="mt-1.5">
                        <CostRow cost={data.levels[0].cost} />
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col justify-center gap-1.5">
                      {free && (
                        <button
                          onClick={() => { sfx.tap(); startPlacing(free); onClose(); }}
                          className="px-3 py-1.5 rounded-xl text-[0.7rem] font-black uppercase tracking-wider text-black active:scale-95 transition-transform"
                          style={{ backgroundColor: data.color }}
                        >
                          Placer
                        </button>
                      )}
                      {firstPlacedId && (
                        <button
                          onClick={() => { sfx.tap(); selectBuilding(firstPlacedId); onClose(); }}
                          className="px-3 py-1.5 rounded-xl text-[0.7rem] font-bold uppercase tracking-wider bg-white/8 border border-white/10 text-white/70"
                        >
                          {built ? 'Améliorer' : 'Construire'}
                        </button>
                      )}
                      {!free && !firstPlacedId && (
                        <span className="text-[0.65rem] text-white/30 uppercase font-bold">Complet</span>
                      )}
                    </div>
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

/**
 * Le renforcement du noyau : le puits de ressources rares.
 *
 * Il est ici, en tete de l'onglet Defense, plutot que dans un ecran a part :
 * c'est une decision de defense comme une autre, et le joueur qui vient
 * chercher une tour doit la voir.
 */
function CoreCard() {
  const coreLevel = useGameStore((s) => s.coreLevel);
  const resources = useGameStore((s) => s.resources);
  const upgradeCore = useGameStore((s) => s.upgradeCore);
  const maxed = coreLevel >= CORE_MAX_LEVEL;
  const cost = coreUpgradeCost(coreLevel);
  const affordable = canAfford(resources, cost);

  return (
    <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/5 p-3 flex gap-3">
      <div className="w-11 h-11 shrink-0 rounded-xl bg-black/40 border border-cyan-300/20 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-7 h-7" aria-hidden="true">
          <path d="M12 2.4 L19 8 L16.4 19.4 H7.6 L5 8 Z" fill="#7df9ff" />
          <path d="M12 2.4 L19 8 L12 11 Z" fill="#b6fbff" />
          <path d="M12 11 L16.4 19.4 H7.6 Z" fill="#4cc9f0" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-white text-[0.92rem]">Noyau de cristal</span>
          <span className="text-[0.65rem] font-mono text-cyan-200/60">
            rang {coreLevel}/{CORE_MAX_LEVEL}
          </span>
        </div>
        <p className="text-white/55 text-[0.72rem] leading-snug mt-0.5">
          {maxed
            ? 'Renforcement maximal atteint.'
            : `Encaisse ${coreLevel + 1} monstre${coreLevel > 0 ? 's' : ''} de plus par vague.`}
        </p>
        {!maxed && <div className="mt-1.5"><CostRow cost={cost} /></div>}
      </div>
      <div className="shrink-0 flex items-center">
        {maxed ? (
          <span className="text-[0.65rem] text-cyan-200/50 uppercase font-bold">Max</span>
        ) : (
          <button
            disabled={!affordable}
            onClick={() => { if (upgradeCore()) sfx.build(); }}
            className={`px-3 py-1.5 rounded-xl text-[0.7rem] font-black uppercase tracking-wider transition-transform ${
              affordable
                ? 'bg-cyan-300 text-black active:scale-95'
                : 'bg-white/5 text-white/25 border border-white/10'
            }`}
          >
            Renforcer
          </button>
        )}
      </div>
    </div>
  );
}

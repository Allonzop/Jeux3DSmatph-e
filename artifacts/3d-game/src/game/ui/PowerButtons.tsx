import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store';
import { POWERS, type PowerId } from '../hero';
import { cooldownRatio, triggerPower, nowSeconds, isSurcharged } from '../heroPowers';
import { PowerGlyph } from './HeroPanel';

/**
 * Les boutons de pouvoir.
 *
 * Un bouton par pouvoir ouvert, au-dessus du panneau de vague. La recharge est
 * lue dix fois par seconde dans `heroPowers` — pas soixante : la jauge paraît
 * continue et le HUD ne se re-rend pas à chaque image.
 *
 * Un pouvoir qui n'est pas encore ouvert n'affiche pas de bouton grisé : il
 * n'affiche rien. Le joueur découvre ses pouvoirs dans la fiche du commandant,
 * là où le niveau requis est écrit.
 */
export function PowerButtons() {
  const playerLevel = useGameStore((s) => s.playerLevel);
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);

  const now = nowSeconds();
  const available = (Object.keys(POWERS) as PowerId[]).filter(
    (id) => playerLevel >= POWERS[id].requiredLevel,
  );
  if (available.length === 0) return null;

  return (
    <div className="flex items-end gap-2">
      {available.map((id) => {
        const power = POWERS[id];
        const ratio = cooldownRatio(id, now);
        const ready = ratio >= 1;
        const active = id === 'surcharge' && isSurcharged(now);

        return (
          <button
            key={id}
            onClick={() => triggerPower(id)}
            title={power.name}
            className={`pointer-events-auto relative w-14 h-14 rounded-2xl border overflow-hidden flex items-center justify-center transition-transform active:scale-90 ${
              ready ? 'border-white/25' : 'border-white/10'
            }`}
            style={{
              backgroundColor: ready ? `${power.color}26` : '#12151fdd',
              boxShadow: active
                ? `0 0 22px ${power.color}`
                : ready
                  ? `0 0 14px ${power.color}66`
                  : 'none',
            }}
          >
            {/* Jauge de recharge : elle remonte par le bas, comme un verre
                qu'on remplit. Un cercle qui se vide se lit mal à cette taille. */}
            <div
              className="absolute inset-x-0 bottom-0 transition-none"
              style={{
                height: `${Math.min(100, ratio * 100)}%`,
                backgroundColor: `${power.color}2e`,
              }}
            />
            <div className="relative" style={{ opacity: ready ? 1 : 0.45 }}>
              <PowerGlyph id={id} color={power.color} />
            </div>
            {!ready && (
              <span className="absolute bottom-0.5 right-1 text-[0.6rem] font-mono font-bold text-white/80">
                {Math.ceil((1 - ratio) * power.cooldown)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

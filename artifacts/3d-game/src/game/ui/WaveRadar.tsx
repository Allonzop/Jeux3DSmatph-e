import React from 'react';
import { useGameStore } from '../store';
import { composeWave, waveSummary, rosterForWave, ENEMY_TYPES } from '../enemies';

/**
 * Le radar : ce qui arrive a la prochaine vague, avant de la lancer.
 *
 * Sans lui, la variete du bestiaire serait une punition — on decouvre qu'un
 * monstre vole quand il est deja passe au-dessus des tourelles. Avec lui,
 * chaque vague devient une question posee au joueur : « il y a deux Ecumeurs,
 * qu'est-ce que tu montes ? »
 *
 * La composition est deterministe (voir `composeWave`), donc ce qui est
 * annonce est exactement ce qui sortira.
 */
export function WaveRadar() {
  const waveNumber = useGameStore((s) => s.waveNumber);
  const waveFailed = useGameStore((s) => s.waveFailed);
  const waveActive = useGameStore((s) => s.waveActive);

  if (waveActive) return null;

  const next = waveFailed ? waveNumber : waveNumber + 1;
  const count = 1 + next * 2;
  const summary = waveSummary(composeWave(next, count));

  // Un profil qui entre en scene a cette vague : on le signale explicitement,
  // c'est le moment ou le joueur doit adapter ses defenses.
  const roster = rosterForWave(next);
  const previous = rosterForWave(next - 1).map((t) => t.kind);
  const newcomer = roster.find((t) => !previous.includes(t.kind));

  return (
    <div className="pointer-events-none flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[min(15rem,55vw)]">
        {summary.map(({ type, count: n }) => (
          <span
            key={type.kind}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-black/55 backdrop-blur border text-[0.68rem] font-bold"
            style={{ borderColor: `${type.tint}66`, color: type.tint }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: type.tint, boxShadow: `0 0 6px ${type.tint}` }}
            />
            {n}× {type.name}
          </span>
        ))}
      </div>

      {newcomer && (
        <div
          className="px-2 py-1 rounded-lg bg-black/70 backdrop-blur border text-[0.65rem] font-bold text-right max-w-[min(17rem,68vw)] leading-snug"
          style={{ borderColor: `${newcomer.tint}66`, color: newcomer.tint }}
        >
          Nouveau : {newcomer.name} — {ENEMY_TYPES[newcomer.kind].tip}
        </div>
      )}
    </div>
  );
}

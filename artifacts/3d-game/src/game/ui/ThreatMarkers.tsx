import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { ENEMY_TYPES } from '../enemies';
import { enemyPositions } from '../scene/utils';
import { projection } from '../effects';

/**
 * Les flèches de menace, au bord de l'écran.
 *
 * La caméra suit le héros, les monstres arrivent de tous les côtés, et l'écran
 * d'un téléphone cadre à peine la moitié du plateau : la moitié d'une vague
 * approchait hors champ, sans que rien ne le dise. On découvrait l'attaque au
 * bruit du noyau qui encaisse.
 *
 * Chaque monstre hors cadre pousse une flèche sur le bord, à sa couleur de
 * profil, avec sa distance au cristal. Le joueur sait d'où ça vient et combien
 * de temps il lui reste, sans quitter le combat des yeux.
 *
 * Même discipline que `Popups.tsx` : réserve fixe montée une fois, boucle
 * `requestAnimationFrame` qui n'écrit que des styles, aucun rendu React après
 * le montage. Les positions viennent de `enemyPositions`, le registre
 * impératif — jamais du magasin.
 */

// Six flèches, pas plus : au-delà, le bord de l'écran devient une frise
// illisible et on ne repère plus la menace la plus proche — celle qui compte.
const POOL = 6;
/** Marge intérieure : au-delà, un monstre est considéré hors cadre. */
const INSET = 56;

export function ThreatMarkers() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const screen = { x: 0, y: 0 };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const state = useGameStore.getState();
      const project = projection.project;

      if (!state.waveActive || !project) {
        for (const el of refs.current) if (el && el.style.opacity !== '0') el.style.opacity = '0';
        return;
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;

      // Les plus proches du cristal d'abord : ce sont eux qui comptent.
      const threats: { x: number; z: number; dist: number; tint: string }[] = [];
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        const live = enemyPositions.get(enemy.id);
        if (!live) continue;
        threats.push({
          x: live.x,
          z: live.z,
          dist: Math.sqrt(live.x * live.x + live.z * live.z),
          tint: (ENEMY_TYPES[enemy.kind] ?? ENEMY_TYPES.grognard).tint,
        });
      }
      threats.sort((a, b) => a.dist - b.dist);

      let used = 0;
      for (const threat of threats) {
        if (used >= POOL) break;

        _world.set(threat.x, 0.8, threat.z);
        const onScreen = project(_world, screen);
        const inFrame =
          onScreen &&
          screen.x > INSET && screen.x < w - INSET &&
          screen.y > INSET && screen.y < h - INSET;
        if (inFrame) continue;

        const el = refs.current[used];
        const label = labelRefs.current[used];
        if (!el) break;

        // Direction vers la cible. Quand la projection échoue — monstre
        // derrière la caméra — on retombe sur la direction dans le plan de la
        // carte : la caméra regarde toujours vers les −Z, donc +x est à droite
        // et +z vers le bas de l'écran. Approximation suffisante pour une
        // flèche, et elle ne s'effondre jamais.
        let dx: number;
        let dy: number;
        if (onScreen) {
          dx = screen.x - cx;
          dy = screen.y - cy;
        } else {
          const hero = state.heroPos;
          dx = threat.x - hero[0];
          dy = threat.z - hero[2];
        }
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;

        // Projection sur le rectangle intérieur : on avance depuis le centre
        // jusqu'au premier bord touché.
        const halfW = cx - INSET;
        const halfH = cy - INSET;
        const t = Math.min(
          Math.abs(dx) > 1e-4 ? halfW / Math.abs(dx) : Infinity,
          Math.abs(dy) > 1e-4 ? halfH / Math.abs(dy) : Infinity,
        );
        const px = cx + dx * t;
        const py = cy + dy * t;

        el.style.opacity = '1';
        el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
        el.style.color = threat.tint;
        el.style.borderColor = `${threat.tint}88`;
        const arrow = el.firstElementChild as HTMLElement | null;
        if (arrow) arrow.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI / 2}rad)`;
        if (label) {
          const text = `${Math.round(threat.dist)}`;
          if (label.textContent !== text) label.textContent = text;
        }
        used += 1;
      }

      for (let i = used; i < POOL; i++) {
        const el = refs.current[i];
        if (el && el.style.opacity !== '0') el.style.opacity = '0';
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: POOL }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className="absolute top-0 left-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm border will-change-transform"
          style={{ opacity: 0 }}
        >
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 shrink-0" aria-hidden="true">
            <path d="M6 0.5 L11 11 L6 8.4 L1 11 Z" fill="currentColor" />
          </svg>
          <span
            ref={(el) => { labelRefs.current[i] = el; }}
            className="font-mono font-bold text-[0.6rem] leading-none"
          />
        </div>
      ))}
    </div>
  );
}

// Vecteur de travail — jamais réalloué dans la boucle.
const _world = new THREE.Vector3();

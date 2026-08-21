import React, { useEffect, useRef } from 'react';
import { popups, projection } from '../effects';

/**
 * Les chiffres flottants : degats, ressources, experience, soins.
 *
 * Ils vivent dans le DOM, au-dessus du canvas, et non dans la scene 3D. Deux
 * raisons :
 *
 * - le texte 3D (`drei/Text`) va chercher une police sur un CDN, ce qui casse
 *   hors ligne — or les outils de verification tournent sans reseau ;
 * - un `<Html>` de drei par chiffre monte et demonte un noeud DOM a chaque
 *   coup, plusieurs fois par seconde et par monstre.
 *
 * La reserve de 26 elements existe donc des le premier rendu et n'est jamais
 * remontee : la boucle ne fait qu'ecrire `transform`, `opacity` et
 * `textContent`. Aucun rendu React apres le montage — c'est la meme discipline
 * que la scene (voir `.agents/memory/r3f-game-perf.md`).
 */

const STYLES: Record<string, { color: string; shadow: string; size: string; weight: string }> = {
  damage: { color: '#ffffff', shadow: '0 2px 6px rgba(0,0,0,0.9)', size: '0.95rem', weight: '800' },
  crit: { color: '#ffd24c', shadow: '0 0 12px rgba(255,210,76,0.8)', size: '1.35rem', weight: '900' },
  resource: { color: '#7dd3fc', shadow: '0 0 10px rgba(125,211,252,0.7)', size: '1.05rem', weight: '800' },
  xp: { color: '#c77dff', shadow: '0 0 10px rgba(199,125,255,0.7)', size: '1rem', weight: '800' },
  heal: { color: '#52b788', shadow: '0 0 10px rgba(82,183,136,0.7)', size: '0.95rem', weight: '800' },
};

export function Popups() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const screen = { x: 0, y: 0 };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;

      const project = projection.project;
      for (let i = 0; i < popups.length; i++) {
        const p = popups[i];
        const el = refs.current[i];
        if (!el) continue;

        if (!p.active || !project) {
          if (el.style.opacity !== '0') el.style.opacity = '0';
          continue;
        }

        p.life += delta;
        const t = p.life / p.duration;
        if (t >= 1) {
          p.active = false;
          el.style.opacity = '0';
          continue;
        }

        if (!project(p.world, screen)) {
          el.style.opacity = '0';
          continue;
        }

        // Montee qui ralentit, disparition sur le dernier tiers : la lecture
        // se fait au debut, quand le chiffre est net et immobile.
        const rise = Math.sqrt(t) * 44;
        const fade = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
        const style = STYLES[p.kind] ?? STYLES.damage;

        if (el.textContent !== p.text) el.textContent = p.text;
        el.style.color = style.color;
        el.style.textShadow = style.shadow;
        el.style.fontSize = style.size;
        el.style.fontWeight = style.weight;
        el.style.opacity = String(fade);
        el.style.transform =
          `translate3d(${screen.x + p.jitter}px, ${screen.y - rise}px, 0) translate(-50%, -50%) scale(${1 + (1 - t) * 0.25})`;
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {popups.map((_, i) => (
        <div
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className="absolute top-0 left-0 font-mono whitespace-nowrap will-change-transform"
          style={{ opacity: 0 }}
        />
      ))}
    </div>
  );
}

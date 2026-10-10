import React, { useEffect, useRef } from 'react';
import { cameraControl, rotateCamera, resetCameraYaw, snapCamera, ROTATE_SPEED, ROTATE_SPEED_MAX, ROTATE_RAMP, TAP_MAX } from '../cameraControl';
import { sfx } from '../sfx';

/**
 * Les commandes d'orientation de la vue.
 *
 * Deux flèches et un retour à zéro, à gauche de l'écran. Pas un geste à deux
 * doigts : la zone de jeu est déjà prise par le joystick dynamique, qui capture
 * le pointeur dès le premier contact, et un second doigt y déclencherait les
 * deux à la fois.
 *
 * Tenir une flèche fait tourner en continu, via une boucle
 * `requestAnimationFrame` qui écrit dans `cameraControl` — jamais dans React :
 * l'angle change à chaque image, et le faire passer par un état re-rendrait
 * tout le HUD soixante fois par seconde.
 *
 * Les flèches du clavier font la même chose, pour jouer au bureau.
 */
export function CameraControls() {
  /** −1 sens anti-horaire, +1 horaire, 0 à l'arrêt. */
  const direction = useRef(0);
  /** Depuis quand la flèche est tenue (ms), pour l'accélération et le clic. */
  const heldSince = useRef(0);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (direction.current !== 0) {
        const held = (now - heldSince.current) / 1000;
        const k = Math.min(1, held / ROTATE_RAMP);
        const speed = ROTATE_SPEED + (ROTATE_SPEED_MAX - ROTATE_SPEED) * k;
        rotateCamera(direction.current * speed * delta);
      }
      // La boussole tourne avec la vue : c'est ce qui dit qu'on n'est plus
      // dans l'axe, et de combien.
      if (badgeRef.current) {
        badgeRef.current.style.transform = `rotate(${-cameraControl.yaw}rad)`;
      }
    };
    raf = requestAnimationFrame(loop);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft') { direction.current = -1; heldSince.current = performance.now(); }
      else if (e.key === 'ArrowRight') { direction.current = 1; heldSince.current = performance.now(); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') release(-1);
      else if (e.key === 'ArrowRight') release(1);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  /** Relâche : une pression brève cale la vue sur le cran de 45° suivant. */
  const release = (dir: number) => {
    if (direction.current !== dir) return;
    direction.current = 0;
    if ((performance.now() - heldSince.current) / 1000 < TAP_MAX) snapCamera(dir);
  };

  const hold = (dir: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      direction.current = dir;
      heldSince.current = performance.now();
      sfx.tap();
    },
    onPointerUp: () => release(dir),
    onPointerCancel: () => { direction.current = 0; },
  });

  const button = 'pointer-events-auto w-12 h-12 rounded-2xl bg-[#1e2336dd] backdrop-blur-md border border-white/12 text-white/80 flex items-center justify-center active:scale-90 active:text-white transition-transform';

  return (
    <div
      className="absolute flex flex-col items-center gap-1.5 pointer-events-none"
      style={{ left: 'calc(0.75rem + var(--safe-left))', bottom: 'calc(5.5rem + var(--safe-bottom))' }}
    >
      {/* Boussole : le nord de la carte, qui tourne avec la vue. */}
      <button
        onClick={() => { sfx.tap(); resetCameraYaw(); }}
        title="Remettre la vue dans l'axe"
        className={button}
      >
        <div ref={badgeRef} className="w-6 h-6">
          <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
            <path d="M12 3.5 L15 12 L12 10.4 L9 12 Z" fill="#f87171" />
            <path d="M12 20.5 L9 12 L12 13.6 L15 12 Z" fill="currentColor" opacity="0.7" />
          </svg>
        </div>
      </button>

      <div className="flex gap-1.5">
        <button {...hold(-1)} title="Tourner la vue à gauche" className={button} aria-label="Tourner la vue à gauche">
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
            <path d="M14.5 5 L7.5 12 L14.5 19" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button {...hold(1)} title="Tourner la vue à droite" className={button} aria-label="Tourner la vue à droite">
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
            <path d="M9.5 5 L16.5 12 L9.5 19" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store';

const MAX_RADIUS = 56;
const DEAD_ZONE = 5;
// A press that barely moves and releases quickly is a tap → forwarded to the
// 3D canvas so tapping a building still opens its panel.
const TAP_MAX_DIST = 10;
const TAP_MAX_MS = 300;

/**
 * Dynamic virtual joystick (Archero-style):
 * touch anywhere on the play area → the stick appears under the finger,
 * drag to move, release to stop and hide it.
 *
 * Perf: gesture state lives in refs and the visuals are moved by writing
 * style.transform directly — pointermove never triggers a React render.
 */
export function Joystick() {
  const baseRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const setHeroDir = useGameStore(state => state.setHeroDir);

  const pointerId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const startTime = useRef(0);
  const maxDist = useRef(0);

  useEffect(() => {
    // Safety: if the OS interrupts the touch (notification swipe, app switch,
    // tab hidden), release the stick so the hero never keeps walking.
    const reset = () => {
      pointerId.current = null;
      if (baseRef.current) baseRef.current.style.opacity = '0';
      if (thumbRef.current) thumbRef.current.style.opacity = '0';
      setHeroDir([0, 0]);
    };
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);
    return () => {
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', reset);
      setHeroDir([0, 0]); // stop the hero if the component unmounts mid-drag
    };
  }, [setHeroDir]);

  const place = (el: HTMLDivElement | null, x: number, y: number) => {
    if (el) el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  };

  const setVisible = (visible: boolean) => {
    const opacity = visible ? '1' : '0';
    if (baseRef.current) baseRef.current.style.opacity = opacity;
    if (thumbRef.current) thumbRef.current.style.opacity = opacity;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== null) return; // already tracking a finger
    pointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    origin.current = { x: e.clientX, y: e.clientY };
    startTime.current = performance.now();
    maxDist.current = 0;
    place(baseRef.current, e.clientX, e.clientY);
    place(thumbRef.current, e.clientX, e.clientY);
    setVisible(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerId.current) return;
    let dx = e.clientX - origin.current.x;
    let dy = e.clientY - origin.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDist.current) maxDist.current = dist;

    if (dist > MAX_RADIUS) {
      dx = (dx / dist) * MAX_RADIUS;
      dy = (dy / dist) * MAX_RADIUS;
    }
    place(thumbRef.current, origin.current.x + dx, origin.current.y + dy);

    if (dist > DEAD_ZONE) {
      // Screen dx → world x, screen dy → world z (camera is fixed-angle).
      setHeroDir([dx / MAX_RADIUS, dy / MAX_RADIUS]);
    } else {
      setHeroDir([0, 0]);
    }
  };

  const endGesture = (e: React.PointerEvent<HTMLDivElement>, wasCancelled: boolean) => {
    if (e.pointerId !== pointerId.current) return;
    pointerId.current = null;
    setVisible(false);
    setHeroDir([0, 0]);

    const elapsed = performance.now() - startTime.current;
    if (!wasCancelled && maxDist.current < TAP_MAX_DIST && elapsed < TAP_MAX_MS) {
      forwardTapToCanvas(e.clientX, e.clientY);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40"
      style={{ touchAction: 'none', pointerEvents: 'auto' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={e => endGesture(e, false)}
      onPointerCancel={e => endGesture(e, true)}
      onLostPointerCapture={e => endGesture(e, true)}
    >
      {/* Base ring — positioned imperatively, fades in/out */}
      <div
        ref={baseRef}
        className="absolute top-0 left-0 rounded-full border-2 border-white/25 bg-black/25 backdrop-blur-[2px]"
        style={{
          width: '112px',
          height: '112px',
          opacity: 0,
          transition: 'opacity 120ms ease-out',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />
      {/* Thumb */}
      <div
        ref={thumbRef}
        className="absolute top-0 left-0 rounded-full bg-white/45 border border-white/60"
        style={{
          width: '46px',
          height: '46px',
          opacity: 0,
          transition: 'opacity 120ms ease-out',
          boxShadow: '0 0 14px rgba(255,255,255,0.35)',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />
    </div>
  );
}

/**
 * The joystick layer sits above the WebGL canvas, so quick taps are re-sent
 * to the canvas as synthetic pointer events — react-three-fiber raycasts them
 * and building meshes keep their onPointerDown behavior.
 */
function forwardTapToCanvas(clientX: number, clientY: number) {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  const init: PointerEventInit = {
    clientX,
    clientY,
    bubbles: true,
    cancelable: true,
    pointerId: 999,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons: 1,
  };
  canvas.dispatchEvent(new PointerEvent('pointerdown', init));
  canvas.dispatchEvent(new PointerEvent('pointerup', { ...init, buttons: 0 }));
  canvas.dispatchEvent(new MouseEvent('click', { clientX, clientY, bubbles: true, cancelable: true }));
}

import { useEffect } from 'react';
import { GameCanvas } from './game/GameCanvas';
import { HUD } from './game/ui/HUD';
import { Joystick } from './game/ui/Joystick';
import { WebGLErrorBoundary } from './game/WebGLErrorBoundary';
import { unlockAudio } from './game/sfx';

export default function App() {
  // Les navigateurs refusent de demarrer l'audio avant un geste du joueur.
  //
  // C'etait branche `{ once: true }` : si ce tout premier geste tombait a un
  // moment ou le navigateur refusait encore, il n'y avait plus de seconde
  // chance et le jeu restait muet toute la session. On reessaie a chaque
  // geste — `unlockAudio` ne fait rien quand le contexte tourne deja — et on
  // ecoute en capture pour que rien ne puisse intercepter l'evenement en
  // route (le joystick capture le pointeur des le `pointerdown`).
  useEffect(() => {
    const unlock = () => unlockAudio();
    const opts = { capture: true } as const;
    const events = ['pointerdown', 'touchstart', 'click', 'keydown'] as const;
    for (const name of events) window.addEventListener(name, unlock, opts);
    return () => {
      for (const name of events) window.removeEventListener(name, unlock, opts);
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100dvh', position: 'relative', overflow: 'hidden', background: '#0d1117' }}>
      <WebGLErrorBoundary>
        <GameCanvas />
        <HUD />
        <Joystick />
      </WebGLErrorBoundary>
    </div>
  );
}

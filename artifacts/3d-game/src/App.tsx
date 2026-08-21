import { useEffect } from 'react';
import { GameCanvas } from './game/GameCanvas';
import { HUD } from './game/ui/HUD';
import { Joystick } from './game/ui/Joystick';
import { WebGLErrorBoundary } from './game/WebGLErrorBoundary';
import { unlockAudio } from './game/sfx';

export default function App() {
  // Les navigateurs refusent de demarrer l'audio avant un geste du joueur. On
  // ouvre donc le contexte au premier contact, une seule fois, plutot qu'au
  // chargement — un contexte cree trop tot reste suspendu et le jeu est muet
  // pour toute la session.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
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

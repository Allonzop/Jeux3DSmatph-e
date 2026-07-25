import { GameCanvas } from './game/GameCanvas';
import { HUD } from './game/ui/HUD';
import { Joystick } from './game/ui/Joystick';
import { WebGLErrorBoundary } from './game/WebGLErrorBoundary';

export default function App() {
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden', background: '#0d1117' }}>
      <WebGLErrorBoundary>
        <GameCanvas />
        <HUD />
        <Joystick />
      </WebGLErrorBoundary>
    </div>
  );
}

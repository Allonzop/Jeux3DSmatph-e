import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';

const MAX_RADIUS = 60;

export function Joystick() {
  const [active, setActive] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [current, setCurrent] = useState({ x: 0, y: 0 });
  const setHeroDir = useGameStore(state => state.setHeroDir);

  useEffect(() => {
    const handlePointerUp = () => {
      if (active) {
        setActive(false);
        setHeroDir([0, 0]);
        setCurrent({ x: 0, y: 0 });
      }
    };
    
    // Global pointer up to catch releases outside the area
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [active, setHeroDir]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setActive(true);
    // Use client coordinates for accurate delta tracking
    setOrigin({ x: e.clientX, y: e.clientY });
    setCurrent({ x: 0, y: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active) return;
    
    let dx = e.clientX - origin.x;
    let dy = e.clientY - origin.y;
    
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > MAX_RADIUS) {
      dx = (dx / dist) * MAX_RADIUS;
      dy = (dy / dist) * MAX_RADIUS;
    }
    
    setCurrent({ x: dx, y: dy });
    
    // Map to 3D world axes: dx -> x, dy -> z
    setHeroDir([dx / MAX_RADIUS, dy / MAX_RADIUS]);
  };

  return (
    <div 
      className="fixed z-50 rounded-full"
      style={{
        bottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
        left: '40px',
        width: '120px',
        height: '120px',
        touchAction: 'none',
        pointerEvents: 'auto',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      {/* Hit area center is 60,60 relative to container */}
      
      {/* Persistent faint ring */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20"
        style={{ width: '80px', height: '80px', pointerEvents: 'none' }}
      />
      
      {/* Active joystick visuals */}
      {active && (
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          {/* Outer circle */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: 'rgba(0,0,0,0.5)',
              transform: `translate(calc(-50% + ${current.x}px), calc(-50% + ${current.y}px))`
            }}
          >
            {/* Inner thumb */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30 backdrop-blur-sm"
              style={{ width: '36px', height: '36px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

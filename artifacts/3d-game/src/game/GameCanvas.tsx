import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Ground } from './scene/Ground';
import { Hero } from './scene/Hero';
import { ResourceNodes } from './scene/ResourceNodes';
import { Buildings } from './scene/Buildings';
import { Enemies } from './scene/Enemies';
import { CrystalCore } from './scene/CrystalCore';
import { Stars } from './scene/Stars';
import { Camera } from './scene/Camera';
import { useGameStore } from './store';
import { BUILDINGS } from './gamedata';

function PassiveTicker() {
  const tickPassive = useGameStore(state => state.tickPassive);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useGameStore.getState();
      const amounts = { boulons: 0, matiere_floue: 0, energie_rire: 0 };
      
      Object.entries(state.buildingLevels).forEach(([id, level]) => {
        if (level > 0) {
          const passive = BUILDINGS[id]?.levels[level - 1]?.passive;
          if (passive) {
            amounts.boulons += passive.boulons || 0;
            amounts.matiere_floue += passive.matiere_floue || 0;
            amounts.energie_rire += passive.energie_rire || 0;
          }
        }
      });
      
      if (amounts.boulons > 0 || amounts.matiere_floue > 0 || amounts.energie_rire > 0) {
        tickPassive(amounts);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [tickPassive]);

  return null;
}

export function GameCanvas() {
  return (
    <>
      <PassiveTicker />
      <Canvas shadows dpr={[1, 2]}>
        <color attach="background" args={['#0d1117']} />
        
        <ambientLight intensity={0.2} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={0.5} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />

        <Camera />
        <Stars />
        <Ground />
        <Hero />
        <ResourceNodes />
        <Buildings />
        <CrystalCore />
        <Enemies />

        <EffectComposer>
          <Bloom luminanceThreshold={0.5} intensity={1.5} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </>
  );
}

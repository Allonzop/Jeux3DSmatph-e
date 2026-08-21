import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Ground } from './scene/Ground';
import { Hero } from './scene/Hero';
import { Villagers } from './scene/Villagers';
import { ResourceNodes } from './scene/ResourceNodes';
import { Buildings } from './scene/Buildings';
import { Enemies } from './scene/Enemies';
import { CrystalCore } from './scene/CrystalCore';
import { Stars } from './scene/Stars';
import { Camera } from './scene/Camera';
import { TutorialHighlight } from './scene/TutorialHighlight';
import { Hunters } from './scene/Hunters';
import { CombatEffects } from './scene/CombatEffects';
import { useGameStore } from './store';
import { buildingData } from './gamedata';
import { setCombatMusic } from './sfx';

function PassiveTicker() {
  const tickPassive = useGameStore(state => state.tickPassive);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useGameStore.getState();
      const amounts = { boulons: 0, matiere_floue: 0, energie_rire: 0 };
      
      Object.entries(state.buildingLevels).forEach(([id, level]) => {
        if (level > 0) {
          // `id` peut etre un exemplaire (`hutte#2`) : chaque exemplaire
          // produit pour son propre compte, d'ou la somme sur tous.
          const passive = buildingData(id)?.levels[level - 1]?.passive;
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

/** Bascule la nappe sonore entre calme et combat. Voir `sfx.ts`. */
function MusicMood() {
  const waveActive = useGameStore((state) => state.waveActive);
  useEffect(() => {
    setCombatMusic(waveActive);
  }, [waveActive]);
  return null;
}

export function GameCanvas() {
  return (
    <>
      <PassiveTicker />
      <MusicMood />
      <Canvas shadows dpr={[1, 2]}>
        <color attach="background" args={['#0d1117']} />
        
        {/* Warmer key light and softer ambient as requested */}
        <ambientLight intensity={0.45} color="#b8c4ff" />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.4} 
          color="#fff2dd"
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[0, 5, 0]} intensity={0.3} color="#ffebc8" />

        <Camera />
        <Stars />
        <Ground />
        <Hero />
        <Villagers />
        <Hunters />
        <ResourceNodes />
        <Buildings />
        <CrystalCore />
        <Enemies />
        <CombatEffects />
        <TutorialHighlight />

        {/* Enhanced bloom for glowing emissive materials */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.45} mipmapBlur intensity={1.6} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </>
  );
}

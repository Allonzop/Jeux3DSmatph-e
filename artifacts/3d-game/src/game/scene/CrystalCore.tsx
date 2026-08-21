import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { Float } from '@react-three/drei';
import { useToonGradient } from './utils';
import { CORE_MAX_LEVEL } from '../gamedata';

/**
 * Le noyau de cristal — ce qu'il faut proteger.
 *
 * Il etait rendu a `emissiveIntensity: 1.5` sur une geometrie lisse : sous le
 * bloom, il devenait une boule blanche sans forme, exactement comme les toits
 * blancs corriges lors d'une seance precedente. C'est pourtant l'objet le plus
 * important de l'ecran. Trois corrections :
 *
 * - emissif divise par deux et facettes marquees, pour qu'on voie un cristal ;
 * - un anneau de vie au sol, qui se vide quand le noyau encaisse — la jauge du
 *   HUD est en bas a droite, loin du regard pendant une vague ;
 * - un anneau de renforcement par rang paye (voir `coreLevel` dans le magasin).
 */
export function CrystalCore() {
  const coreRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const hpRingRef = useRef<THREE.Mesh>(null);
  const shellRef = useRef<THREE.Mesh>(null);

  const coreHp = useGameStore(state => state.coreHp);
  const coreMaxHp = useGameStore(state => state.coreMaxHp);
  const coreLevel = useGameStore(state => state.coreLevel);
  const waveActive = useGameStore(state => state.waveActive);

  const hpPercent = coreHp / coreMaxHp;
  const isDanger = hpPercent < 0.5;

  const color = isDanger ? '#ff4444' : '#7df9ff';
  const gradientMap = useToonGradient();

  const pedestalProfile = useMemo(() => [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.8, 0),
    new THREE.Vector2(0.7, 0.4),
    new THREE.Vector2(0.5, 0.8),
    new THREE.Vector2(0.6, 1.0)
  ], []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const speedMult = isDanger ? 3 : 1;

    if (coreRef.current) {
      coreRef.current.rotation.y = time * 0.5 * speedMult;
      coreRef.current.position.y = 1.4 + Math.sin(time * 2 * speedMult) * 0.1;
    }
    if (shellRef.current) {
      shellRef.current.rotation.y = -time * 0.28;
      shellRef.current.position.y = 1.4 + Math.sin(time * 2 * speedMult) * 0.1;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1.4 + Math.sin(time * 4 * speedMult) * 0.7;
    }
    if (hpRingRef.current) {
      // L'anneau pulse quand le noyau est en danger : le seul repere visible
      // sans quitter le combat des yeux.
      const pulse = isDanger ? 1 + Math.sin(time * 7) * 0.06 : 1;
      hpRingRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Pedestal */}
      <mesh castShadow receiveShadow>
        <latheGeometry args={[pedestalProfile, 32]} />
        <meshToonMaterial color="#666" gradientMap={gradientMap} />
      </mesh>

      {/* Anneau de vie : la portion pleine suit les points de vie du noyau.
          `thetaLength` plutot qu'une echelle, pour qu'il se vide comme une
          jauge circulaire et pas comme un anneau qui retrecit. */}
      <mesh ref={hpRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[2.1, 2.34, 64, 1, Math.PI / 2, Math.PI * 2 * Math.max(0.001, hpPercent)]} />
        <meshBasicMaterial color={color} transparent opacity={waveActive ? 0.9 : 0.45} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[2.1, 2.34, 64]} />
        <meshBasicMaterial color="#0b1020" transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {/* Anneaux de renforcement : un par rang paye. Le joueur voit ce que son
          investissement a change, au meme endroit que ce qu'il protege. */}
      {Array.from({ length: Math.min(coreLevel, CORE_MAX_LEVEL) }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[2.5 + i * 0.22, 2.62 + i * 0.22, 64]} />
          <meshBasicMaterial color="#a5f3fc" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}

      {/* Floating Gem Core — emissif reduit, facettes franches. */}
      <mesh ref={coreRef} castShadow>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.65}
          roughness={0.15}
          metalness={0.3}
          flatShading
        />
      </mesh>

      {/* Enveloppe filaire : donne une silhouette au cristal meme quand le
          bloom sature son coeur. */}
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[1.05, 0]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.35} depthWrite={false} />
      </mesh>

      {/* Orbiting Shards */}
      <Float speed={2} rotationIntensity={2} floatIntensity={1} position={[1.2, 1.5, 0]}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} flatShading />
        </mesh>
      </Float>
      <Float speed={2.5} rotationIntensity={2} floatIntensity={1} position={[-0.6, 2, 1]}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.15, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} flatShading />
        </mesh>
      </Float>
      <Float speed={1.8} rotationIntensity={2} floatIntensity={1} position={[-0.6, 1.2, -1.2]}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.25, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} flatShading />
        </mesh>
      </Float>

      <pointLight ref={lightRef} color={color} distance={12} decay={2} />
    </group>
  );
}

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { Float } from '@react-three/drei';
import { useToonGradient } from './utils';

export function CrystalCore() {
  const coreRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  
  const coreHp = useGameStore(state => state.coreHp);
  const coreMaxHp = useGameStore(state => state.coreMaxHp);

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
    if (lightRef.current) {
      lightRef.current.intensity = 2 + Math.sin(time * 4 * speedMult) * 1;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Pedestal */}
      <mesh castShadow receiveShadow>
        <latheGeometry args={[pedestalProfile, 32]} />
        <meshToonMaterial color="#666" gradientMap={gradientMap} />
      </mesh>
      
      {/* Floating Gem Core */}
      <mesh ref={coreRef} castShadow>
        <icosahedronGeometry args={[0.8, 1]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={1.5}
          roughness={0.1}
          metalness={0.2}
          flatShading
        />
      </mesh>
      
      {/* Orbiting Shards */}
      <Float speed={2} rotationIntensity={2} floatIntensity={1} position={[1.2, 1.5, 0]}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} flatShading />
        </mesh>
      </Float>
      <Float speed={2.5} rotationIntensity={2} floatIntensity={1} position={[-0.6, 2, 1]}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.15, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} flatShading />
        </mesh>
      </Float>
      <Float speed={1.8} rotationIntensity={2} floatIntensity={1} position={[-0.6, 1.2, -1.2]}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.25, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} flatShading />
        </mesh>
      </Float>

      <pointLight ref={lightRef} color={color} distance={12} decay={2} />
    </group>
  );
}

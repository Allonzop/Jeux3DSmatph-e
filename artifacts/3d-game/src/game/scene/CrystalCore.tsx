import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';

export function CrystalCore() {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  
  const coreHp = useGameStore(state => state.coreHp);
  const coreMaxHp = useGameStore(state => state.coreMaxHp);

  const hpPercent = coreHp / coreMaxHp;
  const isDanger = hpPercent < 0.5;

  const color = isDanger ? '#ff4444' : '#7df9ff';

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const speedMult = isDanger ? 3 : 1;
    
    if (outerRef.current) {
      outerRef.current.rotation.y = time * 0.5 * speedMult;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y = -time * 0.8 * speedMult;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1.5 + Math.sin(time * 4 * speedMult) * 0.5;
    }
  });

  return (
    <group position={[0, 1.2, 0]}>
      <mesh ref={outerRef}>
        <octahedronGeometry args={[0.8]} />
        <meshPhysicalMaterial 
          color={color} 
          transparent 
          opacity={0.3} 
          roughness={0.1}
          transmission={0.9}
          thickness={0.5}
        />
      </mesh>
      <mesh ref={innerRef}>
        <octahedronGeometry args={[0.6]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      <pointLight ref={lightRef} color={color} distance={10} decay={2} />
    </group>
  );
}

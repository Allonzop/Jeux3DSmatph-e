import React from 'react';
import { useToonGradient } from './utils';

export function Ground() {
  const gradientMap = useToonGradient();

  return (
    <group position={[0, -0.5, 0]}>
      {/* Main Hexagonal Island Base */}
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[9, 9, 1, 6]} />
        {/* Top face */}
        <meshToonMaterial attach="material-0" color="#8B6914" gradientMap={gradientMap} />
        {/* Side faces */}
        <meshToonMaterial attach="material-1" color="#57cc99" gradientMap={gradientMap} />
        {/* Bottom face */}
        <meshToonMaterial attach="material-2" color="#8B6914" gradientMap={gradientMap} />
      </mesh>
      
      {/* Decorative Rocks */}
      <mesh position={[8, 0.5, 2]} receiveShadow castShadow>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshToonMaterial color="#666666" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[-7, 0.5, 4]} scale={[1.2, 0.6, 1]} receiveShadow castShadow>
        <sphereGeometry args={[0.6, 8, 8]} />
        <meshToonMaterial color="#555555" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[3, 0.5, -8]} scale={[1, 0.8, 1.2]} receiveShadow castShadow>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshToonMaterial color="#777777" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[-5, 0.5, -7]} scale={[1.5, 0.5, 1]} receiveShadow castShadow>
        <sphereGeometry args={[0.7, 8, 8]} />
        <meshToonMaterial color="#666666" gradientMap={gradientMap} />
      </mesh>
    </group>
  );
}

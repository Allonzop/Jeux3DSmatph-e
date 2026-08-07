import React from 'react';
import type { PartProps } from '../types';
import { toonMat, basicMat, glassMat } from '../shared';

// Face gear renders inside the head group, in front of the face
// (reference head radius 0.34, face plane around z ≈ 0.32).

// ---- Round glasses ----
export function RoundGlasses({ palette }: PartProps) {
  return (
    <group position={[0, 0, 0.31]}>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0, 0]} material={toonMat(palette.secondary)}>
          <torusGeometry args={[0.085, 0.015, 8, 20]} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0]} material={toonMat(palette.secondary)}>
        <boxGeometry args={[0.08, 0.02, 0.02]} />
      </mesh>
    </group>
  );
}

// ---- Tinted visor ----
export function TintedVisor({ palette }: PartProps) {
  return (
    <mesh rotation={[0, 0, 0]} material={glassMat(palette.accent, 0.45)}>
      <sphereGeometry args={[0.36, 20, 12, -Math.PI * 0.35 + Math.PI / 2, Math.PI * 0.7, Math.PI * 0.32, Math.PI * 0.28]} />
    </mesh>
  );
}

// ---- Breathing mask ----
export function Mask({ palette }: PartProps) {
  return (
    <group position={[0, -0.12, 0.26]}>
      <mesh scale={[1.2, 0.9, 0.7]} material={toonMat(palette.secondary)}>
        <sphereGeometry args={[0.13, 14, 14]} />
      </mesh>
      <mesh position={[0, -0.02, 0.08]} material={basicMat('#555555')}>
        <cylinderGeometry args={[0.03, 0.03, 0.03, 10]} />
      </mesh>
    </group>
  );
}

import React, { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import type { PartProps } from '../types';
import { mulberry32 } from '../rng';
import { toonMat, glowMat } from '../shared';

// Back parts render inside the body group (behind the torso, reference body
// radius 0.22). Neck parts render at the base of the head.
// Colors always come from the character palette.

// ---------------- BACK ----------------

// ---- Backpack (extracted from Hero.tsx) ----
// Fixes the original bug: RoundedBox from drei is already a mesh and must
// NOT be nested inside a <mesh> or used as a geometry.
export function Backpack({ palette }: PartProps) {
  return (
    <RoundedBox args={[0.3, 0.4, 0.15]} radius={0.05} position={[0, 0.05, -0.2]} material={toonMat(palette.accent)} castShadow />
  );
}

// ---- Small wings ----
export function Wings({ palette, seed }: PartProps) {
  const spread = useMemo(() => 0.3 + mulberry32(seed)() * 0.25, [seed]);
  return (
    <group position={[0, 0.12, -0.2]}>
      <mesh position={[-0.14, 0, 0]} rotation={[0, spread, 0.5]} scale={[0.35, 1, 1]} material={toonMat(palette.secondary)}>
        <coneGeometry args={[0.16, 0.34, 4]} />
      </mesh>
      <mesh position={[0.14, 0, 0]} rotation={[0, -spread, -0.5]} scale={[0.35, 1, 1]} material={toonMat(palette.secondary)}>
        <coneGeometry args={[0.16, 0.34, 4]} />
      </mesh>
    </group>
  );
}

// ---- Jetpack / tank ----
export function Jetpack({ palette }: PartProps) {
  return (
    <group position={[0, 0.02, -0.24]}>
      {[-0.09, 0.09].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh material={toonMat(palette.accent)} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.34, 12]} />
          </mesh>
          <mesh position={[0, 0.19, 0]} material={toonMat(palette.secondary)}>
            <sphereGeometry args={[0.07, 12, 12]} />
          </mesh>
          <mesh position={[0, -0.2, 0]} material={toonMat('#555555')}>
            <coneGeometry args={[0.06, 0.08, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---- Cape (slightly curved plane via an open partial cylinder) ----
export function Cape({ palette }: PartProps) {
  return (
    <mesh
      position={[0, -0.05, -0.24]}
      rotation={[0.12, Math.PI, 0]}
      scale={[1, 1, 0.35]}
      material={toonMat(palette.accent)}
    >
      <cylinderGeometry args={[0.26, 0.34, 0.62, 12, 1, true, -Math.PI * 0.45, Math.PI * 0.9]} />
    </mesh>
  );
}

// ---- Snail-like shell ----
export function Shell({ palette, seed }: PartProps) {
  const tilt = useMemo(() => 0.2 + mulberry32(seed)() * 0.3, [seed]);
  return (
    <group position={[0, 0.05, -0.26]} rotation={[tilt, 0, 0]}>
      <mesh scale={[1, 1, 0.75]} material={toonMat(palette.accent)} castShadow>
        <sphereGeometry args={[0.24, 18, 18]} />
      </mesh>
      <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]} material={toonMat(palette.secondary)}>
        <torusGeometry args={[0.13, 0.035, 10, 20]} />
      </mesh>
    </group>
  );
}

// ---------------- NECK ----------------

// ---- Scarf ----
export function Scarf({ palette }: PartProps) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={toonMat(palette.accent)}>
        <torusGeometry args={[0.22, 0.07, 12, 24]} />
      </mesh>
      {/* Trailing tail */}
      <mesh position={[0.1, -0.16, -0.18]} rotation={[0.25, 0, 0.15]} material={toonMat(palette.accent)}>
        <boxGeometry args={[0.1, 0.26, 0.04]} />
      </mesh>
    </group>
  );
}

// ---- Turtleneck collar ----
export function Turtleneck({ palette }: PartProps) {
  return (
    <mesh material={toonMat(palette.secondary)}>
      <cylinderGeometry args={[0.2, 0.24, 0.14, 16]} />
    </mesh>
  );
}

// ---- Glowing necklace ----
export function GlowNecklace({ palette, seed }: PartProps) {
  const beads = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: 5 }).map((_, i) => ({
      angle: Math.PI * (0.25 + (i / 4) * 0.5) + (rnd() - 0.5) * 0.1,
      key: i,
    }));
  }, [seed]);
  return (
    <group position={[0, -0.03, 0]}>
      <mesh rotation={[Math.PI / 2.3, 0, 0]} material={toonMat('#555555')}>
        <torusGeometry args={[0.2, 0.015, 8, 24]} />
      </mesh>
      {beads.map((b) => (
        <mesh
          key={b.key}
          position={[Math.cos(b.angle) * 0.2, -0.05, Math.sin(b.angle) * 0.2]}
          material={glowMat(palette.glow)}
        >
          <sphereGeometry args={[0.035, 8, 8]} />
        </mesh>
      ))}
    </group>
  );
}

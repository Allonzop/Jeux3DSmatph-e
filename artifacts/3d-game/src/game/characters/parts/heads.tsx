import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { PartProps } from '../types';
import { mulberry32 } from '../rng';
import { sharedGeom, toonMat, glowMat, glassMat } from '../shared';

// All headwear parts are rendered inside the head group, scaled so they fit
// a reference head of radius 0.34 (the hero's). Colors always come from the
// character palette — never hard-coded.

// ---- Mushroom cap (migrated from Villagers.tsx) ----
const mushroomGeom = () =>
  sharedGeom('mushroomLathe', () => {
    const profile = [
      new THREE.Vector2(0, 0.4),
      new THREE.Vector2(0.3, 0.35),
      new THREE.Vector2(0.5, 0.2),
      new THREE.Vector2(0.55, 0.0),
      new THREE.Vector2(0.5, -0.05),
      new THREE.Vector2(0.4, -0.05),
      new THREE.Vector2(0, 0),
    ];
    return new THREE.LatheGeometry(profile, 32);
  });

export function MushroomCap({ palette, seed }: PartProps) {
  // Deterministic spot placement — no Math.random in JSX.
  const spots = useMemo(() => {
    const rnd = mulberry32(seed);
    return [0, 1].map((i) => ({
      pos: [(rnd() - 0.5) * 0.5, 0.13 + rnd() * 0.1, 0.15 + rnd() * 0.1] as const,
      size: 0.05 + rnd() * 0.04,
      rot: [rnd() - 0.5, rnd() - 0.5, 0] as const,
      key: i,
    }));
  }, [seed]);

  return (
    <mesh position={[0, 0.2, 0]} geometry={mushroomGeom()} material={toonMat(palette.accent)} castShadow>
      {spots.map((s) => (
        <mesh key={s.key} position={[s.pos[0], s.pos[1], s.pos[2]]} scale={[1, 0.2, 1]} rotation={[s.rot[0], s.rot[1], s.rot[2]]} material={toonMat('#ffffff')}>
          <sphereGeometry args={[s.size, 8, 8]} />
        </mesh>
      ))}
    </mesh>
  );
}

// ---- Beanie (migrated from Villagers.tsx) ----
export function Beanie({ palette }: PartProps) {
  return (
    <group position={[0, 0.25, 0]}>
      <mesh scale={[1, 0.6, 1]} material={toonMat(palette.secondary)} castShadow>
        <sphereGeometry args={[0.35, 16, 16]} />
      </mesh>
      <mesh position={[0, 0.22, 0]} material={toonMat(palette.glow)}>
        <sphereGeometry args={[0.08, 16, 16]} />
      </mesh>
    </group>
  );
}

// ---- Antenna dome (migrated from Villagers.tsx) ----
export function AntennaDome({ palette }: PartProps) {
  return (
    <group position={[0, 0.3, 0]}>
      <mesh scale={[1, 0.4, 1]} material={toonMat(palette.secondary)} castShadow>
        <sphereGeometry args={[0.32, 16, 16]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} material={toonMat('#cccccc')}>
        <cylinderGeometry args={[0.015, 0.015, 0.2]} />
      </mesh>
      <mesh position={[0, 0.3, 0]} material={glowMat(palette.glow)}>
        <sphereGeometry args={[0.06, 16, 16]} />
      </mesh>
    </group>
  );
}

// ---- Visor helmet (extracted from Hero.tsx: glass dome + collar + antenna) ----
export function VisorHelmet({ palette }: PartProps) {
  return (
    <group>
      {/* Glass dome */}
      <mesh scale={[1.1, 1.05, 1.1]} material={glassMat('#aaddff', 0.25)}>
        <sphereGeometry args={[0.34, 24, 24]} />
      </mesh>
      {/* Collar */}
      <mesh position={[0, -0.32, 0]} rotation={[Math.PI / 2, 0, 0]} material={toonMat(palette.secondary)}>
        <torusGeometry args={[0.32, 0.06, 16, 32]} />
      </mesh>
      {/* Antenna */}
      <group position={[0, 0.38, 0]}>
        <mesh position={[0, 0.1, 0]} material={toonMat('#cccccc')}>
          <cylinderGeometry args={[0.015, 0.015, 0.2]} />
        </mesh>
        <mesh position={[0, 0.2, 0]} material={glowMat(palette.glow)}>
          <sphereGeometry args={[0.06, 16, 16]} />
        </mesh>
      </group>
    </group>
  );
}

// ---- Hood ----
export function Hood({ palette }: PartProps) {
  return (
    <group>
      <mesh position={[0, 0.05, -0.04]} scale={[1.12, 1.1, 1.12]} material={toonMat(palette.secondary)} castShadow>
        <sphereGeometry args={[0.34, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
      </mesh>
      {/* Rim around the face opening */}
      <mesh position={[0, -0.02, 0.19]} rotation={[0.5, 0, 0]} material={toonMat(palette.secondary)}>
        <torusGeometry args={[0.31, 0.05, 12, 24]} />
      </mesh>
    </group>
  );
}

// ---- Conical hat ----
export function ConeHat({ palette, seed }: PartProps) {
  const tilt = useMemo(() => (mulberry32(seed)() - 0.5) * 0.25, [seed]);
  return (
    <group position={[0, 0.3, 0]} rotation={[0, 0, tilt]}>
      <mesh position={[0, 0.18, 0]} material={toonMat(palette.accent)} castShadow>
        <coneGeometry args={[0.3, 0.45, 20]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={toonMat(palette.accent)}>
        <torusGeometry args={[0.28, 0.06, 10, 24]} />
      </mesh>
    </group>
  );
}

// ---- Leaf crown ----
export function LeafCrown({ palette, seed }: PartProps) {
  const leaves = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: 6 }).map((_, i) => ({
      angle: (i / 6) * Math.PI * 2 + rnd() * 0.4,
      size: 0.09 + rnd() * 0.05,
      key: i,
    }));
  }, [seed]);
  return (
    <group position={[0, 0.24, 0]}>
      {leaves.map((l) => (
        <group key={l.key} rotation={[0, l.angle, 0]}>
          <mesh position={[0.28, 0, 0]} rotation={[0, 0, -0.6]} scale={[0.5, 1, 0.2]} material={toonMat(palette.accent)}>
            <sphereGeometry args={[l.size * 1.6, 8, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---- Tufty hair (flattened spheres) ----
export function Hair({ palette, seed }: PartProps) {
  const tufts = useMemo(() => {
    const rnd = mulberry32(seed);
    return [
      { pos: [0, 0.26, 0.02] as const, s: 0.26 + rnd() * 0.04 },
      { pos: [-0.16, 0.2, -0.06] as const, s: 0.18 + rnd() * 0.04 },
      { pos: [0.16, 0.2, -0.06] as const, s: 0.18 + rnd() * 0.04 },
    ].map((t, i) => ({ ...t, key: i }));
  }, [seed]);
  return (
    <group>
      {tufts.map((t) => (
        <mesh key={t.key} position={[t.pos[0], t.pos[1], t.pos[2]]} scale={[1, 0.65, 1]} material={toonMat(palette.secondary)} castShadow>
          <sphereGeometry args={[t.s, 14, 14]} />
        </mesh>
      ))}
    </group>
  );
}

// ---- Horned helmet ----
export function HornHelmet({ palette, seed }: PartProps) {
  const hornAngle = useMemo(() => 0.5 + mulberry32(seed)() * 0.4, [seed]);
  return (
    <group position={[0, 0.16, 0]}>
      <mesh scale={[1.05, 0.62, 1.05]} material={toonMat(palette.secondary)} castShadow>
        <sphereGeometry args={[0.34, 18, 18]} />
      </mesh>
      <mesh position={[-0.3, 0.1, 0]} rotation={[0, 0, hornAngle]} material={toonMat('#f5f0e6')}>
        <coneGeometry args={[0.07, 0.28, 10]} />
      </mesh>
      <mesh position={[0.3, 0.1, 0]} rotation={[0, 0, -hornAngle]} material={toonMat('#f5f0e6')}>
        <coneGeometry args={[0.07, 0.28, 10]} />
      </mesh>
    </group>
  );
}

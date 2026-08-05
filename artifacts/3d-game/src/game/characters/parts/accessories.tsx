import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { PartProps } from '../types';
import { mulberry32 } from '../rng';
import { sphereGeo, cylinderGeo, coneGeo, torusGeo, boxGeo } from '../geometry';

// ---- Back parts (rendered behind the body, origin ≈ upper back) ----

/**
 * The hero's backpack, migrated here. Note: drei's RoundedBox IS a mesh —
 * never nest it inside a <mesh> (that was a bug in the old Hero.tsx).
 */
export function Satchel({ palette, gradientMap }: PartProps) {
  return (
    <RoundedBox args={[0.3, 0.4, 0.15]} radius={0.05} castShadow>
      <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
    </RoundedBox>
  );
}

export function Wings({ palette, gradientMap, seed }: PartProps) {
  const spread = useMemo(() => 0.5 + mulberry32(seed)() * 0.3, [seed]);
  return (
    <group>
      <mesh position={[-0.16, 0.06, -0.02]} rotation={[0, spread, 0.5]} scale={[1, 1.6, 0.35]} geometry={sphereGeo(0.14, 8)}>
        <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.16, 0.06, -0.02]} rotation={[0, -spread, -0.5]} scale={[1, 1.6, 0.35]} geometry={sphereGeo(0.14, 8)}>
        <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
      </mesh>
    </group>
  );
}

export function Jetpack({ palette, gradientMap }: PartProps) {
  return (
    <group>
      <mesh position={[-0.09, 0, 0]} geometry={cylinderGeo(0.07, 0.07, 0.34)}>
        <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.09, 0, 0]} geometry={cylinderGeo(0.07, 0.07, 0.34)}>
        <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[-0.09, -0.21, 0]} rotation={[Math.PI, 0, 0]} geometry={coneGeo(0.06, 0.08, 10)}>
        <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0.09, -0.21, 0]} rotation={[Math.PI, 0, 0]} geometry={coneGeo(0.06, 0.08, 10)}>
        <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

export function Cape({ palette, gradientMap }: PartProps) {
  return (
    <mesh position={[0, -0.14, 0.02]} rotation={[0.12, 0, 0]}>
      {/* Half-open cylinder = lightly curved cloth plane */}
      <cylinderGeometry args={[0.24, 0.34, 0.62, 12, 1, true, Math.PI, Math.PI]} />
      <meshToonMaterial color={palette.accent} gradientMap={gradientMap} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function Shell({ palette, gradientMap }: PartProps) {
  return (
    <group rotation={[0.35, 0, 0]}>
      <mesh scale={[1, 1, 0.62]} castShadow geometry={sphereGeo(0.26)}>
        <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 0, -0.13]} rotation={[Math.PI / 2, 0, 0]} scale={0.8} geometry={torusGeo(0.16, 0.035)}>
        <meshToonMaterial color={palette.accent} gradientMap={gradientMap} />
      </mesh>
    </group>
  );
}

// ---- Neck parts (origin ≈ base of the head) ----

export function Scarf({ palette, gradientMap }: PartProps) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} geometry={torusGeo(0.2, 0.07)}>
        <meshToonMaterial color={palette.accent} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.1, -0.14, -0.16]} rotation={[0.25, 0, 0.1]} geometry={boxGeo(0.1, 0.22, 0.03)}>
        <meshToonMaterial color={palette.accent} gradientMap={gradientMap} />
      </mesh>
    </group>
  );
}

export function Turtleneck({ palette, gradientMap }: PartProps) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.6]} geometry={torusGeo(0.19, 0.08)}>
      <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
    </mesh>
  );
}

export function GlowNecklace({ palette, gradientMap, seed }: PartProps) {
  const beads = useMemo(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: 5 }).map((_, i) => ({
      angle: Math.PI * (0.15 + (i / 4) * 0.7) + (rand() - 0.5) * 0.1,
      size: 0.03 + rand() * 0.015,
    }));
  }, [seed]);
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} geometry={torusGeo(0.2, 0.015)}>
        <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
      </mesh>
      {beads.map((b, i) => (
        <mesh key={i} position={[Math.cos(b.angle + Math.PI / 2) * 0.2, -0.03, Math.sin(b.angle + Math.PI / 2) * 0.2]} geometry={sphereGeo(b.size, 8)}>
          <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
}

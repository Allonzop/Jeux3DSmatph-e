import React, { useMemo } from 'react';
import * as THREE from 'three';
import { PartProps } from '../types';
import { mulberry32 } from '../rng';
import { sphereGeo, cylinderGeo, coneGeo, torusGeo } from '../geometry';

// All headwear parts render inside the head group (origin = head center,
// head radius ~0.3-0.36). Colors always come from the palette.

const mushroomProfile = (() => [
  new THREE.Vector2(0, 0.4),
  new THREE.Vector2(0.3, 0.35),
  new THREE.Vector2(0.5, 0.2),
  new THREE.Vector2(0.55, 0.0),
  new THREE.Vector2(0.5, -0.05),
  new THREE.Vector2(0.4, -0.05),
  new THREE.Vector2(0, 0),
])();

export function MushroomCap({ palette, gradientMap, seed }: PartProps) {
  const spots = useMemo(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: 3 }).map(() => ({
      angle: rand() * Math.PI * 2,
      y: 0.12 + rand() * 0.12,
      size: 0.05 + rand() * 0.04,
    }));
  }, [seed]);
  return (
    <mesh position={[0, 0.2, 0]} castShadow>
      <latheGeometry args={[mushroomProfile, 32]} />
      <meshToonMaterial color={palette.accent} gradientMap={gradientMap} />
      {spots.map((s, i) => (
        <mesh
          key={i}
          position={[Math.cos(s.angle) * 0.28, s.y, Math.sin(s.angle) * 0.28]}
          scale={[1, 0.2, 1]}
          rotation={[0.4, -s.angle, 0]}
          geometry={sphereGeo(s.size, 8)}
        >
          <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
        </mesh>
      ))}
    </mesh>
  );
}

export function Beanie({ palette, gradientMap }: PartProps) {
  return (
    <group position={[0, 0.25, 0]}>
      <mesh scale={[1, 0.6, 1]} castShadow geometry={sphereGeo(0.35)}>
        <meshToonMaterial color={palette.primary} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 0.22, 0]} geometry={sphereGeo(0.08)}>
        <meshToonMaterial color={palette.accent} gradientMap={gradientMap} />
      </mesh>
    </group>
  );
}

export function AntennaDome({ palette, gradientMap }: PartProps) {
  return (
    <group position={[0, 0.3, 0]}>
      <mesh scale={[1, 0.4, 1]} castShadow geometry={sphereGeo(0.32)}>
        <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 0.2, 0]} geometry={cylinderGeo(0.015, 0.015, 0.2)}>
        <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 0.3, 0]} geometry={sphereGeo(0.06)}>
        <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

/**
 * The hero's space helmet, extracted and generalized: glass bubble, collar
 * and glowing antenna. Glass tint/opacity stay fixed (it's "glass", not a
 * team color); collar + antenna tip follow the palette.
 */
export function VisorHelmet({ palette, gradientMap }: PartProps) {
  return (
    <group>
      <mesh scale={[1.1, 1.05, 1.1]} geometry={sphereGeo(0.34, 24)}>
        <meshStandardMaterial color="#aaddff" transparent opacity={0.25} roughness={0.1} />
      </mesh>
      <mesh position={[0, -0.32, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={torusGeo(0.32, 0.06)}>
        <meshToonMaterial color="#f0f0f0" gradientMap={gradientMap} />
      </mesh>
      <group position={[0, 0.38, 0]}>
        <mesh position={[0, 0.1, 0]} geometry={cylinderGeo(0.015, 0.015, 0.2)}>
          <meshToonMaterial color="#cccccc" gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, 0.2, 0]} geometry={sphereGeo(0.06)}>
          <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={2} />
        </mesh>
      </group>
    </group>
  );
}

export function Hood({ palette, gradientMap }: PartProps) {
  return (
    <group>
      {/* Shell around the back of the head, open on the face side */}
      <mesh rotation={[0.35, 0, 0]} scale={[1.16, 1.18, 1.16]} castShadow>
        <sphereGeometry args={[0.34, 20, 20, Math.PI * 0.75, Math.PI * 1.5]} />
        <meshToonMaterial color={palette.primary} gradientMap={gradientMap} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.18, -0.3]} rotation={[-0.9, 0, 0]} geometry={coneGeo(0.14, 0.3, 8)}>
        <meshToonMaterial color={palette.primary} gradientMap={gradientMap} />
      </mesh>
    </group>
  );
}

export function ConeHat({ palette, gradientMap, seed }: PartProps) {
  const tilt = useMemo(() => (mulberry32(seed)() - 0.5) * 0.25, [seed]);
  return (
    <group position={[0, 0.32, 0]} rotation={[0, 0, tilt]}>
      <mesh position={[0, 0.18, 0]} castShadow geometry={coneGeo(0.26, 0.5, 16)}>
        <meshToonMaterial color={palette.accent} gradientMap={gradientMap} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} geometry={torusGeo(0.26, 0.045)}>
        <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
      </mesh>
    </group>
  );
}

export function LeafCrown({ palette, gradientMap, seed }: PartProps) {
  const leaves = useMemo(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: 6 }).map((_, i) => ({
      angle: (i / 6) * Math.PI * 2 + rand() * 0.4,
      size: 0.8 + rand() * 0.5,
      tilt: 0.5 + rand() * 0.5,
    }));
  }, [seed]);
  return (
    <group position={[0, 0.24, 0]}>
      {leaves.map((l, i) => (
        <group key={i} rotation={[0, l.angle, 0]}>
          <mesh
            position={[0.26, 0.02, 0]}
            rotation={[0, 0, l.tilt]}
            scale={[l.size, l.size, l.size * 0.4]}
            geometry={sphereGeo(0.09, 8)}
          >
            <meshToonMaterial color={palette.accent} gradientMap={gradientMap} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Hair({ palette, gradientMap, seed }: PartProps) {
  const tufts = useMemo(() => {
    const rand = mulberry32(seed);
    return [
      { pos: [0, 0.26, 0.02] as const, scale: [1.05, 0.55, 1.05] as const, r: 0.3 + rand() * 0.04 },
      { pos: [0.16, 0.2, -0.1] as const, scale: [0.8, 0.5, 0.8] as const, r: 0.24 + rand() * 0.04 },
      { pos: [-0.15, 0.22, -0.06] as const, scale: [0.75, 0.5, 0.75] as const, r: 0.24 + rand() * 0.04 },
    ];
  }, [seed]);
  return (
    <group>
      {tufts.map((t, i) => (
        <mesh key={i} position={[t.pos[0], t.pos[1], t.pos[2]]} scale={[t.scale[0], t.scale[1], t.scale[2]]} castShadow geometry={sphereGeo(t.r, 12)}>
          <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
        </mesh>
      ))}
    </group>
  );
}

export function HornHelmet({ palette, gradientMap, seed }: PartProps) {
  const hornAngle = useMemo(() => 0.5 + mulberry32(seed)() * 0.35, [seed]);
  return (
    <group position={[0, 0.2, 0]}>
      <mesh scale={[1, 0.55, 1]} castShadow geometry={sphereGeo(0.36)}>
        <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[-0.28, 0.12, 0]} rotation={[0, 0, hornAngle]} geometry={coneGeo(0.07, 0.28, 8)}>
        <meshToonMaterial color={palette.accent} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.28, 0.12, 0]} rotation={[0, 0, -hornAngle]} geometry={coneGeo(0.07, 0.28, 8)}>
        <meshToonMaterial color={palette.accent} gradientMap={gradientMap} />
      </mesh>
    </group>
  );
}

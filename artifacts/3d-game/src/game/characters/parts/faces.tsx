import React from 'react';
import * as THREE from 'three';
import { PartProps, EyeShape, MouthShape, Palette } from '../types';
import { sphereGeo, torusGeo, boxGeo } from '../geometry';

// ---- Face gear (origin = face anchor, in front of the head) ----

export function RoundGlasses({ palette }: PartProps) {
  return (
    <group position={[0, 0.05, 0.04]}>
      <mesh position={[-0.12, 0, 0]} geometry={torusGeo(0.08, 0.012)}>
        <meshBasicMaterial color={palette.secondary} />
      </mesh>
      <mesh position={[0.12, 0, 0]} geometry={torusGeo(0.08, 0.012)}>
        <meshBasicMaterial color={palette.secondary} />
      </mesh>
      <mesh geometry={boxGeo(0.09, 0.015, 0.015)}>
        <meshBasicMaterial color={palette.secondary} />
      </mesh>
    </group>
  );
}

export function TintedVisor({ palette }: PartProps) {
  return (
    <mesh position={[0, 0.05, 0.02]} scale={[1.3, 0.55, 0.5]} geometry={sphereGeo(0.18, 16)}>
      <meshStandardMaterial color={palette.accent} transparent opacity={0.55} roughness={0.15} />
    </mesh>
  );
}

export function Mask({ palette, gradientMap }: PartProps) {
  return (
    <mesh position={[0, -0.09, 0.03]} scale={[1.5, 1, 0.7]} geometry={sphereGeo(0.11, 12)}>
      <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
    </mesh>
  );
}

// ---- Eyes / mouth / brows (always present, driven by def fields) ----

const EYE_SCALES: Record<EyeShape, [number, number, number]> = {
  round: [1, 1.4, 0.5], // historical hero eyes
  oval: [0.85, 1.9, 0.5],
  wide: [1.5, 1.1, 0.5],
  sleepy: [1.3, 0.6, 0.5],
};

export function Eyes({
  shape,
  eyesRef,
  radius = 0.06,
}: {
  shape: EyeShape;
  eyesRef: React.RefObject<THREE.Group | null>;
  radius?: number;
}) {
  const s = EYE_SCALES[shape];
  return (
    <group ref={eyesRef}>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.05, 0]} scale={s} geometry={sphereGeo(radius)}>
          <meshBasicMaterial color="#ffffff" />
          <mesh position={[0, 0, 0.05]} scale={[0.5, 0.5, 1]} geometry={sphereGeo(radius)}>
            <meshBasicMaterial color="#111111" />
          </mesh>
        </mesh>
      ))}
    </group>
  );
}

export function Mouth({ shape }: { shape: MouthShape }) {
  switch (shape) {
    case 'smile':
      return (
        <mesh position={[0, -0.08, 0.02]} rotation={[Math.PI, 0, 0]} geometry={torusGeo(0.06, 0.015, Math.PI * 0.8)}>
          <meshBasicMaterial color="#aa6655" />
        </mesh>
      );
    case 'grin':
      return (
        <group position={[0, -0.07, 0.02]}>
          <mesh rotation={[Math.PI, 0, Math.PI * 0.1]} geometry={torusGeo(0.085, 0.02, Math.PI)}>
            <meshBasicMaterial color="#5c2233" />
          </mesh>
          <mesh position={[0, -0.045, 0.012]} geometry={boxGeo(0.06, 0.025, 0.01)}>
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      );
    case 'neutral':
      return (
        <mesh position={[0, -0.08, 0.02]} geometry={boxGeo(0.08, 0.016, 0.012)}>
          <meshBasicMaterial color="#aa6655" />
        </mesh>
      );
    case 'o':
      return (
        <mesh position={[0, -0.09, 0.02]} geometry={torusGeo(0.035, 0.014)}>
          <meshBasicMaterial color="#aa6655" />
        </mesh>
      );
  }
}

export function Brows({ palette }: { palette: Palette }) {
  return (
    <group position={[0, 0.14, 0.02]}>
      <mesh position={[-0.12, 0, 0]} rotation={[0, 0, 0.2]} geometry={boxGeo(0.09, 0.02, 0.015)}>
        <meshBasicMaterial color={palette.secondary} />
      </mesh>
      <mesh position={[0.12, 0, 0]} rotation={[0, 0, -0.2]} geometry={boxGeo(0.09, 0.02, 0.015)}>
        <meshBasicMaterial color={palette.secondary} />
      </mesh>
    </group>
  );
}

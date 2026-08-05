import React, { useMemo } from 'react';
import { Float } from '@react-three/drei';
import { useToonGradient } from './utils';
import { SCATTER, WORLD_RADIUS } from '../world';
import * as THREE from 'three';

export function Ground() {
  const gradientMap = useToonGradient();

  // Organic plateau profile — radius driven by WORLD_RADIUS
  const plateauProfile = useMemo(() => {
    const r = WORLD_RADIUS;
    return [
      new THREE.Vector2(0, 0.5),
      new THREE.Vector2(r, 0.5),
      new THREE.Vector2(r + 0.5, 0.3),
      new THREE.Vector2(r + 0.7, 0.0),
      new THREE.Vector2(r + 0.5, -0.3),
      new THREE.Vector2(r, -0.5),
      new THREE.Vector2(0, -0.5),
    ];
  }, []);

  // Deterministic scatter shared with placement validation (world.ts)
  const { trees, bushes, flowers, rocks, pond } = SCATTER;

  return (
    <group position={[0, -0.5, 0]}>
      {/* Top Plateau */}
      <mesh receiveShadow castShadow>
        <latheGeometry args={[plateauProfile, 64]} />
        <meshToonMaterial color="#6ede8a" gradientMap={gradientMap} />
      </mesh>
      
      {/* Rocky Cone Underbelly — Y-only rotation and kept below the plateau:
          X/Z rotations mixed the 10-14x horizontal scale into the vertical
          axis, poking a giant "mountain" through the middle of the map. */}
      <group position={[0, -0.4, 0]}>
        <mesh position={[0, -3, 0]} rotation={[0, 1.3, 0]} scale={[14, 2.8, 14]} receiveShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#7a5c47" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, -4.5, 0]} rotation={[0, 2.2, 0]} scale={[10, 3.5, 10]} receiveShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#664d5c" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, -7, 0]} rotation={[0, 0.8, 0]} scale={[5.5, 4, 5.5]} receiveShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#4a3d5c" flatShading roughness={1} />
        </mesh>
      </group>

      {/* Floating Shards */}
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1} position={[18, -2, -10]}>
        <mesh scale={[1.5, 2, 1.5]} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#7a5c47" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 0.8, 0]} scale={[1.4, 0.4, 1.4]} castShadow receiveShadow>
          <sphereGeometry args={[1, 8, 8]} />
          <meshToonMaterial color="#6ede8a" gradientMap={gradientMap} />
        </mesh>
      </Float>
      
      <Float speed={1.2} rotationIntensity={0.8} floatIntensity={1.5} position={[-16, -5, 13]}>
        <mesh scale={[2, 2.5, 2]} rotation={[0.4, 0.2, 0]} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#4a3d5c" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 1.2, 0]} scale={[1.8, 0.5, 1.8]} castShadow receiveShadow>
          <sphereGeometry args={[1, 8, 8]} />
          <meshToonMaterial color="#6ede8a" gradientMap={gradientMap} />
        </mesh>
      </Float>

      {/* Scatter: Pond */}
      <group position={[pond.pos[0], pond.pos[1] + 0.02, pond.pos[2]]}>
        <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.5, 32]} />
          <meshStandardMaterial color="#4cc9f0" roughness={0.1} emissive="#4cc9f0" emissiveIntensity={0.2} />
        </mesh>
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.01, 0]}>
          <torusGeometry args={[1.5, 0.15, 8, 32]} />
          <meshToonMaterial color="#7a5c47" gradientMap={gradientMap} />
        </mesh>
      </group>

      {/* Scatter: Trees */}
      {trees.map((t, i) => (
        <group key={`tree-${i}`} position={t.pos} scale={t.scale} rotation={[0, t.rot, 0]}>
          <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.1, 0.2, 1.2, 8]} />
            <meshToonMaterial color="#8a6343" gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, 1.2, 0]} scale={[1, 0.8, 1]} castShadow receiveShadow>
            <sphereGeometry args={[0.7, 16, 16]} />
            <meshToonMaterial color="#3fa871" gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0.3, 1.5, 0.2]} scale={[0.8, 0.6, 0.8]} castShadow receiveShadow>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshToonMaterial color="#57cc99" gradientMap={gradientMap} />
          </mesh>
          <mesh position={[-0.3, 1.4, -0.2]} scale={[0.8, 0.6, 0.8]} castShadow receiveShadow>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshToonMaterial color="#57cc99" gradientMap={gradientMap} />
          </mesh>
        </group>
      ))}

      {/* Scatter: Bushes */}
      {bushes.map((b, i) => (
        <group key={`bush-${i}`} position={b.pos} scale={b.scale}>
          <mesh position={[0, 0.2, 0]} scale={[1, 0.8, 1]} castShadow receiveShadow>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshToonMaterial color="#3fa871" gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0.2, 0.15, 0.2]} scale={[1, 0.7, 1]} castShadow receiveShadow>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshToonMaterial color="#57cc99" gradientMap={gradientMap} />
          </mesh>
          <mesh position={[-0.2, 0.15, -0.1]} scale={[1, 0.7, 1]} castShadow receiveShadow>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshToonMaterial color="#57cc99" gradientMap={gradientMap} />
          </mesh>
        </group>
      ))}

      {/* Scatter: Flowers */}
      {flowers.map((f, i) => (
        <group key={`flower-${i}`} position={f.pos} scale={f.scale}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.4]} />
            <meshToonMaterial color="#3fa871" />
          </mesh>
          <group position={[0, 0.4, 0]} rotation={[0.4, f.rot, 0]}>
            <mesh rotation={[Math.PI/2, 0, 0]}>
              <torusGeometry args={[0.12, 0.04, 8, 8]} />
              <meshToonMaterial color={f.type === 0 ? "#ff70a6" : "#ffd24c"} gradientMap={gradientMap} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshStandardMaterial emissive="#fff" emissiveIntensity={0.5} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Scatter: Rocks */}
      {rocks.map((r, i) => (
        <mesh key={`rock-${i}`} position={r.pos} rotation={[r.rot * 0.7, r.rot, r.rot * 1.3]} scale={r.scale} castShadow receiveShadow>
          <icosahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color="#888888" flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, TUTORIAL_DONE } from '../store';
import { RESOURCE_NODE_POSITIONS, surfacePos, surfaceRotation } from '../world';

/**
 * Pulsing golden ring highlighting the current tutorial target:
 * step 1 → the boulons node, step 2 → the placed hutte, step 3 → the core.
 * Position/scale are driven imperatively; only the step subscription re-renders.
 */
export function TutorialHighlight() {
  const step = useGameStore(state => state.tutorialStep);
  const huttePos = useGameStore(state => state.buildingPositions['hutte']);
  const ringRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.12;
    ringRef.current.scale.setScalar(pulse);
    if (matRef.current) {
      matRef.current.opacity = 0.55 + Math.sin(clock.elapsedTime * 4) * 0.25;
    }
  });

  if (step >= TUTORIAL_DONE) return null;

  let target: [number, number, number] | null = null;
  let radius = 1.4;
  if (step === 1) {
    target = RESOURCE_NODE_POSITIONS.boulons;
    radius = 1.6;
  } else if (step === 2 && huttePos) {
    target = huttePos;
    radius = 1.8;
  } else if (step === 3) {
    target = [0, 0, 0]; // crystal core
    radius = 2.4;
  }
  if (!target) return null;

  return (
    <group position={surfacePos(target[0], target[2], 0.06)} rotation={surfaceRotation(target[0], target[2])}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius, radius + 0.22, 48]} />
        <meshBasicMaterial ref={matRef} color="#ffd24c" transparent opacity={0.7} depthWrite={false} />
      </mesh>
      <pointLight color="#ffd24c" intensity={1.2} distance={5} position={[0, 1, 0]} />
    </group>
  );
}

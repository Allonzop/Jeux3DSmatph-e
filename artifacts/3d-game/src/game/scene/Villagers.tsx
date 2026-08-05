import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ToonHumanoid } from '../characters/ToonHumanoid';
import { villagerDefs } from '../characters/defs';
import { mulberry32 } from '../characters/rng';
import type { CharacterDef } from '../characters/types';

// Deterministic spawn spots spread around the crystal.
function spawnFor(index: number): [number, number, number] {
  const angle = (index / villagerDefs.length) * Math.PI * 2 + 0.7;
  const radius = 3.5 + (index % 3);
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

export function Villagers() {
  return (
    <group>
      {villagerDefs.map((def, i) => (
        <Villager key={def.id} def={def} start={spawnFor(i)} />
      ))}
    </group>
  );
}

function Villager({ def, start }: { def: CharacterDef; start: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);

  // AI state — refs only, never React state (per-frame data).
  const pos = useRef(new THREE.Vector3(...start));
  const target = useRef(new THREE.Vector3(...start));
  const aiState = useRef<'idle' | 'walk'>('idle');
  // Seeded rng for AI decisions — no Math.random() in useFrame.
  const rng = useMemo(() => mulberry32(def.seed ^ 0xa11ce), [def.seed]);
  const timer = useRef(rng() * 2);

  const pickTarget = () => {
    const newTarget = new THREE.Vector3();
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 10) {
      const angle = rng() * Math.PI * 2;
      const radius = 3 + rng() * 4; // Between 3 and 7
      newTarget.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      // Avoid center (crystal)
      if (newTarget.length() > 2.5) valid = true;
      attempts++;
    }
    target.current.copy(newTarget);
    aiState.current = 'walk';
  };

  const isMoving = () => aiState.current === 'walk';

  useFrame((_, delta) => {
    // AI Logic
    if (aiState.current === 'idle') {
      timer.current -= delta;
      if (timer.current <= 0) pickTarget();
    } else {
      const dir = target.current.clone().sub(pos.current);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 0.1) {
        aiState.current = 'idle';
        timer.current = 2 + rng() * 2;
      } else {
        dir.normalize();
        pos.current.addScaledVector(dir, 1.2 * delta);

        // Rotation
        if (groupRef.current) {
          const targetRot = Math.atan2(dir.x, dir.z);
          const currentRot = groupRef.current.rotation.y;
          let diff = targetRot - currentRot;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          groupRef.current.rotation.y += diff * 0.1;
        }
      }
    }

    if (groupRef.current) {
      groupRef.current.position.copy(pos.current);
    }
  });

  return (
    <group ref={groupRef}>
      <ToonHumanoid def={def} moving={isMoving} />
    </group>
  );
}

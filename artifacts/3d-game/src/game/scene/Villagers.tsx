import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ToonHumanoid } from '../characters/ToonHumanoid';
import { villagerDefs } from '../characters/defs';
import { mulberry32 } from '../characters/rng';
import { CharacterDef } from '../characters/types';

// Spawn spots spread around the village (indexed by villager order).
const STARTS: [number, number, number][] = [
  [-3, 0, 3], [4, 0, -2], [0, 0, -5], [-5, 0, -2],
  [6, 0, 4], [-2, 0, 6], [7, 0, -5], [3, 0, 7],
];

export function Villagers() {
  return (
    <group>
      {villagerDefs.map((def, i) => (
        <Villager key={def.id} def={def} start={STARTS[i % STARTS.length]} />
      ))}
    </group>
  );
}

function Villager({ def, start }: { def: CharacterDef; start: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);

  // Deterministic AI randomness — no Math.random in useFrame.
  const rand = useMemo(() => mulberry32(def.seed * 7 + 13), [def.seed]);

  // AI state (refs only; `walking` is a low-frequency React state for the rig)
  const pos = useRef(new THREE.Vector3(...start));
  const target = useRef(new THREE.Vector3(...start));
  const state = useRef<'idle' | 'walk'>('idle');
  const timer = useRef(rand() * 2);
  const [walking, setWalking] = useState(false);

  const pickTarget = () => {
    const newTarget = new THREE.Vector3();
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 10) {
      const angle = rand() * Math.PI * 2;
      const radius = 3 + rand() * 4; // Between 3 and 7
      newTarget.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      // Avoid center (crystal)
      if (newTarget.length() > 2.5) valid = true;
      attempts++;
    }
    target.current.copy(newTarget);
    state.current = 'walk';
    setWalking(true);
  };

  useFrame((_, delta) => {
    // AI Logic
    if (state.current === 'idle') {
      timer.current -= delta;
      if (timer.current <= 0) pickTarget();
    } else {
      const dir = target.current.clone().sub(pos.current);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 0.1) {
        state.current = 'idle';
        setWalking(false);
        timer.current = 2 + rand() * 2;
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
      <ToonHumanoid def={def} moving={walking} />
    </group>
  );
}

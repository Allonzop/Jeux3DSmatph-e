import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { WORLD_RADIUS } from '../world';
import { ToonHumanoid } from '../characters/ToonHumanoid';
import { heroDef } from '../characters/defs';
import { mulberry32 } from '../characters/rng';

const SPEED = 4;
const DUST_COUNT = 8;

// Deterministic offsets for dust puffs (no Math.random in useFrame).
const dustRand = mulberry32(4242);

export function Hero() {
  const groupRef = useRef<THREE.Group>(null);
  const setHeroPos = useGameStore((state) => state.setHeroPos);

  const dustGroupRef = useRef<THREE.Group>(null);
  const tutorialMoveDist = useRef(0);
  const dustData = useRef(Array.from({ length: DUST_COUNT }).map(() => ({ active: false, time: 0, pos: new THREE.Vector3() })));
  const lastDustTime = useRef(0);
  const movingRef = useRef(false);
  const [moving, setMoving] = React.useState(false);

  useFrame((state, delta) => {
    const { heroPos, heroDir } = useGameStore.getState();
    const time = state.clock.elapsedTime;

    // Movement Logic
    const dx = heroDir[0];
    const dz = heroDir[1];
    const isMoving = dx !== 0 || dz !== 0;
    // Throttled React state: only flips when the value actually changes.
    if (isMoving !== movingRef.current) {
      movingRef.current = isMoving;
      setMoving(isMoving);
    }

    if (isMoving) {
      let nx = heroPos[0] + dx * SPEED * delta;
      let nz = heroPos[2] + dz * SPEED * delta;

      const dist = Math.sqrt(nx * nx + nz * nz);
      if (dist > WORLD_RADIUS) {
        nx = (nx / dist) * WORLD_RADIUS;
        nz = (nz / dist) * WORLD_RADIUS;
      }
      setHeroPos([nx, heroPos[1], nz]);

      // Tutorial step 0: completed after walking ~3 units total.
      const gs = useGameStore.getState();
      if (gs.tutorialStep === 0) {
        tutorialMoveDist.current += SPEED * delta;
        if (tutorialMoveDist.current > 3) gs.notifyTutorial('move');
      }
    }

    // Visual Interpolation
    if (groupRef.current) {
      const logicalPos = useGameStore.getState().heroPos;
      const targetPos = new THREE.Vector3(logicalPos[0], logicalPos[1], logicalPos[2]);
      groupRef.current.position.lerp(targetPos, 0.2);

      if (isMoving) {
        const targetRot = Math.atan2(dx, dz);
        const currentRot = groupRef.current.rotation.y;
        let diff = targetRot - currentRot;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        groupRef.current.rotation.y += diff * 0.2;
      }
    }

    // Dust emission while walking (synced to the walk cycle bounce)
    if (isMoving) {
      const bounce = Math.abs(Math.sin(time * 15));
      if (time > lastDustTime.current + 0.15 && bounce < 0.1) {
        lastDustTime.current = time;
        const inactiveDust = dustData.current.find(d => !d.active);
        if (inactiveDust && groupRef.current) {
          inactiveDust.active = true;
          inactiveDust.time = 0;
          groupRef.current.getWorldPosition(inactiveDust.pos);
          inactiveDust.pos.y = -0.4;
          inactiveDust.pos.x += (dustRand() - 0.5) * 0.3;
          inactiveDust.pos.z += (dustRand() - 0.5) * 0.3;
        }
      }
    }

    // Update Dust
    if (dustGroupRef.current) {
      const children = dustGroupRef.current.children;
      dustData.current.forEach((data, i) => {
        const mesh = children[i] as THREE.Mesh;
        if (data.active) {
          data.time += delta;
          const progress = data.time / 0.5; // half second life
          if (progress >= 1) {
            data.active = false;
            mesh.visible = false;
          } else {
            mesh.visible = true;
            dustGroupRef.current?.worldToLocal(mesh.position.copy(data.pos));
            mesh.position.y += progress * 0.5;
            mesh.scale.setScalar(1 - progress);
            (mesh.material as THREE.Material).opacity = (1 - progress) * 0.5;
          }
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Global dust group attached to hero but conceptually detached by using world pos conversion */}
      <group ref={dustGroupRef}>
        {Array.from({ length: DUST_COUNT }).map((_, i) => (
          <mesh key={i} visible={false}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color="#e5d3b3" transparent depthWrite={false} />
          </mesh>
        ))}
      </group>

      <ToonHumanoid def={heroDef} moving={moving} />
    </group>
  );
}

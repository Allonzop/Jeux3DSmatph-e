import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { useToonGradient } from './utils';
import { WORLD_RADIUS } from '../world';
import { RoundedBox } from '@react-three/drei';

const SPEED = 4;
const DUST_COUNT = 8;

export function Hero() {
  const groupRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Group>(null);
  const legRRef = useRef<THREE.Group>(null);
  const eyesRef = useRef<THREE.Group>(null);

  const gradientMap = useToonGradient();
  const setHeroPos = useGameStore((state) => state.setHeroPos);

  const dustGroupRef = useRef<THREE.Group>(null);
  const tutorialMoveDist = useRef(0);
  const dustData = useRef(Array.from({ length: DUST_COUNT }).map(() => ({ active: false, time: 0, pos: new THREE.Vector3() })));
  const lastDustTime = useRef(0);
  const blinkTimer = useRef(0);

  useFrame((state, delta) => {
    const { heroPos, heroDir } = useGameStore.getState();
    const time = state.clock.elapsedTime;

    // Movement Logic
    let dx = heroDir[0];
    let dz = heroDir[1];
    let isMoving = dx !== 0 || dz !== 0;
    
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

    // Animations
    if (bodyGroupRef.current && armLRef.current && armRRef.current && legLRef.current && legRRef.current && headGroupRef.current) {
      if (isMoving) {
        const walkCycle = Math.sin(time * 15);
        const walkCycleCos = Math.cos(time * 15);
        
        // Bounce squash/stretch
        const bounce = Math.abs(walkCycle);
        bodyGroupRef.current.position.y = bounce * 0.15;
        bodyGroupRef.current.scale.set(1 - bounce * 0.1, 1 + bounce * 0.2, 1 - bounce * 0.1);
        
        armLRef.current.rotation.x = walkCycleCos * 0.8;
        armRRef.current.rotation.x = -walkCycleCos * 0.8;
        legLRef.current.rotation.x = -walkCycleCos * 0.8;
        legRRef.current.rotation.x = walkCycleCos * 0.8;
        
        headGroupRef.current.rotation.x = 0.1; // tilt forward
        headGroupRef.current.rotation.z = walkCycleCos * 0.05; // slight head bob side to side

        // Dust emission
        if (time > lastDustTime.current + 0.15 && bounce < 0.1) {
          lastDustTime.current = time;
          const inactiveDust = dustData.current.find(d => !d.active);
          if (inactiveDust && groupRef.current) {
            inactiveDust.active = true;
            inactiveDust.time = 0;
            // Place dust at global pos
            groupRef.current.getWorldPosition(inactiveDust.pos);
            inactiveDust.pos.y = -0.4;
            inactiveDust.pos.x += (Math.random() - 0.5) * 0.3;
            inactiveDust.pos.z += (Math.random() - 0.5) * 0.3;
          }
        }
      } else {
        // Idle
        const idleCycle = Math.sin(time * 2);
        bodyGroupRef.current.position.y = idleCycle * 0.03;
        bodyGroupRef.current.scale.setScalar(1);
        
        armLRef.current.rotation.x = Math.sin(time * 2 + 1) * 0.05;
        armRRef.current.rotation.x = -Math.sin(time * 2 + 1) * 0.05;
        legLRef.current.rotation.x = 0;
        legRRef.current.rotation.x = 0;
        
        headGroupRef.current.rotation.x = Math.sin(time * 1.5) * 0.02;
        headGroupRef.current.rotation.z = 0;
      }
    }

    // Blinking
    blinkTimer.current += delta;
    if (blinkTimer.current > 3) {
      if (blinkTimer.current > 3.1) {
        blinkTimer.current = 0;
      }
    }
    if (eyesRef.current) {
      const isBlinking = blinkTimer.current > 3 && blinkTimer.current < 3.1;
      eyesRef.current.scale.y = isBlinking ? 0.1 : 1;
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

      <group ref={bodyGroupRef} position={[0, 0, 0]}>
        {/* Body */}
        <mesh position={[0, 0, 0]} castShadow>
          <capsuleGeometry args={[0.22, 0.3, 8, 16]} />
          <meshToonMaterial color="#ff8c42" gradientMap={gradientMap} />
        </mesh>

        {/* Backpack */}
        <mesh position={[0, 0.05, -0.2]} castShadow>
          <RoundedBox args={[0.3, 0.4, 0.15]} radius={0.05} />
          <meshToonMaterial color="#4cc9f0" gradientMap={gradientMap} />
        </mesh>

        {/* Head Group */}
        <group ref={headGroupRef} position={[0, 0.35, 0]}>
          {/* Head Sphere */}
          <mesh scale={[1, 0.94, 1]} castShadow>
            <sphereGeometry args={[0.34, 24, 24]} />
            <meshToonMaterial color="#ffd9b3" gradientMap={gradientMap} />
          </mesh>
          
          {/* Helmet Glass */}
          <mesh scale={[1.1, 1.05, 1.1]}>
            <sphereGeometry args={[0.34, 24, 24]} />
            <meshStandardMaterial color="#aaddff" transparent opacity={0.25} roughness={0.1} />
          </mesh>

          {/* Helmet Collar */}
          <mesh position={[0, -0.32, 0]} rotation={[Math.PI/2, 0, 0]}>
            <torusGeometry args={[0.32, 0.06, 16, 32]} />
            <meshToonMaterial color="#f0f0f0" gradientMap={gradientMap} />
          </mesh>

          {/* Face */}
          <group position={[0, -0.05, 0.32]}>
            {/* Eyes */}
            <group ref={eyesRef}>
              <mesh position={[-0.12, 0.05, 0]} scale={[1, 1.4, 0.5]}>
                <sphereGeometry args={[0.06, 16, 16]} />
                <meshBasicMaterial color="#ffffff" />
                <mesh position={[0, 0, 0.05]} scale={[0.5, 0.5, 1]}>
                  <sphereGeometry args={[0.06, 16, 16]} />
                  <meshBasicMaterial color="#111111" />
                </mesh>
              </mesh>
              <mesh position={[0.12, 0.05, 0]} scale={[1, 1.4, 0.5]}>
                <sphereGeometry args={[0.06, 16, 16]} />
                <meshBasicMaterial color="#ffffff" />
                <mesh position={[0, 0, 0.05]} scale={[0.5, 0.5, 1]}>
                  <sphereGeometry args={[0.06, 16, 16]} />
                  <meshBasicMaterial color="#111111" />
                </mesh>
              </mesh>
            </group>
            
            {/* Smile */}
            <mesh position={[0, -0.08, 0.02]} rotation={[Math.PI, 0, 0]}>
              <torusGeometry args={[0.06, 0.015, 8, 16, Math.PI * 0.8]} />
              <meshBasicMaterial color="#aa6655" />
            </mesh>
          </group>

          {/* Antenna */}
          <group position={[0, 0.38, 0]}>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.2]} />
              <meshToonMaterial color="#cccccc" gradientMap={gradientMap} />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshStandardMaterial color="#ffd24c" emissive="#ffd24c" emissiveIntensity={2} />
            </mesh>
          </group>
        </group>

        {/* Arms */}
        <group ref={armLRef} position={[-0.28, 0.1, 0]}>
          <mesh position={[0, -0.15, 0]} rotation={[0, 0, 0.2]} castShadow>
            <capsuleGeometry args={[0.07, 0.22, 8, 16]} />
            <meshToonMaterial color="#ff8c42" gradientMap={gradientMap} />
            <mesh position={[0, -0.16, 0]}>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshToonMaterial color="#ffffff" gradientMap={gradientMap} />
            </mesh>
          </mesh>
        </group>

        <group ref={armRRef} position={[0.28, 0.1, 0]}>
          <mesh position={[0, -0.15, 0]} rotation={[0, 0, -0.2]} castShadow>
            <capsuleGeometry args={[0.07, 0.22, 8, 16]} />
            <meshToonMaterial color="#ff8c42" gradientMap={gradientMap} />
            <mesh position={[0, -0.16, 0]}>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshToonMaterial color="#ffffff" gradientMap={gradientMap} />
            </mesh>
          </mesh>
        </group>

        {/* Legs */}
        <group ref={legLRef} position={[-0.12, -0.2, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.16, 8, 16]} />
            <meshToonMaterial color="#ff8c42" gradientMap={gradientMap} />
            <mesh position={[0, -0.12, 0.04]} scale={[1, 0.8, 1.2]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshToonMaterial color="#555555" gradientMap={gradientMap} />
            </mesh>
          </mesh>
        </group>

        <group ref={legRRef} position={[0.12, -0.2, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.16, 8, 16]} />
            <meshToonMaterial color="#ff8c42" gradientMap={gradientMap} />
            <mesh position={[0, -0.12, 0.04]} scale={[1, 0.8, 1.2]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshToonMaterial color="#555555" gradientMap={gradientMap} />
            </mesh>
          </mesh>
        </group>
      </group>
    </group>
  );
}

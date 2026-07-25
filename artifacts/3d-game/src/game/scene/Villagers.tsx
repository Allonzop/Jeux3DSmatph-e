import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useToonGradient } from './utils';

const VILLAGERS = [
  { id: 1, color: '#57cc99', hat: 'mushroom' as const, scale: 0.75, start: [-3, 0, 3] as const },
  { id: 2, color: '#b388eb', hat: 'beanie' as const, scale: 0.7, start: [4, 0, -2] as const },
  { id: 3, color: '#ffd24c', hat: 'antenna' as const, scale: 0.8, start: [0, 0, -5] as const },
];

export function Villagers() {
  return (
    <group>
      {VILLAGERS.map((v) => (
        <Villager key={v.id} def={v} />
      ))}
    </group>
  );
}

function Villager({ def }: { def: typeof VILLAGERS[0] }) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Group>(null);
  const legRRef = useRef<THREE.Group>(null);
  const eyesRef = useRef<THREE.Group>(null);

  const gradientMap = useToonGradient();
  
  // AI state
  const pos = useRef(new THREE.Vector3(...def.start));
  const target = useRef(new THREE.Vector3(...def.start));
  const state = useRef<'idle' | 'walk'>('idle');
  const timer = useRef(Math.random() * 2);

  const pickTarget = () => {
    let newTarget = new THREE.Vector3();
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 10) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 4; // Between 3 and 7
      newTarget.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      
      // Avoid center (crystal)
      if (newTarget.length() > 2.5) {
        valid = true;
      }
      attempts++;
    }
    target.current.copy(newTarget);
    state.current = 'walk';
  };

  const blinkTimer = useRef(Math.random() * 3);

  const mushroomProfile = useMemo(() => {
    return [
      new THREE.Vector2(0, 0.4),
      new THREE.Vector2(0.3, 0.35),
      new THREE.Vector2(0.5, 0.2),
      new THREE.Vector2(0.55, 0.0),
      new THREE.Vector2(0.5, -0.05),
      new THREE.Vector2(0.4, -0.05),
      new THREE.Vector2(0, 0)
    ];
  }, []);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime + def.id * 10; // offset animations

    // AI Logic
    if (state.current === 'idle') {
      timer.current -= delta;
      if (timer.current <= 0) {
        pickTarget();
      }
    } else {
      const dir = target.current.clone().sub(pos.current);
      dir.y = 0;
      const dist = dir.length();
      
      if (dist < 0.1) {
        state.current = 'idle';
        timer.current = 2 + Math.random() * 2;
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

    // Animations
    const isMoving = state.current === 'walk';
    
    if (bodyGroupRef.current && armLRef.current && armRRef.current && legLRef.current && legRRef.current && headGroupRef.current) {
      if (isMoving) {
        const walkCycle = Math.sin(time * 15);
        const walkCycleCos = Math.cos(time * 15);
        
        const bounce = Math.abs(walkCycle);
        bodyGroupRef.current.position.y = bounce * 0.15;
        bodyGroupRef.current.scale.set(1 - bounce * 0.1, 1 + bounce * 0.2, 1 - bounce * 0.1);
        
        armLRef.current.rotation.x = walkCycleCos * 0.8;
        armRRef.current.rotation.x = -walkCycleCos * 0.8;
        legLRef.current.rotation.x = -walkCycleCos * 0.8;
        legRRef.current.rotation.x = walkCycleCos * 0.8;
        
        headGroupRef.current.rotation.x = 0.1;
        headGroupRef.current.rotation.z = walkCycleCos * 0.05;
      } else {
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

    blinkTimer.current += delta;
    if (blinkTimer.current > 3) {
      if (blinkTimer.current > 3.1) {
        blinkTimer.current = 0;
      }
    }
    if (eyesRef.current) {
      eyesRef.current.scale.y = (blinkTimer.current > 3 && blinkTimer.current < 3.1) ? 0.1 : 1;
    }
  });

  return (
    <group ref={groupRef} scale={def.scale}>
      <group ref={bodyGroupRef} position={[0, 0, 0]}>
        {/* Body */}
        <mesh position={[0, 0, 0]} castShadow>
          <capsuleGeometry args={[0.22, 0.3, 8, 16]} />
          <meshToonMaterial color={def.color} gradientMap={gradientMap} />
        </mesh>

        {/* Head */}
        <group ref={headGroupRef} position={[0, 0.35, 0]}>
          <mesh scale={[1, 0.94, 1]} castShadow>
            <sphereGeometry args={[0.34, 24, 24]} />
            <meshToonMaterial color="#ffd9b3" gradientMap={gradientMap} />
          </mesh>

          {/* Hat */}
          {def.hat === 'mushroom' && (
            <mesh position={[0, 0.2, 0]} castShadow>
              <latheGeometry args={[mushroomProfile, 32]} />
              <meshToonMaterial color="#e63946" gradientMap={gradientMap} />
              {/* Spots */}
              <mesh position={[0.2, 0.2, 0.2]} scale={[1, 0.2, 1]} rotation={[0.5, -0.5, 0]}>
                 <sphereGeometry args={[0.08, 8, 8]} />
                 <meshToonMaterial color="#ffffff" gradientMap={gradientMap} />
              </mesh>
              <mesh position={[-0.2, 0.15, 0.2]} scale={[1, 0.2, 1]} rotation={[0.2, 0.5, 0]}>
                 <sphereGeometry args={[0.06, 8, 8]} />
                 <meshToonMaterial color="#ffffff" gradientMap={gradientMap} />
              </mesh>
            </mesh>
          )}
          
          {def.hat === 'beanie' && (
            <group position={[0, 0.25, 0]}>
              <mesh scale={[1, 0.6, 1]} castShadow>
                <sphereGeometry args={[0.35, 16, 16]} />
                <meshToonMaterial color="#3a86ff" gradientMap={gradientMap} />
              </mesh>
              <mesh position={[0, 0.22, 0]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshToonMaterial color="#ffd24c" gradientMap={gradientMap} />
              </mesh>
            </group>
          )}

          {def.hat === 'antenna' && (
            <group position={[0, 0.3, 0]}>
              <mesh scale={[1, 0.4, 1]} castShadow>
                <sphereGeometry args={[0.32, 16, 16]} />
                <meshToonMaterial color="#8338ec" gradientMap={gradientMap} />
              </mesh>
              <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 0.2]} />
                <meshToonMaterial color="#cccccc" gradientMap={gradientMap} />
              </mesh>
              <mesh position={[0, 0.3, 0]}>
                <sphereGeometry args={[0.06, 16, 16]} />
                <meshStandardMaterial color="#4cc9f0" emissive="#4cc9f0" emissiveIntensity={2} />
              </mesh>
            </group>
          )}

          {/* Face */}
          <group position={[0, -0.05, 0.32]}>
            <group ref={eyesRef}>
              <mesh position={[-0.12, 0.05, 0]} scale={[1, 1.4, 0.5]}>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshBasicMaterial color="#ffffff" />
                <mesh position={[0, 0, 0.05]} scale={[0.5, 0.5, 1]}>
                  <sphereGeometry args={[0.05, 16, 16]} />
                  <meshBasicMaterial color="#111111" />
                </mesh>
              </mesh>
              <mesh position={[0.12, 0.05, 0]} scale={[1, 1.4, 0.5]}>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshBasicMaterial color="#ffffff" />
                <mesh position={[0, 0, 0.05]} scale={[0.5, 0.5, 1]}>
                  <sphereGeometry args={[0.05, 16, 16]} />
                  <meshBasicMaterial color="#111111" />
                </mesh>
              </mesh>
            </group>
            <mesh position={[0, -0.08, 0.02]} rotation={[Math.PI, 0, 0]}>
              <torusGeometry args={[0.05, 0.012, 8, 16, Math.PI * 0.8]} />
              <meshBasicMaterial color="#aa6655" />
            </mesh>
          </group>
        </group>

        {/* Arms */}
        <group ref={armLRef} position={[-0.26, 0.1, 0]}>
          <mesh position={[0, -0.12, 0]} rotation={[0, 0, 0.2]} castShadow>
            <capsuleGeometry args={[0.06, 0.18, 8, 16]} />
            <meshToonMaterial color={def.color} gradientMap={gradientMap} />
            <mesh position={[0, -0.14, 0]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshToonMaterial color="#ffffff" gradientMap={gradientMap} />
            </mesh>
          </mesh>
        </group>
        <group ref={armRRef} position={[0.26, 0.1, 0]}>
          <mesh position={[0, -0.12, 0]} rotation={[0, 0, -0.2]} castShadow>
            <capsuleGeometry args={[0.06, 0.18, 8, 16]} />
            <meshToonMaterial color={def.color} gradientMap={gradientMap} />
            <mesh position={[0, -0.14, 0]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshToonMaterial color="#ffffff" gradientMap={gradientMap} />
            </mesh>
          </mesh>
        </group>

        {/* Legs */}
        <group ref={legLRef} position={[-0.12, -0.2, 0]}>
          <mesh position={[0, -0.1, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.14, 8, 16]} />
            <meshToonMaterial color={def.color} gradientMap={gradientMap} />
            <mesh position={[0, -0.1, 0.04]} scale={[1, 0.8, 1.2]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshToonMaterial color="#555555" gradientMap={gradientMap} />
            </mesh>
          </mesh>
        </group>
        <group ref={legRRef} position={[0.12, -0.2, 0]}>
          <mesh position={[0, -0.1, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.14, 8, 16]} />
            <meshToonMaterial color={def.color} gradientMap={gradientMap} />
            <mesh position={[0, -0.1, 0.04]} scale={[1, 0.8, 1.2]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshToonMaterial color="#555555" gradientMap={gradientMap} />
            </mesh>
          </mesh>
        </group>
      </group>
    </group>
  );
}

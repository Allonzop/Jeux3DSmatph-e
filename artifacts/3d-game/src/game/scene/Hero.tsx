import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { useToonGradient } from './utils';

const SPEED = 4;

export function Hero() {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const armLRef = useRef<THREE.Mesh>(null);
  const armRRef = useRef<THREE.Mesh>(null);
  const legLRef = useRef<THREE.Mesh>(null);
  const legRRef = useRef<THREE.Mesh>(null);

  const gradientMap = useToonGradient();
  
  // Zustand actions/getters
  const setHeroPos = useGameStore((state) => state.setHeroPos);

  useFrame((state, delta) => {
    const { heroPos, heroDir } = useGameStore.getState();

    // Movement Logic
    let dx = heroDir[0];
    let dz = heroDir[1];
    
    let isMoving = dx !== 0 || dz !== 0;
    
    if (isMoving) {
      let nx = heroPos[0] + dx * SPEED * delta;
      let nz = heroPos[2] + dz * SPEED * delta;
      
      // Clamp to island bounds (approx radius 8.5)
      const dist = Math.sqrt(nx * nx + nz * nz);
      if (dist > 8.5) {
        nx = (nx / dist) * 8.5;
        nz = (nz / dist) * 8.5;
      }
      
      setHeroPos([nx, heroPos[1], nz]);
    }

    // Visual Interpolation
    if (groupRef.current) {
      const logicalPos = useGameStore.getState().heroPos;
      // Lerp visual position to logical position
      const targetPos = new THREE.Vector3(logicalPos[0], logicalPos[1], logicalPos[2]);
      groupRef.current.position.lerp(targetPos, 0.2);
      
      if (isMoving) {
        // Face movement direction
        const targetRot = Math.atan2(dx, dz);
        // Simple manual slerp for rotation
        const currentRot = groupRef.current.rotation.y;
        let diff = targetRot - currentRot;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        groupRef.current.rotation.y += diff * 0.2;
      }
    }

    // Animations
    const time = state.clock.elapsedTime;
    
    if (isMoving) {
      const walkCycle = Math.sin(time * 8);
      if (armLRef.current && armRRef.current) {
        armLRef.current.rotation.x = walkCycle * 0.5;
        armRRef.current.rotation.x = -walkCycle * 0.5;
      }
      if (legLRef.current && legRRef.current) {
        legLRef.current.rotation.x = -walkCycle * 0.5;
        legRRef.current.rotation.x = walkCycle * 0.5;
      }
      if (torsoRef.current) {
        torsoRef.current.position.y = 0.6 + Math.abs(Math.sin(time * 8)) * 0.05;
      }
    } else {
      // Idle
      if (armLRef.current && armRRef.current) {
        armLRef.current.rotation.x = 0;
        armRRef.current.rotation.x = 0;
      }
      if (legLRef.current && legRRef.current) {
        legLRef.current.rotation.x = 0;
        legRRef.current.rotation.x = 0;
      }
      if (torsoRef.current) {
        torsoRef.current.position.y = 0.6 + Math.sin(time * 2) * 0.02;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh ref={torsoRef} position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.6, 0.8, 0.4]} />
        <meshToonMaterial color="#4361ee" gradientMap={gradientMap} />
        
        {/* Head */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshToonMaterial color="#5a7bff" gradientMap={gradientMap} />
          
          {/* Eyes */}
          <mesh position={[-0.1, 0.05, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.1]} />
            <meshBasicMaterial color="white" />
          </mesh>
          <mesh position={[0.1, 0.05, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.1]} />
            <meshBasicMaterial color="white" />
          </mesh>
        </mesh>

        {/* Arms */}
        <mesh ref={armLRef} position={[-0.38, 0.2, 0]}>
          <group position={[0, -0.25, 0]}>
            <mesh rotation={[0, 0, 0.2]} castShadow>
              <cylinderGeometry args={[0.08, 0.08, 0.5]} />
              <meshToonMaterial color="#4361ee" gradientMap={gradientMap} />
            </mesh>
          </group>
        </mesh>
        
        <mesh ref={armRRef} position={[0.38, 0.2, 0]}>
          <group position={[0, -0.25, 0]}>
            <mesh rotation={[0, 0, -0.2]} castShadow>
              <cylinderGeometry args={[0.08, 0.08, 0.5]} />
              <meshToonMaterial color="#4361ee" gradientMap={gradientMap} />
            </mesh>
          </group>
        </mesh>
      </mesh>

      {/* Legs */}
      <mesh ref={legLRef} position={[-0.15, 0.3, 0]}>
        <group position={[0, -0.15, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.6]} />
            <meshToonMaterial color="#4361ee" gradientMap={gradientMap} />
          </mesh>
        </group>
      </mesh>
      <mesh ref={legRRef} position={[0.15, 0.3, 0]}>
        <group position={[0, -0.15, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.6]} />
            <meshToonMaterial color="#4361ee" gradientMap={gradientMap} />
          </mesh>
        </group>
      </mesh>
    </group>
  );
}

import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, Enemy } from '../store';
import { useToonGradient, enemyPositions } from './utils';
import { Html } from '@react-three/drei';

// Scratch vector reused across frames — never allocate inside useFrame.
const _dir = new THREE.Vector3();

export function Enemies() {
  const enemies = useGameStore((state) => state.enemies);
  return (
    <group>
      {enemies.map((enemy) => (
        <EnemyNode key={enemy.id} enemy={enemy} />
      ))}
    </group>
  );
}

function EnemyNode({ enemy }: { enemy: Enemy }) {
  const ref = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const wingLRef = useRef<THREE.Mesh>(null);
  const wingRRef = useRef<THREE.Mesh>(null);

  const gradientMap = useToonGradient();
  
  const damageCore = useGameStore(state => state.damageCore);
  const removeEnemy = useGameStore(state => state.removeEnemy);

  // Register this enemy's live position for turret targeting (non-reactive).
  useEffect(() => {
    enemyPositions.set(enemy.id, new THREE.Vector3(enemy.pos[0], enemy.pos[1], enemy.pos[2]));
    return () => {
      enemyPositions.delete(enemy.id);
    };
    // enemy.pos is only the spawn point; the entry lives for this node's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemy.id]);

  const isDead = useRef(false);
  const deathScale = useRef(1);
  const deathSquash = useRef(1);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    if (isDead.current) return;

    const currentEnemy = useGameStore.getState().enemies.find(e => e.id === enemy.id);
    if (!currentEnemy || currentEnemy.hp <= 0) {
      isDead.current = true;
      return;
    }

    if (ref.current) {
      const pos = ref.current.position;
      // Direction toward the core at the origin, ignoring height.
      _dir.set(-pos.x, 0, -pos.z);
      const dist = _dir.length();
      
      if (dist < 1) {
        damageCore(10);
        removeEnemy(enemy.id);
      } else {
        _dir.normalize();
        const moveSpeed = 1.5 * delta;
        pos.addScaledVector(_dir, moveSpeed);
        ref.current.lookAt(pos.x + _dir.x, pos.y, pos.z + _dir.z);
        // Publish position imperatively — no store write, no React re-render.
        enemyPositions.get(enemy.id)?.copy(pos);
      }

      // Hover animation
      if (bodyRef.current) {
        bodyRef.current.position.y = 0.5 + Math.sin(time * 5 + enemy.id.charCodeAt(0)) * 0.1;
      }
      if (wingLRef.current && wingRRef.current) {
        const flap = Math.sin(time * 20) * 0.5;
        wingLRef.current.rotation.z = flap;
        wingRRef.current.rotation.z = -flap;
      }
    }
  });

  useFrame((_, delta) => {
    if (isDead.current && ref.current) {
      deathSquash.current = Math.max(0, deathSquash.current - delta * 5);
      deathScale.current -= delta * 2;
      if (deathScale.current <= 0) {
        removeEnemy(enemy.id);
      } else {
        ref.current.scale.set(deathScale.current, deathSquash.current * deathScale.current, deathScale.current);
      }
    }
  });

  const hpPercent = enemy.hp / enemy.maxHp;

  return (
    <group ref={ref} position={enemy.pos}>
      <mesh ref={bodyRef} position={[0, 0.5, 0]} castShadow>
        {/* Blob body */}
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshToonMaterial color="#ff4d6d" gradientMap={gradientMap} />
        
        {/* Big menacing eye */}
        <mesh position={[0, 0.05, 0.3]} scale={[1, 1, 0.5]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
          <mesh position={[0, 0, 0.12]} scale={[0.4, 0.8, 1]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color="#111111" />
          </mesh>
        </mesh>

        {/* Arms */}
        <mesh position={[-0.35, -0.1, 0]} rotation={[0, 0, -0.4]}>
          <capsuleGeometry args={[0.05, 0.15, 8, 8]} />
          <meshToonMaterial color="#ff4d6d" gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0.35, -0.1, 0]} rotation={[0, 0, 0.4]}>
          <capsuleGeometry args={[0.05, 0.15, 8, 8]} />
          <meshToonMaterial color="#ff4d6d" gradientMap={gradientMap} />
        </mesh>

        {/* Wings */}
        <mesh ref={wingLRef} position={[-0.3, 0.2, -0.1]} rotation={[0, 0.3, 0]}>
          <coneGeometry args={[0.15, 0.3, 3]} />
          <meshToonMaterial color="#590d22" gradientMap={gradientMap} />
        </mesh>
        <mesh ref={wingRRef} position={[0.3, 0.2, -0.1]} rotation={[0, -0.3, 0]}>
          <coneGeometry args={[0.15, 0.3, 3]} />
          <meshToonMaterial color="#590d22" gradientMap={gradientMap} />
        </mesh>
      </mesh>
      
      <pointLight color="#ff4d6d" intensity={0.5} distance={3} position={[0, 0.5, 0]} />

      {hpPercent < 1 && (
        <Html position={[0, 1.2, 0]} center transform style={{ pointerEvents: 'none' }}>
          <div className="w-10 h-1.5 bg-black/80 rounded-full overflow-hidden border border-black">
            <div className="h-full bg-red-500" style={{ width: `${hpPercent * 100}%` }} />
          </div>
        </Html>
      )}
    </group>
  );
}

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, Enemy } from '../store';
import { useToonGradient } from './utils';
import { Html } from '@react-three/drei';

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
  const gradientMap = useToonGradient();
  
  const setEnemyPos = useGameStore(state => state.setEnemyPos);
  const damageCore = useGameStore(state => state.damageCore);
  const removeEnemy = useGameStore(state => state.removeEnemy);

  // Local state for scaling down on death
  const isDead = useRef(false);
  const deathScale = useRef(1);

  useFrame((state, delta) => {
    if (isDead.current) return;

    // Check actual store HP since prop might be stale due to partial updates
    const currentEnemy = useGameStore.getState().enemies.find(e => e.id === enemy.id);
    if (!currentEnemy || currentEnemy.hp <= 0) {
      isDead.current = true;
      return;
    }

    if (ref.current) {
      const pos = ref.current.position;
      const target = new THREE.Vector3(0, 0, 0); // Core
      
      const dir = target.clone().sub(pos);
      const dist = dir.length();
      
      if (dist < 1) {
        damageCore(10);
        removeEnemy(enemy.id);
      } else {
        dir.normalize();
        const moveSpeed = 1.5 * delta;
        pos.addScaledVector(dir, moveSpeed);
        // Look at core
        ref.current.lookAt(target);
        
        // Update store pos occasionally so turrets can target accurately
        // Doing it every frame is fine since zustand doesn't force rerender of everything if mapped well
        // But to optimize, we can just read from scene graph in turret, or update store.
        setEnemyPos(enemy.id, [pos.x, pos.y, pos.z]);
      }
    }
  });

  useFrame((_, delta) => {
    if (isDead.current && ref.current) {
      deathScale.current -= delta * 3;
      if (deathScale.current <= 0) {
        removeEnemy(enemy.id);
      } else {
        ref.current.scale.setScalar(deathScale.current);
      }
    }
  });

  const hpPercent = enemy.hp / enemy.maxHp;

  return (
    <group ref={ref} position={enemy.pos}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.6, 4, 16]} />
        <meshToonMaterial color="#ff4444" gradientMap={gradientMap} />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.1, 0.6, 0.25]}>
        <sphereGeometry args={[0.08]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      <mesh position={[0.1, 0.6, 0.25]}>
        <sphereGeometry args={[0.08]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      
      <pointLight color="#ff4444" intensity={0.5} distance={3} />

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

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, Enemy } from '../store';
import { enemyPositions } from './utils';
import { Html } from '@react-three/drei';
import { ToonHumanoid } from '../characters/ToonHumanoid';
import { enemyDef } from '../characters/defs';

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

  useFrame((_, delta) => {
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

  // Stable per-enemy def (seed varies per instance for micro-variation).
  const def = useMemo(
    () => ({ ...enemyDef, id: enemy.id, seed: enemy.id.charCodeAt(0) * 31 + enemy.id.length }),
    [enemy.id],
  );

  return (
    <group ref={ref} position={enemy.pos}>
      {/* Lift so the imp's feet touch the ground (body center is above the legs). */}
      <group position={[0, 0.35, 0]}>
        <ToonHumanoid def={def} moving />
      </group>

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

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ToonHumanoid } from '../characters/ToonHumanoid';
import { villagerDefs } from '../characters/defs';
import { mulberry32 } from '../characters/rng';
import type { CharacterDef } from '../characters/types';
import { useGameStore } from '../store';
import { surfaceY, applySurfaceRotation } from '../world';
import { damp } from './utils';

// Vecteur de travail partage — jamais d'allocation dans useFrame.
const _dir = new THREE.Vector3();

// Deterministic spawn spots spread around the crystal.
function spawnFor(index: number): [number, number, number] {
  const angle = (index / villagerDefs.length) * Math.PI * 2 + 0.7;
  const radius = 3.5 + (index % 3);
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

/**
 * Qui habite le village, et pourquoi.
 *
 * Les huit villageois etaient tous presents des la premiere seconde, avant
 * qu'aucune hutte n'existe : personne ne pouvait expliquer d'ou ils sortaient,
 * et la place etait deja pleine avant que le joueur ait rien fait.
 *
 * Desormais un seul villageois est la au depart, et chaque batiment construit
 * en fait venir un. Le village se peuple parce qu'on le batit — la croissance
 * de la population devient la recompense visible de la construction.
 */
const VILLAGER_BY_BUILDING: Record<string, number> = {
  hutte: 1,
  ferme: 2,
  marche: 3,
  bar: 4,
  antenne: 5,
  tourelle: 6,
};

export function Villagers() {
  const buildingLevels = useGameStore((state) => state.buildingLevels);
  const buildingPositions = useGameStore((state) => state.buildingPositions);

  const residents = useMemo(() => {
    // Le villageois d'origine, present avant toute construction.
    const list: { def: CharacterDef; start: [number, number, number] }[] = [
      { def: villagerDefs[0], start: spawnFor(0) },
    ];

    for (const [buildingId, villagerIndex] of Object.entries(VILLAGER_BY_BUILDING)) {
      if ((buildingLevels[buildingId] || 0) <= 0) continue;
      const def = villagerDefs[villagerIndex];
      if (!def) continue;
      // Il apparait a cote de son batiment quand celui-ci est place, sinon a
      // son emplacement par defaut.
      const at = buildingPositions[buildingId];
      const start: [number, number, number] = at
        ? [at[0] + 1.6, 0, at[2] + 1.6]
        : spawnFor(villagerIndex);
      list.push({ def, start });
    }

    return list;
  }, [buildingLevels, buildingPositions]);

  return (
    <group>
      {residents.map(({ def, start }) => (
        <Villager key={def.id} def={def} start={start} />
      ))}
    </group>
  );
}

function Villager({ def, start }: { def: CharacterDef; start: [number, number, number] }) {
  // Comme le heros : le groupe exterieur porte position + inclinaison du sol,
  // l'interieur porte le cap. Voir `surfaceRotation` dans world.ts.
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

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
      // `target.clone()` allouait un Vector3 par villageois et par image.
      _dir.copy(target.current).sub(pos.current);
      _dir.y = 0;
      const dist = _dir.length();

      if (dist < 0.1) {
        aiState.current = 'idle';
        timer.current = 2 + rng() * 2;
      } else {
        _dir.normalize();
        pos.current.addScaledVector(_dir, 1.2 * delta);

        // Rotation
        if (bodyRef.current) {
          const targetRot = Math.atan2(_dir.x, _dir.z);
          const currentRot = bodyRef.current.rotation.y;
          let diff = targetRot - currentRot;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          bodyRef.current.rotation.y += diff * damp(0.1, delta);
        }
      }
    }

    if (groupRef.current) {
      groupRef.current.position.set(
        pos.current.x,
        pos.current.y + surfaceY(pos.current.x, pos.current.z),
        pos.current.z,
      );
      applySurfaceRotation(groupRef.current, pos.current.x, pos.current.z);
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={bodyRef}>
        <ToonHumanoid def={def} moving={isMoving} />
      </group>
    </group>
  );
}

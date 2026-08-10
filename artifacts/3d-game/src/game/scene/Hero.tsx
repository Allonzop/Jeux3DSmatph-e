import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { WORLD_RADIUS } from '../world';
import { ToonHumanoid } from '../characters/ToonHumanoid';
import { heroDef } from '../characters/defs';
import { mulberry32 } from '../characters/rng';
import { enemyPositions } from './utils';

const SPEED = 4;
const DUST_COUNT = 8;

// ---- Combat ----
// Le héros n'avait aucun moyen d'attaquer : la tourelle était la seule source
// de dégâts du jeu, et le tutoriel ne pouvait rien expliquer parce qu'il n'y
// avait rien à faire. Le tir est automatique sur la cible la plus proche —
// c'est la convention du genre, et surtout le pilotage se fait à un pouce sur
// le joystick, il n'y a pas de doigt libre pour un bouton d'attaque.
const HERO_RANGE = 5;
const HERO_DPS = 55;
// Les dégâts sont accumulés puis versés 4 fois par seconde. Chaque écriture
// dans le store re-rend l'arbre des ennemis (barres de vie) : à 60 images/s ce
// serait 60 rendus par seconde et par ennemi. Même DPS, 15 fois moins de bruit.
const HERO_TICK = 0.25;

/** Hauteur du rayon, à peu près celle des mains du rig. */
const BEAM_Y = 0.9;

// Vecteurs de travail réutilisés — jamais d'allocation dans useFrame.
const _heroPos = new THREE.Vector3();
const _target = new THREE.Vector3();
const _local = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

// Reads movement state without React re-renders (ToonHumanoid accepts a getter).
const isHeroMoving = () => {
  const [dx, dz] = useGameStore.getState().heroDir;
  return dx !== 0 || dz !== 0;
};

export function Hero() {
  const groupRef = useRef<THREE.Group>(null);
  const setHeroPos = useGameStore((state) => state.setHeroPos);

  const beamRef = useRef<THREE.Mesh>(null);
  const dmgAcc = useRef(0);
  const tickTimer = useRef(0);

  const dustGroupRef = useRef<THREE.Group>(null);
  const tutorialMoveDist = useRef(0);
  const dustData = useRef(Array.from({ length: DUST_COUNT }).map(() => ({ active: false, time: 0, pos: new THREE.Vector3() })));
  const lastDustTime = useRef(0);
  // Deterministic rng for dust jitter — no Math.random() in useFrame.
  const dustRng = useMemo(() => mulberry32(0xd057), []);

  useFrame((state, delta) => {
    const { heroPos, heroDir } = useGameStore.getState();
    const time = state.clock.elapsedTime;

    // Movement Logic
    const dx = heroDir[0];
    const dz = heroDir[1];
    const isMoving = dx !== 0 || dz !== 0;

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

      // Dust emission (synced with the walk bounce cycle)
      if (isMoving) {
        const bounce = Math.abs(Math.sin(time * 15));
        if (time > lastDustTime.current + 0.15 && bounce < 0.1) {
          lastDustTime.current = time;
          const inactiveDust = dustData.current.find((d) => !d.active);
          if (inactiveDust) {
            inactiveDust.active = true;
            inactiveDust.time = 0;
            groupRef.current.getWorldPosition(inactiveDust.pos);
            inactiveDust.pos.y = -0.4;
            inactiveDust.pos.x += (dustRng() - 0.5) * 0.3;
            inactiveDust.pos.z += (dustRng() - 0.5) * 0.3;
          }
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

  // Tir automatique sur le monstre le plus proche à portée.
  useFrame((_, delta) => {
    const group = groupRef.current;
    const beam = beamRef.current;
    if (!group) return;

    const { enemies, waveActive, damageEnemy } = useGameStore.getState();

    if (!waveActive || enemies.length === 0) {
      if (beam) beam.visible = false;
      dmgAcc.current = 0;
      tickTimer.current = 0;
      return;
    }

    group.getWorldPosition(_heroPos);

    let nearestId: string | null = null;
    let nearestDist = HERO_RANGE;
    for (const enemy of enemies) {
      // Position vivante publiée par chaque monstre — `enemy.pos` n'est que son
      // point d'apparition et ne bouge jamais.
      const live = enemyPositions.get(enemy.id);
      if (!live) continue;
      const dx = live.x - _heroPos.x;
      const dz = live.z - _heroPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestId = enemy.id;
        _target.copy(live);
      }
    }

    if (!nearestId) {
      if (beam) beam.visible = false;
      dmgAcc.current = 0;
      tickTimer.current = 0;
      return;
    }

    if (beam) {
      beam.visible = true;
      // Le rayon est un cylindre tendu entre le héros et sa cible : milieu,
      // longueur, orientation. Le cylindre de three est aligné sur Y, d'où la
      // rotation depuis l'axe Y vers la direction visée.
      //
      // Le groupe du héros pivote quand il marche : on passe donc par
      // `worldToLocal`, sinon le rayon tournerait avec lui au lieu de rester
      // pointé sur le monstre.
      _local.copy(_target);
      group.worldToLocal(_local);
      _local.y = 0;
      const len = _local.length();
      beam.position.set(_local.x / 2, BEAM_Y, _local.z / 2);
      beam.scale.set(1, Math.max(0.001, len), 1);
      _aim.copy(_local).normalize();
      beam.quaternion.setFromUnitVectors(_up, _aim);
    }

    dmgAcc.current += HERO_DPS * delta;
    tickTimer.current += delta;
    if (tickTimer.current >= HERO_TICK) {
      damageEnemy(nearestId, dmgAcc.current);
      dmgAcc.current = 0;
      tickTimer.current = 0;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Rayon d'attaque — toujours monté, visibilité pilotée dans useFrame.
          Hauteur 1 : l'échelle Y porte la longueur, calculée par frame. */}
      <mesh ref={beamRef} visible={false}>
        <cylinderGeometry args={[0.045, 0.045, 1, 8]} />
        <meshBasicMaterial color="#6ee7ff" transparent opacity={0.75} depthWrite={false} />
      </mesh>

      {/* Global dust group attached to hero but conceptually detached by using world pos conversion */}
      <group ref={dustGroupRef}>
        {Array.from({ length: DUST_COUNT }).map((_, i) => (
          <mesh key={i} visible={false}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color="#e5d3b3" transparent depthWrite={false} />
          </mesh>
        ))}
      </group>

      <ToonHumanoid def={heroDef} moving={isHeroMoving} />
    </group>
  );
}

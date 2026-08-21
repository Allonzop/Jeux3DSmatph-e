import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { ToonHumanoid } from '../characters/ToonHumanoid';
import { hunterDefs } from '../characters/defs';
import { mulberry32 } from '../characters/rng';
import { enemyPositions, enemyStates, damp } from './utils';
import { surfaceY, applySurfaceRotation } from '../world';
import { HUNTER_DPS, HUNTER_RANGE } from '../gamedata';
import { sfx } from '../sfx';

/**
 * Les Chasseurs spatiaux — la mecanique du Bar, restauree.
 *
 * Le Bar avait perdu son role de recruteur au fil des iterations : il coutait
 * cher et ne faisait plus rien. Il recrute a nouveau, **un chasseur par
 * niveau**, qui vivent autour de lui hors combat et vont au-devant des
 * monstres pendant les vagues.
 *
 * Ce sont des allies, pas des tours : ils se deplacent, ils ont une laisse
 * (ils ne suivent jamais un monstre a l'autre bout de la carte), et leur
 * puissance individuelle est modeste. Leur interet est d'occuper le terrain
 * pendant que le heros est ailleurs — exactement ce qui manquait quand une
 * vague arrivait par deux cotes.
 */

// Vecteurs de travail — jamais d'allocation dans useFrame.
const _dir = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/** Distance maximale a laquelle un chasseur s'eloigne de son bar. */
const LEASH = 9;
const SPEED = 2.4;
const TICK = 0.25;
const BEAM_Y = 0.85;

export function Hunters() {
  const barLevel = useGameStore((state) => state.buildingLevels['bar'] || 0);
  const barPos = useGameStore((state) => state.buildingPositions['bar']);

  if (barLevel <= 0 || !barPos) return null;

  const count = Math.min(barLevel, hunterDefs.length);
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <Hunter key={hunterDefs[i].id} def={hunterDefs[i]} index={i} home={barPos} />
      ))}
    </group>
  );
}

function Hunter({
  def,
  index,
  home,
}: {
  def: (typeof hunterDefs)[number];
  index: number;
  home: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  // Poste de garde : reparti en etoile autour du bar.
  const post = useMemo(() => {
    const a = (index / hunterDefs.length) * Math.PI * 2 + 0.4;
    return new THREE.Vector3(home[0] + Math.cos(a) * 2.2, 0, home[2] + Math.sin(a) * 2.2);
  }, [home, index]);

  const pos = useRef(new THREE.Vector3(post.x, 0, post.z));
  const rng = useMemo(() => mulberry32(def.seed ^ 0x4c1a), [def.seed]);
  const idleTarget = useRef(new THREE.Vector3(post.x, 0, post.z));
  const idleTimer = useRef(rng() * 2);
  const moving = useRef(false);
  const dmgAcc = useRef(0);
  const tickTimer = useRef(0);

  const isMoving = () => moving.current;

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const state = useGameStore.getState();

    // --- Choisir une cible : le monstre vivant le plus proche, dans la laisse
    let targetId: string | null = null;
    let targetDist = HUNTER_RANGE * 2.6;
    let tx = 0;
    let tz = 0;
    if (state.waveActive) {
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        const live = enemyPositions.get(enemy.id);
        if (!live) continue;
        const st = enemyStates.get(enemy.id);
        if (st?.intangible) continue;
        // Depuis le bar, pas depuis le chasseur : sans ca, un chasseur attire
        // par un monstre en attire un autre de proche en proche et la garde se
        // retrouve a l'autre bout de la planete.
        const hx = live.x - home[0];
        const hz = live.z - home[2];
        if (Math.sqrt(hx * hx + hz * hz) > LEASH) continue;
        const dx = live.x - pos.current.x;
        const dz = live.z - pos.current.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < targetDist) {
          targetDist = dist;
          targetId = enemy.id;
          tx = live.x;
          tz = live.z;
        }
      }
    }

    if (targetId) {
      // --- Combat : s'approcher jusqu'a portee, puis tirer
      if (targetDist > HUNTER_RANGE * 0.8) {
        _dir.set(tx - pos.current.x, 0, tz - pos.current.z).normalize();
        pos.current.addScaledVector(_dir, SPEED * delta);
        moving.current = true;
      } else {
        moving.current = false;
      }
      if (bodyRef.current) {
        bodyRef.current.rotation.y = Math.atan2(tx - pos.current.x, tz - pos.current.z);
      }

      if (targetDist <= HUNTER_RANGE) {
        if (beamRef.current) {
          // Meme piege que les arcs du tesla : le rayon est un enfant d'un
          // groupe incline par la courbure de la planete. Un ecart calcule
          // dans le monde et pose tel quel dans ce repere vise a cote des que
          // le chasseur s'eloigne du centre. On passe par `worldToLocal`.
          beamRef.current.visible = true;
          _aim.set(tx, surfaceY(tx, tz) + BEAM_Y, tz);
          group.worldToLocal(_aim);
          _aim.y -= BEAM_Y;
          const len = _aim.length();
          beamRef.current.position.set(_aim.x / 2, BEAM_Y + _aim.y / 2, _aim.z / 2);
          beamRef.current.scale.set(1, Math.max(0.001, len), 1);
          if (len > 1e-4) {
            _aim.divideScalar(len);
            beamRef.current.quaternion.setFromUnitVectors(_up, _aim);
          }
        }
        dmgAcc.current += HUNTER_DPS * delta;
        tickTimer.current += delta;
        if (tickTimer.current >= TICK) {
          state.damageEnemy(targetId, dmgAcc.current);
          sfx.hit();
          dmgAcc.current = 0;
          tickTimer.current = 0;
        }
      } else if (beamRef.current) {
        beamRef.current.visible = false;
      }
    } else {
      // --- Hors combat : petites rondes autour du poste
      if (beamRef.current) beamRef.current.visible = false;
      dmgAcc.current = 0;
      tickTimer.current = 0;

      _dir.copy(idleTarget.current).sub(pos.current);
      _dir.y = 0;
      const dist = _dir.length();
      if (dist < 0.15) {
        moving.current = false;
        idleTimer.current -= delta;
        if (idleTimer.current <= 0) {
          idleTimer.current = 2 + rng() * 3;
          const a = rng() * Math.PI * 2;
          const r = rng() * 1.8;
          idleTarget.current.set(post.x + Math.cos(a) * r, 0, post.z + Math.sin(a) * r);
        }
      } else {
        moving.current = true;
        _dir.normalize();
        pos.current.addScaledVector(_dir, SPEED * 0.5 * delta);
        if (bodyRef.current) {
          const want = Math.atan2(_dir.x, _dir.z);
          let diff = want - bodyRef.current.rotation.y;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          bodyRef.current.rotation.y += diff * damp(0.12, delta);
        }
      }
    }

    group.position.set(pos.current.x, surfaceY(pos.current.x, pos.current.z), pos.current.z);
    applySurfaceRotation(group, pos.current.x, pos.current.z);
  });

  return (
    <group ref={groupRef}>
      {/* Rayon d'appui — toujours monte, visibilite pilotee dans useFrame. */}
      <mesh ref={beamRef} visible={false}>
        <cylinderGeometry args={[0.03, 0.03, 1, 6]} />
        <meshBasicMaterial color={def.glow ?? '#7dd3fc'} transparent opacity={0.7} depthWrite={false} />
      </mesh>

      {/* Marque au sol : distingue un allie d'un monstre en un coup d'oeil. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.42, 0.52, 20]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0.55} depthWrite={false} />
      </mesh>

      <group ref={bodyRef}>
        <ToonHumanoid def={def} moving={isMoving} />
      </group>
    </group>
  );
}

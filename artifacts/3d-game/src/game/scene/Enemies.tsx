import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, Enemy } from '../store';
import { enemyPositions, enemyStates } from './utils';
import { Html } from '@react-three/drei';
import { ToonHumanoid } from '../characters/ToonHumanoid';
import { ENEMY_TYPES, enemyAppearance, CHAMAN_HEAL_RADIUS, CHAMAN_HEAL_PER_SEC } from '../enemies';
import { surfaceY, applySurfaceRotation } from '../world';
import { spawnBurst, spawnPopup, addShake, registerKill } from '../effects';
import { sfx } from '../sfx';

// Scratch vector reused across frames — never allocate inside useFrame.
const _dir = new THREE.Vector3();

/** Vitesse de reference d'un monstre, en unites par seconde. */
const BASE_SPEED = 1.5;

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
  // Deux groupes : l'exterieur porte position et inclinaison du sol (la
  // planete est courbe, voir world.ts), l'interieur porte le cap du monstre.
  const ref = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  const damageCore = useGameStore(state => state.damageCore);
  const removeEnemy = useGameStore(state => state.removeEnemy);

  // Le profil du bestiaire. `kind` peut manquer sur une sauvegarde d'avant le
  // bestiaire : on retombe alors sur le grognard, le monstre d'origine.
  const type = ENEMY_TYPES[enemy.kind] ?? ENEMY_TYPES.grognard;

  // Register this enemy's live position for turret targeting (non-reactive).
  useEffect(() => {
    enemyPositions.set(enemy.id, new THREE.Vector3(enemy.pos[0], enemy.pos[1], enemy.pos[2]));
    // Eclat d'arrivee : les monstres surgissaient du neant au bord de la
    // carte. Une gerbe a leur couleur dit d'ou la vague sort, au moment ou
    // elle sort — c'est le seul instant ou le joueur peut encore choisir de
    // quel cote aller.
    spawnBurst(
      enemy.pos[0],
      surfaceY(enemy.pos[0], enemy.pos[2]) + 0.6 + type.altitude,
      enemy.pos[2],
      type.tint,
      0.9,
      0.45,
    );
    // L'etat partage sert aux tours : le ralentissement qu'elles appliquent, et
    // l'altitude, qui decide si une tour au sol peut viser ce monstre.
    enemyStates.set(enemy.id, { slow: 0, slowUntil: 0, altitude: type.altitude, kind: enemy.kind });
    return () => {
      enemyPositions.delete(enemy.id);
      enemyStates.delete(enemy.id);
    };
    // enemy.pos is only the spawn point; the entry lives for this node's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemy.id]);

  const isDead = useRef(false);
  const deathScale = useRef(1);
  const deathSquash = useRef(1);
  const spawnFade = useRef(0);
  const lastHp = useRef(enemy.hp);
  /** Degats encaisses depuis le dernier chiffre affiche, et son horloge. */
  const pendingDamage = useRef(0);
  const popupTimer = useRef(0);
  const healTick = useRef(0);
  /** Le spectre retreci pendant sa phase de dematerialisation : intouchable. */
  const intangible = useRef(false);

  useFrame((state, delta) => {
    if (isDead.current) return;

    const currentEnemy = useGameStore.getState().enemies.find(e => e.id === enemy.id);
    if (!currentEnemy || currentEnemy.hp <= 0) {
      if (!isDead.current) {
        isDead.current = true;
        // La gerbe et le son partent au moment ou il tombe, pas quand le
        // composant se demonte : l'animation de mort dure encore une demi
        // seconde apres, et le retour doit etre immediat.
        const p = ref.current?.position;
        if (p) spawnBurst(p.x, p.y + 0.6, p.z, type.tint, 1.1);
        sfx.kill();
        const count = registerKill(state.clock.elapsedTime);
        if (count >= 2) {
          sfx.combo(count);
          if (p) spawnPopup(p.x, p.y + 1.6, p.z, `x${count}`, 'crit', 1.1);
        }
      }
      return;
    }

    // Chiffre de degats. Le test est fait ici plutot que dans `damageEnemy`
    // pour rester hors du magasin.
    //
    // Les degats sont **cumules** entre deux affichages. Chaque source verse
    // quatre fois par seconde ; avec trois tours et le heros sur la meme
    // cible, la reserve de chiffres flottants (26) se vidait en une demi
    // seconde et l'ecran devenait illisible. Un chiffre toutes les 0,45 s par
    // monstre, portant la somme, se lit — et dit la meme chose.
    if (currentEnemy.hp < lastHp.current - 0.5) {
      pendingDamage.current += lastHp.current - currentEnemy.hp;
      sfx.hit();
    }
    lastHp.current = currentEnemy.hp;

    popupTimer.current += delta;
    if (pendingDamage.current > 0 && popupTimer.current >= 0.45) {
      const lost = Math.round(pendingDamage.current);
      const p = ref.current?.position;
      if (p && lost > 0) {
        spawnPopup(p.x, p.y + 1.4, p.z, `-${lost}`, lost >= 90 ? 'crit' : 'damage');
      }
      pendingDamage.current = 0;
      popupTimer.current = 0;
    }

    const st = enemyStates.get(enemy.id);

    // Le spectre se dematerialise une seconde sur trois : pendant ce temps il
    // avance mais aucun tir ne l'atteint. Le retrecissement est le seul signal
    // — jouer sur l'opacite obligerait a parcourir les materiaux du rig a
    // chaque bascule, pour un resultat moins lisible sur telephone.
    if (type.kind === 'spectre' && bodyRef.current) {
      const ghost = (state.clock.elapsedTime + enemy.id.length) % 3 > 2;
      intangible.current = ghost;
      if (st) st.intangible = ghost;
      const want = ghost ? 0.45 : 1;
      bodyRef.current.scale.setScalar(
        bodyRef.current.scale.x + (want - bodyRef.current.scale.x) * Math.min(1, delta * 9),
      );
    }

    // Le chaman rend des points de vie aux monstres autour de lui.
    if (type.kind === 'chaman' && ref.current) {
      healTick.current += delta;
      if (healTick.current >= 0.4) {
        const healed = healNearby(enemy.id, ref.current.position, healTick.current);
        if (healed > 0) {
          spawnPopup(
            ref.current.position.x,
            ref.current.position.y + 1.9,
            ref.current.position.z,
            `+${healed}`,
            'heal',
            0.8,
          );
        }
        healTick.current = 0;
      }
    }

    if (ref.current) {
      const pos = ref.current.position;
      // Direction toward the core at the origin, ignoring height.
      _dir.set(-pos.x, 0, -pos.z);
      const dist = _dir.length();

      if (dist < 1) {
        // Les dégâts sont fixés au lancement de la vague, proportionnellement à
        // sa taille : laisser passer plus de la moitié des monstres détruit le
        // noyau, quelle que soit la vague. Le 10 fixe d'avant rendait les deux
        // premières vagues impossibles à perdre. Le profil module ce chiffre —
        // un Bombeur coute presque deux monstres ordinaires.
        damageCore(useGameStore.getState().breachDamage * type.breach);
        spawnBurst(pos.x, pos.y + 0.5, pos.z, '#ff4d6d', type.breach * 1.4);
        addShake(0.5 * type.breach);
        sfx.coreHit();
        removeEnemy(enemy.id);
      } else {
        _dir.normalize();
        // Ralentissement des cryo-diffuseurs : ecrit par les tours, expire tout
        // seul si aucune ne couvre plus le monstre.
        let slow = 0;
        if (st && state.clock.elapsedTime < st.slowUntil) slow = st.slow;
        const moveSpeed = BASE_SPEED * type.speed * (1 - slow) * delta;
        pos.x += _dir.x * moveSpeed;
        pos.z += _dir.z * moveSpeed;

        // Apparition en fondu : les monstres surgissaient d'un coup au bord de
        // la carte. Une demi-seconde de montee suffit a les voir arriver.
        if (spawnFade.current < 1) spawnFade.current = Math.min(1, spawnFade.current + delta * 2);

        // Le vol se lit a l'altitude et a l'oscillation : sans ce flottement,
        // un volant ressemble a un marcheur suspendu.
        const hover = type.altitude > 0 ? Math.sin(state.clock.elapsedTime * 2.4) * 0.18 : 0;
        pos.y = surfaceY(pos.x, pos.z) + type.altitude + hover;
        applySurfaceRotation(ref.current, pos.x, pos.z);
        if (bodyRef.current) bodyRef.current.rotation.y = Math.atan2(_dir.x, _dir.z);

        const s = spawnFade.current;
        ref.current.scale.setScalar(s);

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
  const def = useMemo(() => {
    const look = enemyAppearance(type.kind);
    return { ...look, id: enemy.id, seed: look.seed + enemy.id.length * 31 };
  }, [enemy.id, type]);

  return (
    <group ref={ref} position={enemy.pos}>
      <group ref={bodyRef}>
        {/* Lift so the imp's feet touch the ground (body center is above the legs). */}
        <group position={[0, 0.35, 0]}>
          <ToonHumanoid def={def} moving />
        </group>

        {/* Ombre portee des volants : sans elle, impossible de dire ou ils
            sont vraiment au sol. */}
        {type.altitude > 0 && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -type.altitude + 0.03, 0]}>
            <circleGeometry args={[0.42, 18]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
          </mesh>
        )}

        {/* Halo du spectre : rend visible la phase pendant laquelle il est
            intouchable, sinon le joueur croit que ses tirs ne portent pas. */}
        {type.kind === 'spectre' && (
          <mesh position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.75, 16, 12]} />
            <meshBasicMaterial color="#c77dff" transparent opacity={0.14} depthWrite={false} />
          </mesh>
        )}

        {/* Aura de soin du chaman : la seule facon de comprendre pourquoi les
            monstres autour ne meurent pas. */}
        {type.kind === 'chaman' && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[CHAMAN_HEAL_RADIUS - 0.18, CHAMAN_HEAL_RADIUS, 40]} />
            <meshBasicMaterial color="#52b788" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        )}
      </group>

      <pointLight color={type.tint} intensity={0.5} distance={3} position={[0, 0.5, 0]} />

      {hpPercent < 1 && (
        <Html position={[0, 1.2 + type.altitude * 0.15, 0]} center transform style={{ pointerEvents: 'none' }}>
          <div className="w-10 h-1.5 bg-black/80 rounded-full overflow-hidden border border-black">
            <div className="h-full" style={{ width: `${hpPercent * 100}%`, backgroundColor: type.tint }} />
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Soin de zone du chaman.
 *
 * Ecrit directement dans le magasin — c'est un evenement rare (au plus deux
 * fois par seconde et par chaman), pas une donnee d'image : la regle des
 * conventions de perf vise les positions, pas les points de vie.
 */
function healNearby(selfId: string, from: THREE.Vector3, elapsed: number): number {
  const store = useGameStore.getState();
  if (!store.waveActive) return 0;
  const amount = CHAMAN_HEAL_PER_SEC * elapsed;
  let healedAny = 0;
  const next = store.enemies.map((e) => {
    if (e.id === selfId || e.hp <= 0 || e.hp >= e.maxHp) return e;
    const live = enemyPositions.get(e.id);
    if (!live) return e;
    const dx = live.x - from.x;
    const dz = live.z - from.z;
    if (Math.sqrt(dx * dx + dz * dz) > CHAMAN_HEAL_RADIUS) return e;
    healedAny = Math.round(amount);
    return { ...e, hp: Math.min(e.maxHp, e.hp + amount) };
  });
  if (healedAny > 0) useGameStore.setState({ enemies: next });
  return healedAny;
}

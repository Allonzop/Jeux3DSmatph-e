import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useToonGradient } from '../scene/utils';
import {
  CharacterDef,
  resolveCharacter,
  paletteOf,
  BODY_TYPES,
  PERSONALITIES,
} from './types';
import { headwearRegistry, backRegistry, neckRegistry, faceGearRegistry } from './parts';
import { Eyes, Mouth, Brows } from './parts/faces';
import { sphereGeo, capsuleGeo } from './geometry';

/**
 * The single shared character rig. Pure visuals: no movement, AI or gameplay
 * logic — the caller moves/rotates the surrounding group. Animation happens
 * exclusively through ref mutation inside useFrame.
 *
 * `bouncy` + `round` reproduces the historical hero exactly.
 */
export function ToonHumanoid({ def, moving }: { def: CharacterDef; moving: boolean }) {
  const bodyGroupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Group>(null);
  const legRRef = useRef<THREE.Group>(null);
  const eyesRef = useRef<THREE.Group>(null);

  const gradientMap = useToonGradient();

  const r = useMemo(() => resolveCharacter(def), [def]);
  const palette = useMemo(() => paletteOf(r), [r]);
  const bp = BODY_TYPES[r.bodyType];
  const anim = PERSONALITIES[r.personality];
  // Deterministic per-character animation phase offset (no Math.random).
  // heroDef sets phase: 0 so the hero keeps its exact legacy timing.
  const timeOffset = r.phase;

  const blinkTimer = useRef(r.phase % 3);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime + timeOffset;

    if (
      bodyGroupRef.current && armLRef.current && armRRef.current &&
      legLRef.current && legRRef.current && headGroupRef.current
    ) {
      if (moving) {
        const walkCycle = Math.sin(time * anim.cycleSpeed);
        const walkCycleCos = Math.cos(time * anim.cycleSpeed);

        // Bounce squash/stretch
        const bounce = Math.abs(walkCycle);
        bodyGroupRef.current.position.y = bounce * anim.bounceAmp;
        bodyGroupRef.current.scale.set(
          1 - bounce * anim.squashX,
          1 + bounce * anim.squashY,
          1 - bounce * anim.squashX,
        );

        armLRef.current.rotation.x = walkCycleCos * anim.armAmp;
        armRRef.current.rotation.x = -walkCycleCos * anim.armAmp;
        legLRef.current.rotation.x = -walkCycleCos * anim.armAmp;
        legRRef.current.rotation.x = walkCycleCos * anim.armAmp;

        headGroupRef.current.rotation.x = anim.headTilt; // tilt forward
        headGroupRef.current.rotation.z = walkCycleCos * anim.headBob; // side bob
      } else {
        // Idle micro-movements
        const idleCycle = Math.sin(time * anim.idleSpeed);
        bodyGroupRef.current.position.y = idleCycle * anim.idleAmp;
        bodyGroupRef.current.scale.setScalar(1);

        armLRef.current.rotation.x = Math.sin(time * anim.idleSpeed + 1) * anim.idleArmAmp;
        armRRef.current.rotation.x = -Math.sin(time * anim.idleSpeed + 1) * anim.idleArmAmp;
        legLRef.current.rotation.x = 0;
        legRRef.current.rotation.x = 0;

        headGroupRef.current.rotation.x = Math.sin(time * anim.idleSpeed * 0.75) * 0.02;
        headGroupRef.current.rotation.z = 0;
      }
    }

    // Blinking
    blinkTimer.current += delta;
    if (blinkTimer.current > anim.blinkPeriod + 0.1) blinkTimer.current = 0;
    if (eyesRef.current) {
      const isBlinking = blinkTimer.current > anim.blinkPeriod;
      eyesRef.current.scale.y = isBlinking ? 0.1 : 1;
    }
  });

  const Headwear = r.headwear ? headwearRegistry[r.headwear] : null;
  const Back = r.back ? backRegistry[r.back] : null;
  const Neck = r.neck ? neckRegistry[r.neck] : null;
  const FaceGear = r.faceGear ? faceGearRegistry[r.faceGear] : null;

  const partProps = { palette, gradientMap, seed: r.seed };
  const limbT = r.limbThickness;

  return (
    <group scale={r.scale}>
      <group ref={bodyGroupRef}>
        {/* Body */}
        <mesh castShadow geometry={capsuleGeo(bp.bodyR, bp.bodyL)}>
          <meshToonMaterial color={palette.primary} gradientMap={gradientMap} />
        </mesh>

        {/* Back slot */}
        {Back && (
          <group position={[0, 0.05, -(bp.bodyR - 0.02)]}>
            <Back {...partProps} />
          </group>
        )}

        {/* Neck slot */}
        {Neck && (
          <group position={[0, bp.headY - bp.headR * 0.9, 0]}>
            <Neck {...partProps} />
          </group>
        )}

        {/* Head */}
        <group ref={headGroupRef} position={[0, bp.headY, 0]} scale={r.headScale}>
          <mesh scale={[1, 0.94, 1]} castShadow geometry={sphereGeo(bp.headR, 24)}>
            <meshToonMaterial color={palette.skin} gradientMap={gradientMap} />
          </mesh>

          {Headwear && <Headwear {...partProps} />}

          {/* Face */}
          <group position={[0, -0.05, bp.headR - 0.02]}>
            <Eyes shape={r.eyeShape} eyesRef={eyesRef} />
            <Mouth shape={r.mouth} />
            {r.brows && <Brows palette={palette} />}
            {FaceGear && <FaceGear {...partProps} />}
          </group>
        </group>

        {/* Arms */}
        <group ref={armLRef} position={[-bp.armX, 0.1, 0]}>
          <mesh position={[0, -0.15, 0]} rotation={[0, 0, 0.2]} castShadow geometry={capsuleGeo(bp.armR * limbT, bp.armL)}>
            <meshToonMaterial color={palette.primary} gradientMap={gradientMap} />
            <mesh position={[0, -(bp.armL / 2 + 0.05), 0]} geometry={sphereGeo(bp.armR * limbT + 0.02)}>
              <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
            </mesh>
          </mesh>
        </group>
        <group ref={armRRef} position={[bp.armX, 0.1, 0]}>
          <mesh position={[0, -0.15, 0]} rotation={[0, 0, -0.2]} castShadow geometry={capsuleGeo(bp.armR * limbT, bp.armL)}>
            <meshToonMaterial color={palette.primary} gradientMap={gradientMap} />
            <mesh position={[0, -(bp.armL / 2 + 0.05), 0]} geometry={sphereGeo(bp.armR * limbT + 0.02)}>
              <meshToonMaterial color={palette.secondary} gradientMap={gradientMap} />
            </mesh>
          </mesh>
        </group>

        {/* Legs */}
        <group ref={legLRef} position={[-bp.legX, -0.2, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow geometry={capsuleGeo(bp.legR * limbT, bp.legL)}>
            <meshToonMaterial color={palette.primary} gradientMap={gradientMap} />
            <mesh position={[0, -(bp.legL / 2 + 0.04), 0.04]} scale={[1, 0.8, 1.2]} geometry={sphereGeo(bp.legR * limbT + 0.02)}>
              <meshToonMaterial color="#555555" gradientMap={gradientMap} />
            </mesh>
          </mesh>
        </group>
        <group ref={legRRef} position={[bp.legX, -0.2, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow geometry={capsuleGeo(bp.legR * limbT, bp.legL)}>
            <meshToonMaterial color={palette.primary} gradientMap={gradientMap} />
            <mesh position={[0, -(bp.legL / 2 + 0.04), 0.04]} scale={[1, 0.8, 1.2]} geometry={sphereGeo(bp.legR * limbT + 0.02)}>
              <meshToonMaterial color="#555555" gradientMap={gradientMap} />
            </mesh>
          </mesh>
        </group>
      </group>
    </group>
  );
}

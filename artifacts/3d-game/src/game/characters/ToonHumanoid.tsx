import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useToonGradient } from '../scene/utils';
import {
  CharacterDef, resolveDef, PERSONALITIES, BodyType,
} from './types';
import { headwearRegistry, backRegistry, neckRegistry, faceGearRegistry } from './parts';
import { mulberry32 } from './rng';
import { sharedGeom, toonMat, basicMat } from './shared';

// The single shared humanoid rig. It contains ZERO gameplay logic —
// no movement, no AI. The caller owns position/rotation of the outer group;
// this component only renders the body and animates it in place.
//
// The walk/idle/blink cycle lives here and ONLY here. The 'bouncy'
// personality reproduces the original Hero.tsx maths exactly.

interface BodyDims {
  bodyR: number; bodyL: number;
  headY: number; headR: number;
  armX: number; armR: number; armL: number; handR: number;
  legX: number; legY: number; legR: number; legL: number; footR: number;
}

// 'round' is the exact original Hero body.
const BODY_DIMS: Record<BodyType, BodyDims> = {
  round: { bodyR: 0.22, bodyL: 0.3, headY: 0.35, headR: 0.34, armX: 0.28, armR: 0.07, armL: 0.22, handR: 0.09, legX: 0.12, legY: -0.2, legR: 0.08, legL: 0.16, footR: 0.1 },
  slim: { bodyR: 0.16, bodyL: 0.42, headY: 0.44, headR: 0.28, armX: 0.22, armR: 0.05, armL: 0.28, handR: 0.07, legX: 0.1, legY: -0.27, legR: 0.06, legL: 0.2, footR: 0.08 },
  stocky: { bodyR: 0.28, bodyL: 0.14, headY: 0.32, headR: 0.33, armX: 0.33, armR: 0.09, armL: 0.16, handR: 0.1, legX: 0.15, legY: -0.18, legR: 0.09, legL: 0.09, footR: 0.11 },
  tall: { bodyR: 0.18, bodyL: 0.5, headY: 0.5, headR: 0.27, armX: 0.24, armR: 0.06, armL: 0.32, handR: 0.08, legX: 0.11, legY: -0.3, legR: 0.07, legL: 0.24, footR: 0.09 },
};

const REF_HEAD_R = 0.34; // hero head radius — parts are authored against it
const REF_BODY_R = 0.22;

// Shared geometries per body type (all instances of a body type reuse them).
function bodyGeoms(bt: BodyType, limb: number) {
  const d = BODY_DIMS[bt];
  const k = `${bt}:${limb.toFixed(2)}`;
  return {
    body: sharedGeom(`body:${bt}`, () => new THREE.CapsuleGeometry(d.bodyR, d.bodyL, 8, 16)),
    head: sharedGeom(`head:${bt}`, () => new THREE.SphereGeometry(d.headR, 24, 24)),
    arm: sharedGeom(`arm:${k}`, () => new THREE.CapsuleGeometry(d.armR * limb, d.armL, 8, 16)),
    hand: sharedGeom(`hand:${k}`, () => new THREE.SphereGeometry(d.handR * limb, 16, 16)),
    leg: sharedGeom(`leg:${k}`, () => new THREE.CapsuleGeometry(d.legR * limb, d.legL, 8, 16)),
    foot: sharedGeom(`foot:${k}`, () => new THREE.SphereGeometry(d.footR * limb, 16, 16)),
    eye: sharedGeom('eye', () => new THREE.SphereGeometry(0.06, 16, 16)),
  };
}

const EYE_SCALES = {
  round: [1, 1.4, 0.5] as const,
  oval: [0.85, 1.7, 0.5] as const,
  wide: [1.35, 1.1, 0.5] as const,
  sleepy: [1.2, 0.7, 0.5] as const,
};

export interface ToonHumanoidProps {
  def: CharacterDef;
  // Whether the character is walking. Accepts a getter so callers that track
  // movement in refs (hero, villagers) don't need per-frame React state.
  moving?: boolean | (() => boolean);
}

export function ToonHumanoid({ def, moving = false }: ToonHumanoidProps) {
  const r = useMemo(() => resolveDef(def), [def]);
  const dims = BODY_DIMS[r.bodyType];
  const geoms = bodyGeoms(r.bodyType, r.limbThickness);
  const gradientMap = useToonGradient();
  const p = PERSONALITIES[r.personality];

  const bodyGroupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Group>(null);
  const legRRef = useRef<THREE.Group>(null);
  const eyesRef = useRef<THREE.Group>(null);
  const blinkTimer = useRef(0);

  // Deterministic per-character values, drawn once from the seed.
  const seeded = useMemo(() => {
    const rnd = mulberry32(r.seed);
    return {
      timeOffset: rnd() * 100, // desynchronize walk cycles between characters
      blinkOffset: rnd() * p.blinkInterval,
    };
  }, [r.seed, p.blinkInterval]);

  const partProps = useMemo(
    () => ({ palette: r.palette, gradientMap, seed: r.seed }),
    [r.palette, gradientMap, r.seed],
  );

  const Headwear = r.headwear ? headwearRegistry[r.headwear] : null;
  const Back = r.back ? backRegistry[r.back] : null;
  const Neck = r.neck ? neckRegistry[r.neck] : null;
  const FaceGear = r.faceGear ? faceGearRegistry[r.faceGear] : null;

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime + seeded.timeOffset;
    const isMoving = typeof moving === 'function' ? moving() : moving;

    if (bodyGroupRef.current && armLRef.current && armRRef.current && legLRef.current && legRRef.current && headGroupRef.current) {
      if (isMoving) {
        const walkCycle = Math.sin(time * p.walkFreq);
        const walkCycleCos = Math.cos(time * p.walkFreq);

        // Bounce squash/stretch (original hero maths, modulated by personality)
        const bounce = Math.abs(walkCycle) * (p.bounceAmp / 0.15);
        bodyGroupRef.current.position.y = bounce * 0.15;
        bodyGroupRef.current.scale.set(1 - bounce * 0.1 * p.squash, 1 + bounce * 0.2 * p.squash, 1 - bounce * 0.1 * p.squash);

        armLRef.current.rotation.x = walkCycleCos * p.armAmp;
        armRRef.current.rotation.x = -walkCycleCos * p.armAmp;
        legLRef.current.rotation.x = -walkCycleCos * p.armAmp;
        legRRef.current.rotation.x = walkCycleCos * p.armAmp;

        headGroupRef.current.rotation.x = p.headTilt;
        headGroupRef.current.rotation.z = walkCycleCos * p.headBob;
      } else {
        const idleCycle = Math.sin(time * p.idleFreq);
        bodyGroupRef.current.position.y = idleCycle * p.idleAmp;
        bodyGroupRef.current.scale.setScalar(1);

        armLRef.current.rotation.x = Math.sin(time * p.idleFreq + 1) * 0.05;
        armRRef.current.rotation.x = -Math.sin(time * p.idleFreq + 1) * 0.05;
        legLRef.current.rotation.x = 0;
        legRRef.current.rotation.x = 0;

        headGroupRef.current.rotation.x = Math.sin(time * p.idleFreq * 0.75) * 0.02;
        headGroupRef.current.rotation.z = 0;
      }
    }

    // Blinking
    blinkTimer.current += delta;
    if (blinkTimer.current > p.blinkInterval + 0.1) blinkTimer.current = 0;
    if (eyesRef.current) {
      const isBlinking = blinkTimer.current > p.blinkInterval;
      eyesRef.current.scale.y = isBlinking ? 0.1 : 1;
    }
  });

  const eyeScale = EYE_SCALES[r.eyeShape];
  const headPartScale = (dims.headR / REF_HEAD_R) * r.headScale;
  const backPartScale = dims.bodyR / REF_BODY_R;

  return (
    <group scale={r.scale}>
      <group ref={bodyGroupRef}>
        {/* Body */}
        <mesh geometry={geoms.body} material={toonMat(r.palette.primary)} castShadow />

        {/* Back accessory (behind torso) */}
        {Back && (
          <group scale={backPartScale}>
            <Back {...partProps} />
          </group>
        )}

        {/* Neck accessory (base of head) */}
        {Neck && (
          <group position={[0, dims.headY - dims.headR * 0.85 * r.headScale, 0]} scale={headPartScale}>
            <Neck {...partProps} />
          </group>
        )}

        {/* Head */}
        <group ref={headGroupRef} position={[0, dims.headY, 0]} scale={r.headScale}>
          <mesh geometry={geoms.head} scale={[1, 0.94, 1]} material={toonMat(r.palette.skin)} castShadow />

          {/* Headwear + face gear scale with the head so parts authored for
              the reference head fit every body type. */}
          {Headwear && (
            <group scale={dims.headR / REF_HEAD_R}>
              <Headwear {...partProps} />
            </group>
          )}
          {FaceGear && (
            <group position={[0, -0.05 * (dims.headR / REF_HEAD_R), 0]} scale={dims.headR / REF_HEAD_R}>
              <FaceGear {...partProps} />
            </group>
          )}

          {/* Face */}
          <group position={[0, -0.05 * (dims.headR / REF_HEAD_R), dims.headR * 0.94]} scale={dims.headR / REF_HEAD_R}>
            {/* Eyes */}
            <group ref={eyesRef}>
              {[-0.12, 0.12].map((x) => (
                <mesh key={x} position={[x, 0.05, 0]} scale={[eyeScale[0], eyeScale[1], eyeScale[2]]} geometry={geoms.eye} material={basicMat('#ffffff')}>
                  <mesh position={[0, 0, 0.05]} scale={[0.5, 0.5, 1]} geometry={geoms.eye} material={basicMat('#111111')} />
                </mesh>
              ))}
            </group>

            {/* Brows */}
            {r.brows && (
              <>
                <mesh position={[-0.12, 0.16, 0.02]} rotation={[0, 0, 0.15]} material={basicMat('#3d2b1f')}>
                  <boxGeometry args={[0.09, 0.02, 0.02]} />
                </mesh>
                <mesh position={[0.12, 0.16, 0.02]} rotation={[0, 0, -0.15]} material={basicMat('#3d2b1f')}>
                  <boxGeometry args={[0.09, 0.02, 0.02]} />
                </mesh>
              </>
            )}

            {/* Mouth */}
            {r.mouth === 'smile' && (
              <mesh position={[0, -0.08, 0.02]} rotation={[Math.PI, 0, 0]} material={basicMat('#aa6655')}>
                <torusGeometry args={[0.06, 0.015, 8, 16, Math.PI * 0.8]} />
              </mesh>
            )}
            {r.mouth === 'grin' && (
              <mesh position={[0, -0.08, 0.02]} rotation={[Math.PI, 0, 0]} material={basicMat('#7a3b3b')}>
                <torusGeometry args={[0.085, 0.022, 8, 16, Math.PI * 1.05]} />
              </mesh>
            )}
            {r.mouth === 'neutral' && (
              <mesh position={[0, -0.09, 0.02]} material={basicMat('#aa6655')}>
                <boxGeometry args={[0.08, 0.018, 0.015]} />
              </mesh>
            )}
            {r.mouth === 'o' && (
              <mesh position={[0, -0.09, 0.02]} material={basicMat('#7a3b3b')}>
                <torusGeometry args={[0.035, 0.015, 8, 16]} />
              </mesh>
            )}
          </group>
        </group>

        {/* Arms */}
        <group ref={armLRef} position={[-dims.armX, 0.1, 0]}>
          <mesh position={[0, -dims.armL * 0.68, 0]} rotation={[0, 0, 0.2]} geometry={geoms.arm} material={toonMat(r.palette.primary)} castShadow>
            <mesh position={[0, -(dims.armL * 0.5 + dims.armR * 0.7), 0]} geometry={geoms.hand} material={toonMat('#ffffff')} />
          </mesh>
        </group>
        <group ref={armRRef} position={[dims.armX, 0.1, 0]}>
          <mesh position={[0, -dims.armL * 0.68, 0]} rotation={[0, 0, -0.2]} geometry={geoms.arm} material={toonMat(r.palette.primary)} castShadow>
            <mesh position={[0, -(dims.armL * 0.5 + dims.armR * 0.7), 0]} geometry={geoms.hand} material={toonMat('#ffffff')} />
          </mesh>
        </group>

        {/* Legs */}
        <group ref={legLRef} position={[-dims.legX, dims.legY, 0]}>
          <mesh position={[0, -dims.legL * 0.75, 0]} geometry={geoms.leg} material={toonMat(r.palette.primary)} castShadow>
            <mesh position={[0, -dims.legL * 0.75, 0.04]} scale={[1, 0.8, 1.2]} geometry={geoms.foot} material={toonMat('#555555')} />
          </mesh>
        </group>
        <group ref={legRRef} position={[dims.legX, dims.legY, 0]}>
          <mesh position={[0, -dims.legL * 0.75, 0]} geometry={geoms.leg} material={toonMat(r.palette.primary)} castShadow>
            <mesh position={[0, -dims.legL * 0.75, 0.04]} scale={[1, 0.8, 1.2]} geometry={geoms.foot} material={toonMat('#555555')} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

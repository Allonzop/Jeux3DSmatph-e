import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { bursts, projection } from '../effects';

/**
 * Rend les eclats de combat et publie la projection monde -> ecran.
 *
 * Tout est pre-monte : les 14 gerbes du pool existent des le premier rendu et
 * ne font qu'apparaitre et disparaitre. Monter/demonter des meshes a chaque
 * mort provoquerait une recompilation de materiau au pire moment — pendant une
 * vague, quand tout bouge.
 *
 * Ce composant ne re-rend jamais : il ne lit aucun etat React, seulement les
 * tableaux de module de `effects.ts`, qu'il mute a l'image.
 */

/** Directions des eclats d'une gerbe — figees, jamais tirees au hasard. */
const SHARD_DIRS: THREE.Vector3[] = [
  new THREE.Vector3(1, 0.5, 0.2),
  new THREE.Vector3(-0.8, 0.7, 0.5),
  new THREE.Vector3(0.3, 0.9, -0.9),
  new THREE.Vector3(-0.5, 0.4, -0.8),
  new THREE.Vector3(0.9, 0.2, 0.8),
  new THREE.Vector3(-0.2, 1.1, 0.1),
  new THREE.Vector3(0.6, 0.3, -0.4),
].map((v) => v.normalize());

const SHARDS = SHARD_DIRS.length;

export function CombatEffects() {
  const { camera, size } = useThree();
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Un materiau par gerbe : sa couleur et son opacite changent a chaque
  // reutilisation, donc il ne peut pas etre partage entre les gerbes.
  const materials = useMemo(
    () =>
      bursts.map(
        () =>
          new THREE.MeshBasicMaterial({
            color: '#ffffff',
            transparent: true,
            opacity: 1,
            depthWrite: false,
          }),
      ),
    [],
  );

  const ringMaterials = useMemo(
    () =>
      bursts.map(
        () =>
          new THREE.MeshBasicMaterial({
            color: '#ffffff',
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
      ),
    [],
  );

  // La projection est publiee une fois : `ui/Popups.tsx` vit dans le DOM et
  // n'a aucun acces a la camera autrement.
  projection.project = (v, out) => {
    const p = _projected.copy(v).project(camera);
    if (p.z > 1) return false;
    out.x = (p.x * 0.5 + 0.5) * size.width;
    out.y = (-p.y * 0.5 + 0.5) * size.height;
    return true;
  };

  useFrame((_, delta) => {
    for (let i = 0; i < bursts.length; i++) {
      const b = bursts[i];
      const group = groupRefs.current[i];
      const ring = ringRefs.current[i];
      if (!group) continue;

      if (!b.active) {
        if (group.visible) group.visible = false;
        continue;
      }

      b.life += delta;
      const t = b.life / b.duration;
      if (t >= 1) {
        b.active = false;
        group.visible = false;
        continue;
      }

      group.visible = true;
      group.position.copy(b.pos);
      materials[i].color.copy(b.color);
      materials[i].opacity = (1 - t) * 0.95;
      ringMaterials[i].color.copy(b.color);
      ringMaterials[i].opacity = (1 - t) * 0.5;

      // Ejection en racine carree : rapide au depart, qui s'assoit — la
      // signature d'un impact, une vitesse constante ferait bulle de savon.
      const spread = Math.sqrt(t) * b.power * 1.5;
      const shrink = (1 - t) * b.power * 0.22;
      for (let s = 0; s < SHARDS; s++) {
        const mesh = group.children[s] as THREE.Mesh | undefined;
        if (!mesh) continue;
        const dir = SHARD_DIRS[s];
        mesh.position.set(dir.x * spread, dir.y * spread - t * t * 0.9, dir.z * spread);
        mesh.scale.setScalar(Math.max(0.001, shrink));
        mesh.rotation.x += delta * 6;
        mesh.rotation.y += delta * 4;
      }

      if (ring) {
        const r = Math.max(0.001, t * b.power * 2.1);
        ring.scale.setScalar(r);
      }
    }
  });

  return (
    <group>
      {bursts.map((_, i) => (
        <group key={i} ref={(el) => { groupRefs.current[i] = el; }} visible={false}>
          {Array.from({ length: SHARDS }).map((__, s) => (
            <mesh key={s} material={materials[i]}>
              <icosahedronGeometry args={[1, 0]} />
            </mesh>
          ))}
          <mesh
            ref={(el) => { ringRefs.current[i] = el; }}
            rotation={[-Math.PI / 2, 0, 0]}
            material={ringMaterials[i]}
          >
            <ringGeometry args={[0.55, 0.78, 24]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Vecteur de travail de la projection — hors composant, jamais realloue.
const _projected = new THREE.Vector3();

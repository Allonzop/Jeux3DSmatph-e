import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';

/**
 * Éclairage du studio : ambiante douce + directionnelle (PRD §4.2), pour que
 * les couleurs choisies ici soient celles qu'on verra en jeu.
 *
 * Le kit n'embarque pas le rig d'éclairage du jeu — il s'arrête au personnage.
 * Ces valeurs sont donc une approximation, à réaligner si la scène du jeu
 * change. Voir RAPPORT.md.
 */
export const LIGHTING = {
  ambient: 0.75,
  directional: 2.2,
  directionalPosition: [3, 6, 4] as const,
  /** Une seconde source, très faible, pour décoller la silhouette du fond. */
  fill: 0.35,
  fillPosition: [-4, 2, -3] as const,
  background: '#2a2d34',
};

export function StudioLights({ shadows = false }: { shadows?: boolean }) {
  return (
    <>
      <ambientLight intensity={LIGHTING.ambient} />
      <directionalLight
        position={LIGHTING.directionalPosition}
        intensity={LIGHTING.directional}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
      />
      <directionalLight position={LIGHTING.fillPosition} intensity={LIGHTING.fill} />
    </>
  );
}

/**
 * Contrôle la vitesse de lecture des animations (PRD §4.2, optionnel).
 *
 * `ToonHumanoid` lit `state.clock.elapsedTime` : on réécrit donc cette valeur
 * avec un temps accumulé à la vitesse voulue. Le composant est monté avant les
 * personnages, son `useFrame` s'exécute donc avant le leur.
 */
export function PlaybackSpeed({ speed }: { speed: number }) {
  const scaled = useRef(0);
  useFrame((state, delta) => {
    // `delta` est plafonné pour qu'un onglet remis au premier plan ne fasse pas
    // sauter l'animation d'un bloc.
    scaled.current += Math.min(delta, 0.1) * speed;
    state.clock.elapsedTime = scaled.current;
  });
  return null;
}

/** Rotation lente sur elle-même — révèle la silhouette dans les vignettes. */
export function Turntable({ speed = 0.35, children }: { speed?: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    // Mutation directe du ref, jamais de setState par frame (PRD §5).
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * speed;
  });
  return <group ref={ref}>{children}</group>;
}

/** Sol discret : ancre le personnage et reçoit son ombre. */
export function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <circleGeometry args={[3, 48]} />
      <meshStandardMaterial color="#3a3e47" roughness={1} />
    </mesh>
  );
}

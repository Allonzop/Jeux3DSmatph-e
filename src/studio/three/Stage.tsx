import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useRef } from 'react';
import type * as THREE from 'three';

/**
 * Éclairage du studio — recopié à l'identique de `GameCanvas.tsx` du jeu
 * (Game-Visual-Revamp/artifacts/3d-game/src/game/GameCanvas.tsx).
 *
 * Ce n'est pas cosmétique : les lumières du jeu sont *colorées* — ambiante
 * bleutée, clé chaude. Une lumière blanche neutre décale toutes les teintes
 * choisies dans le studio, ce qui est exactement le « les couleurs ne doivent
 * pas mentir » du PRD §4.2.
 *
 * Si le jeu change son éclairage, c'est ici et nulle part ailleurs qu'il faut
 * répercuter.
 */
export const LIGHTING = {
  background: '#0d1117',
  ambient: { intensity: 0.45, color: '#b8c4ff' },
  key: { intensity: 1.4, color: '#fff2dd', position: [10, 20, 10] as const },
  point: { intensity: 0.3, color: '#ffebc8', position: [0, 5, 0] as const },
  shadowMapSize: [1024, 1024] as [number, number],
};

/**
 * Post-traitement du jeu, aux mêmes réglages. Sans lui, le champ `glow` du
 * `CharacterDef` est illisible : `glowMat` produit un matériau émissif dont
 * tout l'effet vient du bloom. Régler `glow` sans bloom revient à régler à
 * l'aveugle.
 *
 * Ne jamais ajouter `disableNormalPass` : la prop n'existe plus
 * (PRD §5, et note interne du jeu `.agents/memory/r3f-game-perf.md`).
 */
export const POST = {
  bloom: { luminanceThreshold: 0.45, intensity: 1.6 },
  vignette: { offset: 0.1, darkness: 1.1 },
};

export function StudioLights({ shadows = false }: { shadows?: boolean }) {
  return (
    <>
      <ambientLight intensity={LIGHTING.ambient.intensity} color={LIGHTING.ambient.color} />
      <directionalLight
        position={LIGHTING.key.position}
        intensity={LIGHTING.key.intensity}
        color={LIGHTING.key.color}
        castShadow={shadows}
        shadow-mapSize={LIGHTING.shadowMapSize}
        // Le jeu couvre un monde entier ; le studio cadre un personnage, d'où
        // un frustum d'ombre resserré — sans quoi l'ombre serait illisible.
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
        shadow-camera-near={0.1}
        shadow-camera-far={40}
      />
      <pointLight
        position={LIGHTING.point.position}
        intensity={LIGHTING.point.intensity}
        color={LIGHTING.point.color}
      />
    </>
  );
}

/** Bloom + vignette du jeu. Incompatible avec `<View>` : voir Library.tsx. */
export function StudioPostFX() {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={POST.bloom.luminanceThreshold}
        mipmapBlur
        intensity={POST.bloom.intensity}
      />
      <Vignette eskil={false} offset={POST.vignette.offset} darkness={POST.vignette.darkness} />
    </EffectComposer>
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

/**
 * Sol du studio, à la couleur du plateau du jeu (`Ground.tsx`, `#6ede8a`),
 * mais plan et nu : le studio montre un personnage, pas un décor.
 */
export function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <circleGeometry args={[3, 48]} />
      <meshStandardMaterial color="#4f8f63" roughness={1} />
    </mesh>
  );
}

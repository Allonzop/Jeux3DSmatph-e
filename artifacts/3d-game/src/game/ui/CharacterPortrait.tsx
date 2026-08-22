import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ToonHumanoid } from '../characters/ToonHumanoid';
import type { CharacterDef } from '../characters/types';

/**
 * Un portrait 3D d'habitant, dans une fiche de bâtiment.
 *
 * « Sur certains aperçus de bâtiment on pourrait avoir des aperçus des
 * personnages plus détaillés, un peu à la Clash of Clans. » Les fiches ne
 * montraient qu'une icône SVG plate — on ne voyait jamais de près les
 * personnages, alors que tout le jeu est bâti autour d'eux.
 *
 * ## Un second canevas, et pourquoi c'est acceptable
 *
 * C'est un contexte WebGL de plus. Les navigateurs mobiles en tolèrent une
 * poignée, donc la règle est stricte : **il n'y en a jamais qu'un à la fois**,
 * monté avec la fiche et démonté avec elle. Une galerie de portraits côte à
 * côte, elle, ferait sauter la limite — ne pas généraliser sans y penser.
 *
 * Le rendu est volontairement plus simple que la scène : pas de bloom, pas
 * d'ombres, deux lumières. Un portrait de 96 pixels n'a pas besoin du
 * post-traitement, et le jeu continue de tourner derrière.
 */
export function CharacterPortrait({
  def,
  size = 88,
  background = 'radial-gradient(circle at 50% 35%, #2b3350, #121626 72%)',
}: {
  def: CharacterDef;
  size?: number;
  background?: string;
}) {
  return (
    <div
      className="shrink-0 rounded-xl overflow-hidden border border-white/10"
      style={{ width: size, height: size, background }}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3.0], fov: 32 }}
        gl={{ antialias: true, alpha: true }}
        frameloop="always"
      >
        <ambientLight intensity={0.85} color="#cfd8ff" />
        <directionalLight position={[2.5, 4, 3]} intensity={1.5} color="#fff2dd" />
        <directionalLight position={[-3, 1, -2]} intensity={0.5} color="#8ab4ff" />
        <Turntable>
          {/* Deux corrections de cadrage, l'une et l'autre nécessaires.
              — La descente de 0,85 : le rig est construit les pieds à
                l'origine, donc un cadrage centré sur zéro met le personnage
                dans la moitié basse et lui coupe la tête.
              — La normalisation d'échelle : les `CharacterDef` portent des
                tailles de 0,56 (Fileur) à 1,05 (Colosse), pensées pour la
                scène. Telles quelles, un portrait sur deux sortait minuscule.
                Ici on veut tous les personnages au même cadrage ; leur taille
                relative se lit dans le jeu, pas dans une vignette. */}
          <group position={[0, -0.85, 0]} scale={1 / (def.scale ?? 1)}>
            <ToonHumanoid def={def} />
          </group>
        </Turntable>
      </Canvas>
    </div>
  );
}

/** Rotation lente et continue — c'est ce qui donne l'impression d'une figurine. */
function Turntable({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.55;
  });
  return <group ref={ref}>{children}</group>;
}

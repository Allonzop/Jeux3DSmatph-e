import React, { useLayoutEffect, useEffect, useRef, useState } from 'react';
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
 *
 * ## Le canevas n'est monté qu'une fois la fiche immobile
 *
 * R3F mesure son conteneur avec `getBoundingClientRect`, qui tient compte des
 * transformations CSS. La fiche de bâtiment s'ouvre par un zoom
 * (`scale: 0.9 → 1`, framer-motion) : monté pendant ce zoom, le canevas
 * prenait 90 % de sa case (74 px sur 82) et n'en bougeait plus, la taille de
 * mise en page du conteneur ne changeant jamais par la suite. On attend donc
 * que le rectangle rendu coïncide avec la taille de mise en page — c'est-à-dire
 * qu'aucun ancêtre ne soit plus en train de le transformer — avant de monter.
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (Math.abs(r.width - el.offsetWidth) < 0.5 && Math.abs(r.height - el.offsetHeight) < 0.5) {
        setSettled(true);
      } else {
        raf = requestAnimationFrame(check);
      }
    };
    check();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="shrink-0 rounded-xl overflow-hidden border border-white/10"
      style={{ width: size, height: size, background }}
    >
      {settled && (
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, CAMERA_Z], fov: FOV }}
          gl={{ antialias: true, alpha: true }}
          frameloop="always"
        >
          <ambientLight intensity={0.85} color="#cfd8ff" />
          <directionalLight position={[2.5, 4, 3]} intensity={1.5} color="#fff2dd" />
          <directionalLight position={[-3, 1, -2]} intensity={0.5} color="#8ab4ff" />
          <Figurine def={def} />
        </Canvas>
      )}
    </div>
  );
}

const CAMERA_Z = 3;
const FOV = 32;
/** Hauteur visible du cadre au plan du personnage, en unités monde. */
const FRAME = 2 * CAMERA_Z * Math.tan((FOV / 2) * (Math.PI / 180));
/** Part du cadre que la figurine occupe : le reste est la marge. */
const FILL = 0.9;

const box = new THREE.Box3();
const boxSize = new THREE.Vector3();
const boxCenter = new THREE.Vector3();

/**
 * Le personnage entier, cadré au centre, en rotation lente — une figurine.
 *
 * Le cadrage se mesure, il ne se devine pas. La version précédente posait un
 * décalage fixe (« le rig est construit les pieds à l'origine », disait-elle :
 * c'est faux, l'origine est au centre du torse) qui laissait la moitié haute
 * du cadre vide et coupait le corps sous le menton — un personnage à capuche
 * n'était plus qu'une bosse brune. Ici on prend la boîte englobante réelle du
 * rig une fois monté, comme le fait le studio (`CharacterView.tsx`), et on
 * l'ajuste au cadre : la mesure suit le kit, les couvre-chefs et les sacs à
 * dos, sans table recopiée. L'échelle propre du `CharacterDef` (0,56 à 1,05)
 * s'annule au passage : tous les portraits sont au même cadrage, la taille
 * relative se lit dans le jeu.
 */
function Figurine({ def }: { def: CharacterDef }) {
  const spinRef = useRef<THREE.Group>(null);
  const fitRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const spin = spinRef.current;
    const fit = fitRef.current;
    if (!spin || !fit) return;
    // Mesure sur la pose au repos, sans rotation : le `useFrame` du rig n'a
    // pas encore tourné, et le tourniquet est remis à zéro le temps de lire
    // la boîte — ses axes sont alors ceux du personnage.
    spin.rotation.y = 0;
    fit.position.set(0, 0, 0);
    fit.scale.setScalar(1);
    fit.updateWorldMatrix(true, true);
    box.setFromObject(fit);
    if (box.isEmpty()) return;
    box.getSize(boxSize);
    box.getCenter(boxCenter);
    // La figurine tourne : sa largeur apparente varie entre x et z, d'où le
    // maximum des trois dimensions.
    const extent = Math.max(boxSize.x, boxSize.y, boxSize.z);
    const s = (FRAME * FILL) / extent;
    fit.scale.setScalar(s);
    fit.position.set(-boxCenter.x * s, -boxCenter.y * s, -boxCenter.z * s);
  }, [def]);

  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.55;
  });

  return (
    <group ref={spinRef}>
      <group ref={fitRef}>
        <ToonHumanoid def={def} />
      </group>
    </group>
  );
}

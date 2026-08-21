import React, { useMemo, useRef } from 'react';
import { Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useToonGradient } from './utils';
import {
  SCATTER,
  WORLD_RADIUS,
  PLANET_RADIUS,
  PLATEAU_THETA,
  surfaceY,
  surfacePos,
  surfaceRotation,
} from '../world';
import * as THREE from 'three';
import { useGameStore } from '../store';
import type { ScatterItem } from '../world';
import { sfx } from '../sfx';

/**
 * La planète.
 *
 * Le monde était un disque plat posé sur un cône de rochers. C'est désormais
 * la calotte d'une petite planète : une seule sphère de rayon `PLANET_RADIUS`,
 * verte au sommet (la zone jouable), rocheuse partout ailleurs. Les deux
 * morceaux partagent exactement le même rayon, donc aucune couture ne se voit
 * — c'est pour ça qu'ils sont découpés en `thetaStart`/`thetaLength` d'une
 * même sphère plutôt qu'empilés comme deux volumes distincts.
 *
 * Le centre de cette sphère est à `(0, -PLANET_RADIUS, 0)` : le sommet tombe
 * donc pile en `y = 0`, là où était l'ancien sol plat. Tout ce qui se posait à
 * `y = 0` se pose maintenant à `surfaceY(x, z)`, et rien d'autre ne bouge.
 */

/** Centre de la planète, sous le noyau. */
const PLANET_CENTER: [number, number, number] = [0, -PLANET_RADIUS, 0];

/** Bord du plateau jouable : le cercle où l'herbe cède au rocher. */
const RIM_Y = surfaceY(WORLD_RADIUS, 0);

export function Ground() {
  const gradientMap = useToonGradient();
  const { trees, bushes, flowers, rocks, pond, crystals, mushrooms } = SCATTER;
  const cleared = useGameStore((state) => state.clearedDecor);

  return (
    <group>
      <PlanetBody gradientMap={gradientMap} />
      <Atmosphere />
      <PlanetRing />
      <Moons gradientMap={gradientMap} />

      {/* Étang */}
      <OnSurface x={pond.pos[0]} z={pond.pos[2]} lift={0.02}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.5, 32]} />
          <meshStandardMaterial color="#4cc9f0" roughness={0.1} emissive="#4cc9f0" emissiveIntensity={0.2} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <torusGeometry args={[1.5, 0.15, 8, 32]} />
          <meshToonMaterial color="#7a5c47" gradientMap={gradientMap} />
        </mesh>
      </OnSurface>

      {/* Arbres */}
      {trees.map((t, i) => (
        <Clearable key={t.id} item={t} cleared={cleared}>
          <group scale={t.scale} rotation={[0, t.rot, 0]}>
            <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.1, 0.2, 1.2, 8]} />
              <meshToonMaterial color="#8a6343" gradientMap={gradientMap} />
            </mesh>
            <mesh position={[0, 1.2, 0]} scale={[1, 0.8, 1]} castShadow receiveShadow>
              <sphereGeometry args={[0.7, 16, 16]} />
              <meshToonMaterial color="#3fa871" gradientMap={gradientMap} />
            </mesh>
            <mesh position={[0.3, 1.5, 0.2]} scale={[0.8, 0.6, 0.8]} castShadow receiveShadow>
              <sphereGeometry args={[0.6, 16, 16]} />
              <meshToonMaterial color="#57cc99" gradientMap={gradientMap} />
            </mesh>
            <mesh position={[-0.3, 1.4, -0.2]} scale={[0.8, 0.6, 0.8]} castShadow receiveShadow>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshToonMaterial color="#57cc99" gradientMap={gradientMap} />
            </mesh>
          </group>
        </Clearable>
      ))}

      {/* Buissons */}
      {bushes.map((b, i) => (
        <Clearable key={b.id} item={b} cleared={cleared}>
          <group scale={b.scale}>
            <mesh position={[0, 0.2, 0]} scale={[1, 0.8, 1]} castShadow receiveShadow>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshToonMaterial color="#3fa871" gradientMap={gradientMap} />
            </mesh>
            <mesh position={[0.2, 0.15, 0.2]} scale={[1, 0.7, 1]} castShadow receiveShadow>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshToonMaterial color="#57cc99" gradientMap={gradientMap} />
            </mesh>
            <mesh position={[-0.2, 0.15, -0.1]} scale={[1, 0.7, 1]} castShadow receiveShadow>
              <sphereGeometry args={[0.25, 16, 16]} />
              <meshToonMaterial color="#57cc99" gradientMap={gradientMap} />
            </mesh>
          </group>
        </Clearable>
      ))}

      {/* Fleurs */}
      {flowers.map((f, i) => (
        <OnSurface key={`flower-${i}`} x={f.pos[0]} z={f.pos[2]}>
          <group scale={f.scale}>
            <mesh position={[0, 0.2, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.4]} />
              <meshToonMaterial color="#3fa871" />
            </mesh>
            <group position={[0, 0.4, 0]} rotation={[0.4, f.rot, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.12, 0.04, 8, 8]} />
                <meshToonMaterial color={f.type === 0 ? '#ff70a6' : '#ffd24c'} gradientMap={gradientMap} />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial emissive="#fff" emissiveIntensity={0.5} />
              </mesh>
            </group>
          </group>
        </OnSurface>
      ))}

      {/* Rochers */}
      {rocks.map((r, i) => (
        <Clearable key={r.id} item={r} cleared={cleared}>
          <mesh rotation={[r.rot * 0.7, r.rot, r.rot * 1.3]} scale={r.scale} castShadow receiveShadow>
            <icosahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial color="#888888" flatShading roughness={1} />
          </mesh>
        </Clearable>
      ))}

      {/* Géodes : trois éclats groupés, la seule source de couleur froide du décor */}
      {crystals.map((c, i) => (
        <Clearable key={c.id} item={c} cleared={cleared}>
          <group scale={c.scale} rotation={[0, c.rot, 0]}>
            <mesh position={[0, 0.45, 0]} scale={[0.35, 1, 0.35]} castShadow>
              <octahedronGeometry args={[0.6, 0]} />
              <meshStandardMaterial
                color={c.type === 0 ? '#8e5ce8' : '#4cc9f0'}
                emissive={c.type === 0 ? '#8e5ce8' : '#4cc9f0'}
                emissiveIntensity={0.7}
                flatShading
              />
            </mesh>
            <mesh position={[0.3, 0.28, 0.12]} rotation={[0, 0, 0.35]} scale={[0.25, 0.7, 0.25]} castShadow>
              <octahedronGeometry args={[0.5, 0]} />
              <meshStandardMaterial
                color={c.type === 0 ? '#b388eb' : '#7df9ff'}
                emissive={c.type === 0 ? '#b388eb' : '#7df9ff'}
                emissiveIntensity={0.6}
                flatShading
              />
            </mesh>
            <mesh position={[-0.26, 0.22, -0.15]} rotation={[0.2, 0, -0.4]} scale={[0.2, 0.55, 0.2]} castShadow>
              <octahedronGeometry args={[0.5, 0]} />
              <meshStandardMaterial
                color={c.type === 0 ? '#b388eb' : '#7df9ff'}
                emissive={c.type === 0 ? '#b388eb' : '#7df9ff'}
                emissiveIntensity={0.6}
                flatShading
              />
            </mesh>
            {/* Halo au sol : lit la géode de loin, sans dépendre d'une lampe. */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
              <circleGeometry args={[0.7, 20]} />
              <meshBasicMaterial
                color={c.type === 0 ? '#8e5ce8' : '#4cc9f0'}
                transparent
                opacity={0.22}
                depthWrite={false}
              />
            </mesh>
          </group>
        </Clearable>
      ))}

      {/* Champignons géants */}
      {mushrooms.map((m, i) => (
        <Clearable key={m.id} item={m} cleared={cleared}>
          <group scale={m.scale} rotation={[0, m.rot, 0]}>
            <mesh position={[0, 0.35, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.19, 0.7, 10]} />
              <meshToonMaterial color="#f4e3d7" gradientMap={gradientMap} />
            </mesh>
            <mesh position={[0, 0.72, 0]} scale={[1, 0.62, 1]} castShadow>
              <sphereGeometry args={[0.52, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshToonMaterial color={m.type === 0 ? '#e63946' : '#b388eb'} gradientMap={gradientMap} />
            </mesh>
            <mesh position={[0.18, 0.86, 0.14]} scale={[1, 0.4, 1]}>
              <sphereGeometry args={[0.11, 10, 8]} />
              <meshToonMaterial color="#fff2df" gradientMap={gradientMap} />
            </mesh>
            <mesh position={[-0.2, 0.84, -0.1]} scale={[1, 0.4, 1]}>
              <sphereGeometry args={[0.09, 10, 8]} />
              <meshToonMaterial color="#fff2df" gradientMap={gradientMap} />
            </mesh>
          </group>
        </Clearable>
      ))}

      {/* Éclats en orbite basse — repères de profondeur autour de la planète */}
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1} position={[20, -6, -12]}>
        <mesh scale={[1.5, 2, 1.5]} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#7a5c47" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 0.8, 0]} scale={[1.4, 0.4, 1.4]} castShadow receiveShadow>
          <sphereGeometry args={[1, 8, 8]} />
          <meshToonMaterial color="#6ede8a" gradientMap={gradientMap} />
        </mesh>
      </Float>

      <Float speed={1.2} rotationIntensity={0.8} floatIntensity={1.5} position={[-19, -9, 15]}>
        <mesh scale={[2, 2.5, 2]} rotation={[0.4, 0.2, 0]} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#4a3d5c" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 1.2, 0]} scale={[1.8, 0.5, 1.8]} castShadow receiveShadow>
          <sphereGeometry args={[1, 8, 8]} />
          <meshToonMaterial color="#6ede8a" gradientMap={gradientMap} />
        </mesh>
      </Float>
    </group>
  );
}

/**
 * Un element de decor deblayable.
 *
 * Le playtest signale « plein de petits elements de decor genants qui rendent
 * le placement des batiments flou ». Plutot que de retirer le decor — il fait
 * la vie de la planete — le joueur peut faire sa place : une touche ouvre son
 * panneau, un bouton le deblaie, et il rapporte de quoi payer le geste.
 *
 * Deblaye, l'element disparait du rendu **et** de la validation de placement
 * (`checkPlacement` recoit `clearedDecor`), et ca survit a la sauvegarde.
 */
function Clearable({
  item,
  cleared,
  children,
}: {
  item: ScatterItem;
  cleared: Record<string, true>;
  children: React.ReactNode;
}) {
  const selectDecor = useGameStore((state) => state.selectDecor);
  const placing = useGameStore((state) => state.placingBuilding);
  const selected = useGameStore((state) => state.selectedDecor === item.id);

  if (cleared[item.id]) return null;

  // Pendant une pose, le decor laisse passer la touche : le capteur de pose
  // est sous lui, exactement comme pour les batiments (voir Buildings.tsx).
  const tap = placing
    ? undefined
    : (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        selectDecor(item.id);
        sfx.tap();
      };

  return (
    <group position={surfacePos(item.pos[0], item.pos[2])} rotation={surfaceRotation(item.pos[0], item.pos[2])}>
      <group onPointerDown={tap}>{children}</group>
      {/* Halo de selection : sans lui, on ne sait pas lequel on vient de toucher. */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
          <ringGeometry args={[0.75, 0.95, 28]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Pose ses enfants sur la surface courbe en (x, z), debout par rapport au sol.
 *
 * L'inclinaison est portée par ce groupe et rien d'autre : les enfants gardent
 * leur propre `rotation.y` sans se battre avec elle (voir `surfaceRotation`).
 */
export function OnSurface({
  x,
  z,
  lift = 0,
  children,
}: {
  x: number;
  z: number;
  lift?: number;
  children: React.ReactNode;
}) {
  return (
    <group position={surfacePos(x, z, lift)} rotation={surfaceRotation(x, z)}>
      {children}
    </group>
  );
}

/** La sphère elle-même : calotte d'herbe, corps rocheux, falaise de bord. */
function PlanetBody({ gradientMap }: { gradientMap: THREE.Texture }) {
  return (
    <group position={PLANET_CENTER}>
      {/* Herbe : sommet de la sphère, exactement la zone jouable. */}
      <mesh receiveShadow>
        {/* 64×20 sur la seule calotte : les segments s'appliquent à l'intervalle
            demandé, pas à la sphère entière, donc 96×64 y mettait douze mille
            triangles pour une surface qu'on regarde de très loin. */}
        <sphereGeometry args={[PLANET_RADIUS, 64, 20, 0, Math.PI * 2, 0, PLATEAU_THETA + 0.02]} />
        <meshToonMaterial color="#6ede8a" gradientMap={gradientMap} />
      </mesh>

      {/* Roche : le reste de la même sphère, même rayon donc aucun raccord
          visible. Peu de segments + flatShading pour des facettes franches. */}
      <mesh receiveShadow>
        <sphereGeometry
          args={[PLANET_RADIUS, 40, 28, 0, Math.PI * 2, PLATEAU_THETA + 0.02, Math.PI]}
        />
        <meshStandardMaterial color="#6d5468" flatShading roughness={1} />
      </mesh>

      {/* Noyau minéral plus sombre, visible entre les facettes du bas. */}
      <mesh position={[0, -PLANET_RADIUS * 0.25, 0]} scale={[1, 0.8, 1]}>
        <icosahedronGeometry args={[PLANET_RADIUS * 0.72, 1]} />
        <meshStandardMaterial color="#3b2f4d" flatShading roughness={1} />
      </mesh>
    </group>
  );
}

/** Bourrelet de falaise + halo atmosphérique. */
function Atmosphere() {
  return (
    <group>
      {/* Corniche : cache le changement de matière au bord du plateau et donne
          à la planète une arête franche, façon dessin animé. */}
      <mesh position={[0, RIM_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[WORLD_RADIUS, 0.34, 10, 96]} />
        <meshStandardMaterial color="#8a6343" flatShading roughness={1} />
      </mesh>

      {/* Atmosphère : sphères plus larges vues de l'intérieur (BackSide), donc
          on n'en voit que la moitié lointaine — un halo derrière la planète,
          sans voile devant le village. En additif : les rayons qui frôlent le
          limbe traversent deux fois la coque et s'additionnent, ce qui donne
          naturellement une frange plus dense au ras de l'horizon. En mélange
          normal, la même coque restait un voile gris uniforme, invisible.
          `depthWrite={false}` pour ne rien masquer. */}
      <mesh position={PLANET_CENTER}>
        <sphereGeometry args={[PLANET_RADIUS + 1.1, 48, 32]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={PLANET_CENTER}>
        <sphereGeometry args={[PLANET_RADIUS + 3.2, 40, 24]} />
        <meshBasicMaterial
          color="#1d4ed8"
          transparent
          opacity={0.22}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Le ciel : une géante gazeuse cerclée d'anneaux, très loin derrière.
 *
 * Un anneau **autour de la planète jouable** a été essayé d'abord. Posé à
 * plat, il passait entièrement sous l'horizon et ne se voyait pas ; redressé
 * pour barrer le ciel, sa moitié proche passait entre la caméra et le village
 * et repeignait toute la carte en violet. Un anneau de ce diamètre a
 * forcément un côté proche : il n'y a pas d'inclinaison qui sauve les deux.
 *
 * Une géante lointaine donne la même lecture — « on est dans l'espace, sur une
 * petite planète » — sans jamais croiser la zone de jeu. Elle est assez loin
 * pour que le déplacement du héros ne change rien à sa position apparente.
 *
 * Sa position n'est pas libre. Depuis 14 unités au-dessus d'une sphère de
 * rayon 26, l'horizon tombe à 49° sous l'horizontale, et la caméra ne cadre
 * qu'une bande de 30° juste au-dessus de lui. Tout ce qui est placé plus haut
 * que la caméra sort du champ — c'est pour ça que ces corps sont très loin
 * **et très bas** : de là, ils apparaissent posés juste au-dessus de l'horizon.
 */
function PlanetRing() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.01;
  });

  return (
    <group position={[-14, -34, -84]} rotation={[0, 0, 0.34]}>
      <group ref={ref}>
        {/* Le globe : bandes empilées, à la manière d'une géante gazeuse. */}
        <mesh>
          <sphereGeometry args={[9, 40, 28]} />
          <meshBasicMaterial color="#4c1d95" />
        </mesh>
        {[
          { y: 3.8, r: 7.9, c: '#6d28d9' },
          { y: 1.0, r: 8.9, c: '#7c3aed' },
          { y: -2.1, r: 8.5, c: '#5b21b6' },
          { y: -5.2, r: 7.0, c: '#4c1d95' },
        ].map((band, i) => (
          <mesh key={i} position={[0, band.y, 0]} scale={[1, 0.28, 1]}>
            <sphereGeometry args={[band.r, 32, 18]} />
            <meshBasicMaterial color={band.c} />
          </mesh>
        ))}
      </group>

      {/* Ses anneaux, vus par la tranche. */}
      <group rotation={[1.15, 0, 0]}>
        <mesh>
          <ringGeometry args={[11.5, 16.5, 96]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh>
          <ringGeometry args={[17.5, 19.5, 96]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.34} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Les lunes.
 *
 * Elles sont posées à des points fixes du ciel lointain, et ne tournent que
 * sur elles-mêmes. Une orbite calculée les faisait passer sous l'horizon la
 * moitié du temps : le décor le plus visible du jeu était absent une capture
 * sur deux. Elles sont assez loin pour que le déplacement du héros ne change
 * rien à leur position apparente.
 */
function Moons({ gradientMap }: { gradientMap: THREE.Texture }) {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  const c = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (a.current) a.current.rotation.y = t * 0.06;
    if (b.current) b.current.rotation.y = -t * 0.04;
    if (c.current) c.current.rotation.y = t * 0.09;
  });

  return (
    <group>
      <Float speed={0.6} rotationIntensity={0.2} floatIntensity={0.8} position={[16, -30, -70]}>
        <mesh ref={a}>
          <icosahedronGeometry args={[3.4, 1]} />
          <meshToonMaterial color="#d9d3e0" gradientMap={gradientMap} />
        </mesh>
        {/* Cratères : trois creux plus sombres, sinon la lune est une bille. */}
        <mesh position={[1.4, 1.2, 2.6]} scale={[1, 0.4, 1]}>
          <sphereGeometry args={[0.8, 12, 10]} />
          <meshToonMaterial color="#a9a2b5" gradientMap={gradientMap} />
        </mesh>
        <mesh position={[-1.8, -0.6, 2.4]} scale={[1, 0.4, 1]}>
          <sphereGeometry args={[0.55, 12, 10]} />
          <meshToonMaterial color="#a9a2b5" gradientMap={gradientMap} />
        </mesh>
      </Float>

      <Float speed={0.5} rotationIntensity={0.3} floatIntensity={1} position={[30, -22, -56]}>
        <mesh ref={b}>
          <icosahedronGeometry args={[2.1, 1]} />
          <meshToonMaterial color="#f4a261" gradientMap={gradientMap} />
        </mesh>
      </Float>

      <Float speed={0.7} rotationIntensity={0.4} floatIntensity={1.2} position={[-30, -20, -52]}>
        <mesh ref={c}>
          <icosahedronGeometry args={[1.3, 0]} />
          <meshToonMaterial color="#8ecae6" gradientMap={gradientMap} />
        </mesh>
      </Float>
    </group>
  );
}

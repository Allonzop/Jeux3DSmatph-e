import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { BUILDINGS, buildingData, baseId, turretStats, type TurretStats } from '../gamedata';
import { useToonGradient, enemyPositions, enemyStates } from './utils';
import {
  WORLD_RADIUS,
  PLANET_RADIUS,
  PLATEAU_THETA,
  checkPlacement,
  surfacePos,
  surfaceRotation,
  surfaceY,
} from '../world';
import { Html, RoundedBox } from '@react-three/drei';
import { spawnBurst, spawnPopup } from '../effects';
import { sfx } from '../sfx';

// Scratch vector reused across frames — never allocate inside useFrame.
const _ePos = new THREE.Vector3();

/** Facteur d'agrandissement des batiments construits. Voir BuildingWrapper. */
const BUILDING_SCALE = 1.35;

/** Cadence de versement des degats : meme DPS, 15 fois moins d'ecritures. */
const DAMAGE_TICK = 0.25;

type BuildingProps = {
  /** Identifiant d'exemplaire — `tourelle` ou `tourelle#2`. Voir gamedata.ts. */
  id: string;
  pos: [number, number, number];
  color: string;
};

const BUILDING_COMPONENTS: Record<string, React.ComponentType<BuildingProps>> = {
  hutte: BuildingHutte,
  ferme: BuildingFerme,
  bar: BuildingBar,
  antenne: BuildingAntenne,
  marche: BuildingMarche,
  tourelle: BuildingTourelle,
  mortier: BuildingMortier,
  cryo: BuildingCryo,
  tesla: BuildingTesla,
};

export function Buildings() {
  const positions = useGameStore(state => state.buildingPositions);
  return (
    <group>
      {Object.entries(positions).map(([id, pos]) => {
        // `id` peut etre un exemplaire (`tourelle#2`) : le composant et les
        // donnees se retrouvent par le type de base.
        const Comp = BUILDING_COMPONENTS[baseId(id)];
        const data = buildingData(id);
        if (!Comp || !data) return null;
        return <Comp key={id} id={id} pos={pos} color={data.color} />;
      })}
      <PlacementController />
    </group>
  );
}

// ---- Free placement: tap the ground to place the selected building ----
function PlacementController() {
  const placingBuilding = useGameStore(state => state.placingBuilding);
  const placeBuilding = useGameStore(state => state.placeBuilding);
  const ghostRef = useRef<THREE.Group>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const zoneMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const validRef = useRef(false);
  const hasPointRef = useRef(false);

  // Reset ghost when entering/leaving placement mode
  useEffect(() => {
    hasPointRef.current = false;
    if (ghostRef.current) ghostRef.current.visible = false;
  }, [placingBuilding]);

  if (!placingBuilding) return null;

  const data = buildingData(placingBuilding);
  const color = data?.color || '#ffffff';
  // Portee de la tour en cours de pose, affichee pendant qu'on choisit : c'est
  // la seule facon de placer une defense en connaissance de cause.
  const previewRange = data?.levels[0]?.turret?.range ?? 0;

  const updateGhost = (e: ThreeEvent<PointerEvent>) => {
    const x = e.point.x;
    const z = e.point.z;
    const others = Object.entries(useGameStore.getState().buildingPositions)
      .filter(([id]) => id !== placingBuilding)
      .map(([, p]) => p);
    const check = checkPlacement(x, z, others);
    validRef.current = check.valid;
    hasPointRef.current = true;
    if (ghostRef.current) {
      ghostRef.current.visible = true;
      const [gx, gy, gz] = surfacePos(x, z, 0.02);
      ghostRef.current.position.set(gx, gy, gz);
      const [rx, ry, rz] = surfaceRotation(x, z);
      ghostRef.current.rotation.order = 'YXZ';
      ghostRef.current.rotation.set(rx, ry, rz);
    }
    if (ringMatRef.current) {
      ringMatRef.current.color.set(check.valid ? '#4ade80' : '#ef4444');
    }
    if (zoneMatRef.current) {
      zoneMatRef.current.color.set(check.valid ? '#4ade80' : '#ef4444');
    }
    return check.valid;
  };

  return (
    <group>
      {/* Capteur de touches : c'est la surface de la planete elle-meme, pas un
          disque plat. Un plan a y=0 flotterait quatre unites au-dessus du sol
          au bord du plateau, et le batiment se poserait a cote du doigt. */}
      <mesh
        position={[0, -PLANET_RADIUS, 0]}
        onPointerMove={updateGhost}
        onPointerDown={(e) => {
          e.stopPropagation();
          const valid = updateGhost(e);
          if (valid) {
            placeBuilding(placingBuilding, [e.point.x, 0, e.point.z]);
            sfx.build();
          }
        }}
      >
        <sphereGeometry
          args={[PLANET_RADIUS + 0.03, 64, 40, 0, Math.PI * 2, 0, PLATEAU_THETA + 0.03]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Ghost marker: colored ring + center disc, green/red for validity */}
      <group ref={ghostRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.1, 1.35, 40]} />
          <meshBasicMaterial ref={ringMatRef} color="#4ade80" transparent opacity={0.85} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.1, 40]} />
          <meshBasicMaterial color={color} transparent opacity={0.25} depthWrite={false} />
        </mesh>
        {previewRange > 0 && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[previewRange - 0.12, previewRange, 64]} />
            <meshBasicMaterial ref={zoneMatRef} color="#4ade80" transparent opacity={0.4} depthWrite={false} />
          </mesh>
        )}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Enveloppe commune
// ---------------------------------------------------------------------------

/**
 * Socle, animation d'apparition, et **evolution visuelle par niveau**.
 *
 * Ameliorer un batiment ne changeait rien a son apparence : « le joueur ne
 * ressent pas sa montee en puissance », dit le retour d'evaluation. Trois
 * choses changent desormais a chaque niveau, cumulatives et visibles de la
 * camera de dessus :
 *
 * - le batiment grandit de 5 % par niveau ;
 * - une couronne de jetons lumineux tourne autour de lui, un par niveau ;
 * - le socle octogonal gagne un anneau exterieur des le niveau 3, puis un
 *   second au niveau 5.
 *
 * Chaque batiment ajoute par-dessus ses propres pieces de niveau (etage,
 * canons, paraboles) — voir chaque composant.
 */
function BuildingWrapper({ id, pos, color, children }: BuildingProps & { children: React.ReactNode }) {
  const level = useGameStore(state => state.buildingLevels[id] || 0);
  const selectBuilding = useGameStore(state => state.selectBuilding);
  const groupRef = useRef<THREE.Group>(null);
  const crownRef = useRef<THREE.Group>(null);

  // Les batiments faisaient environ 2 unites de large pour une camera qui en
  // cadre 26 de haut : 7 % de l'ecran, trop peu pour qu'une silhouette se lise
  // sur un telephone. On les agrandit d'un tiers. `BUILDING_MIN_GAP` a suivi.
  const targetScale = BUILDING_SCALE * (1 + Math.max(0, level - 1) * 0.05);
  const animRef = useRef({ vel: 0, scale: 0 });

  useEffect(() => {
    animRef.current.scale = 0;
    animRef.current.vel = 0.2;
  }, [level]);

  useFrame(({ clock }, delta) => {
    if (groupRef.current) {
      // Ce ressort est integre par Euler explicite, qui diverge des que le pas
      // depasse ~0,3 s : l'echelle part a 1e28, puis NaN, et `setScalar(NaN)`
      // fait disparaitre le batiment — definitivement, car NaN se propage a
      // tous les calculs suivants. Une seconde d'a-coup suffit.
      //
      // On borne donc le pas. Un ralentissement rend l'animation plus lente
      // que le temps reel, ce qui ne se voit pas sur une apparition de 0,5 s,
      // alors qu'un batiment evapore se voit tout de suite.
      const dt = Math.min(delta, 1 / 30);

      const spring = (targetScale - animRef.current.scale) * 15;
      const damper = animRef.current.vel * 5;
      animRef.current.vel += (spring - damper) * dt;
      animRef.current.scale += animRef.current.vel * dt;

      const s = Math.max(0, animRef.current.scale);
      groupRef.current.scale.setScalar(s);
    }
    if (crownRef.current) crownRef.current.rotation.y = clock.elapsedTime * 0.6;
  });

  const gradientMap = useToonGradient();
  const data = buildingData(id);

  return (
    <group position={surfacePos(pos[0], pos[2])} rotation={surfaceRotation(pos[0], pos[2])}>
      {level === 0 ? (
        <group
          onPointerDown={(e) => { e.stopPropagation(); selectBuilding(id); sfx.tap(); }}
        >
          {/* Rounded Dirt Mound */}
          <mesh position={[0, 0.1, 0]} scale={[1, 0.3, 1]} receiveShadow>
            <sphereGeometry args={[1.2, 24, 24]} />
            <meshToonMaterial color="#6b4c3a" gradientMap={gradientMap} />
          </mesh>
          {/* Glowing ground ring in the building's color for readability */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[1.25, 1.5, 40]} />
            <meshBasicMaterial color={color} transparent opacity={0.7} depthWrite={false} />
          </mesh>
          <pointLight position={[0, 0.6, 0]} color={color} intensity={0.35} distance={2.6} />
          {/* Wooden Sign */}
          <group position={[0, 0.4, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.05, 0.05, 0.8]} />
              <meshToonMaterial color="#8a6343" gradientMap={gradientMap} />
            </mesh>
            {/* RoundedBox est lui-même un mesh : imbriqué dans un <mesh> parent,
                le meshToonMaterial voisin s'accrochait à ce parent (sans
                géométrie, donc invisible) et RoundedBox gardait son matériau
                blanc par défaut. Il doit porter directement position/ombres
                et recevoir le matériau en enfant. */}
            <RoundedBox args={[0.8, 0.4, 0.1]} radius={0.05} position={[0, 0.2, 0.05]} castShadow>
              <meshToonMaterial color="#c29d72" gradientMap={gradientMap} />
            </RoundedBox>
          </group>
          <Html position={[0, 0.9, 0.1]} center transform style={{ pointerEvents: 'none' }}>
            <div
              className="px-2 py-1 rounded-lg backdrop-blur text-xs font-bold uppercase tracking-wider whitespace-nowrap border text-center"
              style={{ color, backgroundColor: 'rgba(0,0,0,0.7)', borderColor: `${color}88`, boxShadow: `0 0 10px ${color}55` }}
            >
              {data?.name ?? 'Construire'}
            </div>
          </Html>
        </group>
      ) : (
        <group
          ref={groupRef}
          onPointerDown={(e) => { e.stopPropagation(); selectBuilding(id); sfx.tap(); }}
        >
          {/* Socle octogonal : identifie chaque bâtiment par sa couleur même
              quand son toit sursature sous le bloom (voir le patch blanc du
              même problème plus haut). `meshBasicMaterial`, non éclairé donc
              insensible au bloom et aux pointLight voisines — la leçon de
              cette même séance sur les lampes qui saturaient les socles.
              Rayon choisi pour dépasser du plus large toit (hutte : 1.15). */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[1.05, 1.3, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>

          {/* Anneaux de rang : le socle s'elargit aux niveaux 3 et 5. */}
          {level >= 3 && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
              <ringGeometry args={[1.36, 1.5, 8]} />
              <meshBasicMaterial color={color} transparent opacity={0.75} depthWrite={false} />
            </mesh>
          )}
          {level >= 5 && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
              <ringGeometry args={[1.56, 1.66, 8]} />
              <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} />
            </mesh>
          )}

          {/* Couronne de niveau : un jeton par niveau, en rotation lente. On
              compte le niveau d'un coup d'oeil sans ouvrir de panneau. */}
          <group ref={crownRef} position={[0, 1.55, 0]}>
            {Array.from({ length: level }).map((_, i) => {
              const a = (i / Math.max(1, level)) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62]}>
                  <octahedronGeometry args={[0.09, 0]} />
                  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} />
                </mesh>
              );
            })}
          </group>

          {children}
        </group>
      )}
    </group>
  );
}

/** Cercle de portee au sol, visible pendant les vagues. */
function RangeRing({ range, color }: { range: number; color: string }) {
  const waveActive = useGameStore(state => state.waveActive);
  if (!waveActive || range <= 0) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
      <ringGeometry args={[range - 0.1, range, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Ciblage partage
// ---------------------------------------------------------------------------

type Target = { id: string; x: number; z: number; dist: number };

/**
 * Les monstres qu'une tour peut viser, du plus proche au plus lointain.
 *
 * Un seul endroit decide de ce qui est ciblable, pour les quatre tours :
 * distance mesuree **a plat** (la planete est courbe, mais le jeu raisonne
 * toujours en x/z — voir world.ts), monstres deja morts ecartes, volants
 * reserves aux tours qui les atteignent, et Spectre ignore pendant sa phase de
 * dematerialisation.
 */
function findTargets(
  fromX: number,
  fromZ: number,
  stats: TurretStats,
  limit: number,
  out: Target[],
): Target[] {
  out.length = 0;
  const enemies = useGameStore.getState().enemies;
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const live = enemyPositions.get(enemy.id);
    if (!live) continue;
    const st = enemyStates.get(enemy.id);
    if (st?.intangible) continue;
    if (!stats.hitsAir && (st?.altitude ?? 0) > 0.5) continue;
    const dx = live.x - fromX;
    const dz = live.z - fromZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > stats.range) continue;
    out.push({ id: enemy.id, x: live.x, z: live.z, dist });
  }
  out.sort((a, b) => a.dist - b.dist);
  if (out.length > limit) out.length = limit;
  return out;
}

/** Degats de zone autour d'un point — mortier, et explosion du bombeur. */
function splashDamage(x: number, z: number, radius: number, amount: number, hitsAir: boolean): number {
  const { enemies, damageEnemy } = useGameStore.getState();
  let hits = 0;
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const live = enemyPositions.get(enemy.id);
    if (!live) continue;
    const st = enemyStates.get(enemy.id);
    if (st?.intangible) continue;
    if (!hitsAir && (st?.altitude ?? 0) > 0.5) continue;
    const dx = live.x - x;
    const dz = live.z - z;
    if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
    damageEnemy(enemy.id, amount);
    hits += 1;
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Les batiments de production et de soutien
// ---------------------------------------------------------------------------

function BuildingHutte(props: BuildingProps) {
  const gradientMap = useToonGradient();
  const level = useGameStore(state => state.buildingLevels[props.id] || 0);

  const baseProfile = useMemo(() => [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.8, 0),
    new THREE.Vector2(0.95, 0.3),
    new THREE.Vector2(0.85, 0.6),
    new THREE.Vector2(0.75, 0.8)
  ], []);

  return (
    <BuildingWrapper {...props}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <latheGeometry args={[baseProfile, 32]} />
        <meshToonMaterial color="#fff2df" gradientMap={gradientMap} />
      </mesh>

      {/* Toit : l'ancien profil lathe (pointe -> évasement -> repli sous l'auvent)
          se lisait bien de profil mais montrait de dessus un anneau creux — le
          repli sous l'auvent a des normales tournées vers le bas, invisibles
          d'en haut, laissant voir les "spots" et la base à travers. Un cône
          plein a des normales tournées vers le haut sur toute sa surface : vu
          d'en haut c'est un disque coloré uni, silhouette de toit lisible. */}
      <mesh position={[0, 1.12, 0]} castShadow>
        <coneGeometry args={[1.15, 0.8, 8]} />
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
      </mesh>
      {/* Faîtage : anneau plat à la base du toit, seul repère qui distingue
          encore le toit du mur en vue verticale. */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[1.18, 1.18, 0.08, 8]} />
        <meshToonMaterial color="#8a6343" gradientMap={gradientMap} />
      </mesh>
      {/* Lucarnes : sur la pente du toit, pas dans son volume — elles restent
          visibles comme des bosses plutôt que de percer la surface vue de dessus. */}
      <mesh position={[0.55, 0.92, 0.45]} scale={[1, 0.7, 1]} rotation={[0.5, -0.5, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshToonMaterial color="#fff2df" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[-0.6, 0.85, -0.35]} scale={[1, 0.7, 1]} rotation={[0.4, 0.5, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshToonMaterial color="#fff2df" gradientMap={gradientMap} />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.25, 0.9]} rotation={[0.1, 0, 0]} scale={[1, 1.2, 1]}>
        <sphereGeometry args={[0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI/2]} />
        <meshToonMaterial color="#a06a45" gradientMap={gradientMap} />
      </mesh>

      {/* Niveau 3 : une cheminee qui fume — le premier signe visible que la
          hutte a ete poussee. */}
      {level >= 3 && (
        <group position={[0.5, 1.25, -0.35]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.13, 0.16, 0.5, 8]} />
            <meshToonMaterial color="#8a6343" gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, 0.42, 0]} scale={[1, 0.7, 1]}>
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshBasicMaterial color="#dfe7ef" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* Niveau 4 : une extension laterale — la hutte devient un hameau. */}
      {level >= 4 && (
        <group position={[-0.95, 0, 0.45]} rotation={[0, 0.5, 0]} scale={0.62}>
          <mesh castShadow receiveShadow>
            <latheGeometry args={[baseProfile, 24]} />
            <meshToonMaterial color="#fff2df" gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, 1.05, 0]} castShadow>
            <coneGeometry args={[1.1, 0.7, 8]} />
            <meshToonMaterial color={props.color} gradientMap={gradientMap} />
          </mesh>
        </group>
      )}

      {/* Niveau 5 : le fanion doré, la marque du niveau maximum. */}
      {level >= 5 && (
        <group position={[0, 1.55, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.75, 6]} />
            <meshToonMaterial color="#8a6343" gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0.22, 0.28, 0]}>
            <boxGeometry args={[0.42, 0.24, 0.03]} />
            <meshStandardMaterial color="#ffd24c" emissive="#ffd24c" emissiveIntensity={1.4} />
          </mesh>
        </group>
      )}
    </BuildingWrapper>
  );
}

function BuildingFerme(props: BuildingProps) {
  const gradientMap = useToonGradient();
  const level = useGameStore(state => state.buildingLevels[props.id] || 0);
  return (
    <BuildingWrapper {...props}>
      {/* Bed Base */}
      <RoundedBox args={[1.8, 0.4, 1.8]} radius={0.1} position={[0, 0.2, 0]} castShadow receiveShadow>
        <meshToonMaterial color="#7a5c47" gradientMap={gradientMap} />
      </RoundedBox>

      {/* Glass Dome */}
      {/* Toit de serre. Un `meshStandardMaterial` translucide saturait en blanc
          sous le bloom : vu de dessus, la serre n'etait plus qu'une carte
          blanche. Toon opaque et teinte franche, la coupole se lit. */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.95, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshToonMaterial color="#7fd4a3" gradientMap={gradientMap} />
      </mesh>
      {/* Armature : donne une arete au sommet, seul detail visible d'en haut. */}
      {[0, Math.PI / 2].map((a, i) => (
        <mesh key={i} position={[0, 0.42, 0]} rotation={[0, a, 0]}>
          <boxGeometry args={[1.95, 0.06, 0.08]} />
          <meshToonMaterial color="#3f6d54" gradientMap={gradientMap} />
        </mesh>
      ))}

      {/* Inside Sprouts — un plant de plus par niveau. */}
      <group position={[0, 0.4, 0]}>
        <mesh position={[0, 0, 0]} scale={[0.5, 1, 0.5]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshToonMaterial color={props.color} gradientMap={gradientMap} />
        </mesh>
        {level >= 2 && (
          <mesh position={[0.3, 0, 0.3]} scale={[0.4, 0.8, 0.4]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshToonMaterial color={props.color} gradientMap={gradientMap} />
          </mesh>
        )}
        {level >= 3 && (
          <mesh position={[-0.3, 0, -0.2]} scale={[0.6, 1.2, 0.6]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshToonMaterial color={props.color} gradientMap={gradientMap} />
          </mesh>
        )}
      </group>

      {/* Niveau 4 : la serre gagne un second dome et des tubes de culture. */}
      {level >= 4 && (
        <group position={[0.95, 0.2, -0.5]} scale={0.55}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <sphereGeometry args={[0.95, 18, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshToonMaterial color="#7fd4a3" gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 1.1, 10]} />
            <meshStandardMaterial color="#57cc99" emissive="#57cc99" emissiveIntensity={0.8} />
          </mesh>
        </group>
      )}

      {/* Intensité réduite : à 0.25, si proche de la coupole, elle saturait tout
          le socle sous le bloom (patch blanc uni visible de dessus). */}
      <pointLight position={[0, 0.5, 0]} color={props.color} intensity={0.09} distance={2.4} />
    </BuildingWrapper>
  );
}

function BuildingBar(props: BuildingProps) {
  const gradientMap = useToonGradient();
  const level = useGameStore(state => state.buildingLevels[props.id] || 0);

  const barrelProfile = useMemo(() => [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.8, 0),
    new THREE.Vector2(1.0, 0.5),
    new THREE.Vector2(0.8, 1.0),
    new THREE.Vector2(0, 1.0)
  ], []);

  return (
    <BuildingWrapper {...props}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <latheGeometry args={[barrelProfile, 32]} />
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
      </mesh>

      {/* Scalloped Awning */}
      <group position={[0, 0.9, 0.9]}>
        {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.8, 16, 1, false, 0, Math.PI]} />
            <meshToonMaterial color={i % 2 === 0 ? props.color : "#fff2df"} gradientMap={gradientMap} />
          </mesh>
        ))}
      </group>

      {/* Neon Sign — un anneau de plus par niveau, empile vers le haut. */}
      {Array.from({ length: Math.max(1, level) }).map((_, i) => (
        <group key={i} position={[0, 1.4 + i * 0.3, 0.8]}>
          <mesh>
            <torusGeometry args={[0.3 - i * 0.04, 0.05, 16, 32]} />
            <meshBasicMaterial color="#ff69b4" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.4, 0.8]}>
        <cylinderGeometry args={[0.25, 0.25, 0.02, 32]} />
        <meshBasicMaterial color="#ff1493" transparent opacity={0.6} />
      </mesh>

      {/* Stools */}
      <group position={[-0.8, 0, 1.2]}>
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.3]} />
          <meshToonMaterial color="#555" gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, 0.3, 0]} scale={[1, 0.5, 1]} castShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshToonMaterial color="#fff2df" gradientMap={gradientMap} />
        </mesh>
      </group>

      <pointLight position={[0, 1.4, 0.8]} color="#ff69b4" intensity={0.3} distance={2.2} />
    </BuildingWrapper>
  );
}

function BuildingAntenne(props: BuildingProps) {
  const gradientMap = useToonGradient();
  const lightRef = useRef<THREE.PointLight>(null);
  const dishRef = useRef<THREE.Group>(null);
  const level = useGameStore(state => state.buildingLevels[props.id] || 0);

  const spireProfile = useMemo(() => [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.5, 0),
    new THREE.Vector2(0.35, 0.8),
    new THREE.Vector2(0.2, 1.8),
    new THREE.Vector2(0.05, 2.5),
    new THREE.Vector2(0, 2.5)
  ], []);

  useFrame(({ clock }) => {
    if (lightRef.current) {
      lightRef.current.intensity = Math.abs(Math.sin(clock.elapsedTime * 3)) * 0.6;
    }
    if (dishRef.current) {
      dishRef.current.rotation.y = clock.elapsedTime * 0.5;
      dishRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.2) * 0.2 - 0.2;
    }
  });

  return (
    <BuildingWrapper {...props}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <latheGeometry args={[spireProfile, 32]} />
        <meshToonMaterial color="#f8f9fa" gradientMap={gradientMap} />
      </mesh>

      {/* Fins */}
      {[0, (Math.PI*2)/3, (Math.PI*4)/3].map((angle, i) => (
        <RoundedBox
          key={i}
          args={[0.1, 0.8, 0.6]}
          radius={0.05}
          position={[Math.cos(angle)*0.4, 0.4, Math.sin(angle)*0.4]}
          rotation={[0, -angle + Math.PI/2, 0.2]}
        >
          <meshToonMaterial color={props.color} gradientMap={gradientMap} />
        </RoundedBox>
      ))}

      {/* Dish */}
      <group ref={dishRef} position={[0, 2.5, 0]}>
        <mesh position={[0, -0.1, 0]} castShadow>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshToonMaterial color="#666" gradientMap={gradientMap} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0]} castShadow>
          <latheGeometry args={[
            [new THREE.Vector2(0,-0.1), new THREE.Vector2(0.4,0), new THREE.Vector2(0.45, 0.1)], 32
          ]} />
          <meshToonMaterial color={props.color} gradientMap={gradientMap} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.08]} />
          <meshStandardMaterial emissive="#ff0000" emissiveIntensity={2} color="#ff0000" />
        </mesh>
        <pointLight ref={lightRef} position={[0, 0.4, 0]} color="#ff0000" distance={2.5} />
      </group>

      {/* Paraboles secondaires : une par niveau au-dela du premier, en spirale
          le long du mat. La montee en puissance se lit sur la silhouette. */}
      {Array.from({ length: Math.max(0, level - 1) }).map((_, i) => {
        const a = i * 2.1;
        const y = 1 + i * 0.45;
        return (
          <group key={i} position={[Math.cos(a) * 0.42, y, Math.sin(a) * 0.42]} rotation={[0.5, -a, 0]}>
            <mesh castShadow>
              <latheGeometry args={[
                [new THREE.Vector2(0, -0.05), new THREE.Vector2(0.2, 0), new THREE.Vector2(0.23, 0.06)], 16
              ]} />
              <meshToonMaterial color={props.color} gradientMap={gradientMap} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </BuildingWrapper>
  );
}

function BuildingMarche(props: BuildingProps) {
  const gradientMap = useToonGradient();
  const level = useGameStore(state => state.buildingLevels[props.id] || 0);
  return (
    <BuildingWrapper {...props}>
      <RoundedBox args={[2.2, 0.6, 1.4]} radius={0.2} position={[0, 0.3, 0]} castShadow receiveShadow>
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
      </RoundedBox>

      {/* Awning */}
      <group position={[0, 0.8, 0.4]} rotation={[0.2, 0, 0]}>
        {[-0.9, -0.3, 0.3, 0.9].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 1.6, 16, 1, false, 0, Math.PI]} />
            {/* Une bande sur deux etait creme : vu de dessus l'auvent devenait
                une carte blanche. Alternance sombre, les rayures se lisent. */}
            <meshToonMaterial color={i % 2 === 0 ? props.color : "#8c4a2f"} gradientMap={gradientMap} />
          </mesh>
        ))}
      </group>

      {/* Crates & Fruits */}
      <group position={[0.4, 0.6, 0.4]}>
        <RoundedBox args={[0.5, 0.2, 0.4]} radius={0.05} castShadow>
          <meshToonMaterial color="#8a6343" gradientMap={gradientMap} />
        </RoundedBox>
        <mesh position={[-0.1, 0.15, -0.05]}><sphereGeometry args={[0.08, 8, 8]}/><meshToonMaterial color="#ff4d6d"/></mesh>
        <mesh position={[0.1, 0.15, 0.05]}><sphereGeometry args={[0.08, 8, 8]}/><meshToonMaterial color="#ff4d6d"/></mesh>
        <mesh position={[0.0, 0.2, 0.0]}><sphereGeometry args={[0.08, 8, 8]}/><meshToonMaterial color="#ff4d6d"/></mesh>
      </group>

      <group position={[-0.4, 0.6, 0.4]}>
        <RoundedBox args={[0.5, 0.2, 0.4]} radius={0.05} castShadow>
          <meshToonMaterial color="#8a6343" gradientMap={gradientMap} />
        </RoundedBox>
        <mesh position={[-0.1, 0.15, 0.05]}><sphereGeometry args={[0.08, 8, 8]}/><meshToonMaterial color="#8338ec"/></mesh>
        <mesh position={[0.1, 0.15, -0.05]}><sphereGeometry args={[0.08, 8, 8]}/><meshToonMaterial color="#8338ec"/></mesh>
        <mesh position={[0.0, 0.2, 0.0]}><sphereGeometry args={[0.08, 8, 8]}/><meshToonMaterial color="#8338ec"/></mesh>
      </group>

      {/* Enseigne holographique, une lame par niveau. */}
      {Array.from({ length: level }).map((_, i) => (
        <mesh key={i} position={[0, 1.15 + i * 0.22, 0]} rotation={[0, i * 0.4, 0]}>
          <boxGeometry args={[1.1 - i * 0.2, 0.04, 0.04]} />
          <meshStandardMaterial color="#ffd24c" emissive="#ffd24c" emissiveIntensity={1.6} />
        </mesh>
      ))}

      {/* Idem hutte/ferme : intensité réduite, sinon le dessus de l'étal saturait
          en blanc sous le bloom et effaçait l'auvent rayé qu'on cherche à voir. */}
      <pointLight position={[0, 0.7, 0.6]} color="#ffd24c" intensity={0.1} distance={2.4} />
    </BuildingWrapper>
  );
}

// ---------------------------------------------------------------------------
// Les tours
// ---------------------------------------------------------------------------

/** Tourelle laser — le tir continu mono-cible, la tour d'origine. */
function BuildingTourelle(props: BuildingProps) {
  const gradientMap = useToonGradient();
  const barrelRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  const level = useGameStore(state => state.buildingLevels[props.id] || 0);
  const stats = turretStats(props.id, level);
  const dmgAcc = useRef(0);
  const tickTimer = useRef(0);
  const targets = useRef<Target[]>([]);

  useFrame(({ clock }, delta) => {
    if (!stats) return;
    const found = findTargets(props.pos[0], props.pos[2], stats, 1, targets.current);
    const target = found[0];

    if (target) {
      if (barrelRef.current) {
        _ePos.set(target.x, surfaceY(target.x, target.z) + 0.5, target.z);
        barrelRef.current.lookAt(_ePos);
      }
      if (beamRef.current) beamRef.current.visible = true;
      // Accumulate damage and flush ~4x/sec: same DPS, far fewer store
      // updates (each one re-renders the enemy tree via its hp bars).
      dmgAcc.current += stats.dps * delta;
      tickTimer.current += delta;
      if (tickTimer.current >= DAMAGE_TICK) {
        useGameStore.getState().damageEnemy(target.id, dmgAcc.current);
        dmgAcc.current = 0;
        tickTimer.current = 0;
      }
    } else {
      if (beamRef.current) beamRef.current.visible = false;
      dmgAcc.current = 0;
      tickTimer.current = 0;
      if (barrelRef.current) {
        barrelRef.current.rotation.y = clock.elapsedTime * 0.5;
        barrelRef.current.rotation.x = 0;
        barrelRef.current.rotation.z = 0;
      }
    }
  });

  return (
    <BuildingWrapper {...props}>
      <RangeRing range={stats?.range ?? 0} color={props.color} />

      {/* Legs */}
      {[0, (Math.PI*2)/3, (Math.PI*4)/3].map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle)*0.5, 0.2, Math.sin(angle)*0.5]} rotation={[0, -angle, 0.3]} castShadow>
          <capsuleGeometry args={[0.08, 0.3, 8, 16]} />
          <meshToonMaterial color="#333" gradientMap={gradientMap} />
        </mesh>
      ))}

      {/* Socle : le pod ivoire et le canon (masqué dans son propre corps, voir
          plus bas) ne portaient aucune couleur reconnaissable vue de dessus —
          juste une bille pâle parmi les autres bâtiments. Ce plateau, plus
          large que le pod, donne à la tourelle une silhouette et une couleur
          identifiables depuis la caméra, quelle que soit l'orientation du canon. */}
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.78, 0.82, 0.12, 8]} />
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
      </mesh>

      {/* Pod Body */}
      <mesh position={[0, 0.5, 0]} scale={[1, 0.8, 1]} castShadow receiveShadow>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshToonMaterial color="#fff2df" gradientMap={gradientMap} />
      </mesh>

      {/* Tracking Barrel — un canon de plus tous les deux niveaux. */}
      <group ref={barrelRef} position={[0, 0.5, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.3, 24, 24]} />
          <meshToonMaterial color="#333" gradientMap={gradientMap} />
        </mesh>

        {barrelOffsets(level).map((offset, i) => (
          <group key={i} position={[offset, 0, 0]}>
            <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <capsuleGeometry args={[0.13, 0.4 + level * 0.05, 12, 12]} />
              <meshToonMaterial color={props.color} gradientMap={gradientMap} />
            </mesh>
            <mesh position={[0, 0, 0.52 + level * 0.02]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.13, 0.04, 12, 24]} />
              <meshStandardMaterial emissive={props.color} emissiveIntensity={2} color={props.color} />
            </mesh>
          </group>
        ))}

        {/* Laser beam — always mounted, visibility toggled imperatively in useFrame */}
        <mesh ref={beamRef} visible={false} position={[0, 0, 4.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03 + level * 0.008, 0.03 + level * 0.008, 8]} />
          <meshBasicMaterial color={props.color} transparent opacity={0.6} />
        </mesh>
      </group>

      <pointLight position={[0, 0.9, 0]} color={props.color} intensity={0.3} distance={2.4} />
    </BuildingWrapper>
  );
}

/** Decalage lateral des canons : 1 canon aux niveaux 1-2, 2 aux 3-4, 3 au 5. */
function barrelOffsets(level: number): number[] {
  if (level >= 5) return [-0.22, 0, 0.22];
  if (level >= 3) return [-0.16, 0.16];
  return [0];
}

/**
 * Mortier a plasma — obus lents, degats de zone.
 *
 * L'obus voyage vraiment : il part du canon, decrit une parabole, et n'inflige
 * ses degats qu'a l'impact. C'est ce trajet visible qui rend le mortier
 * lisible — une tour qui tape instantanement en zone ne se distingue pas d'un
 * laser, et le joueur ne comprend pas pourquoi les groupes fondent.
 */
function BuildingMortier(props: BuildingProps) {
  const gradientMap = useToonGradient();
  const level = useGameStore(state => state.buildingLevels[props.id] || 0);
  const stats = turretStats(props.id, level);

  const barrelRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const targets = useRef<Target[]>([]);
  const cooldown = useRef(0);
  /** Obus en vol : origine, cible, avancement. Un seul a la fois. */
  const shell = useRef({ active: false, fromX: 0, fromZ: 0, toX: 0, toZ: 0, t: 0 });

  /** Intervalle entre deux obus. Les degats de la salve valent dps * intervalle. */
  const RELOAD = 1.6;
  const FLIGHT = 0.5;

  useFrame((_, delta) => {
    if (!stats) return;

    // --- Obus en vol ---
    if (shell.current.active && shellRef.current) {
      shell.current.t += delta / FLIGHT;
      const t = shell.current.t;
      if (t >= 1) {
        shell.current.active = false;
        shellRef.current.visible = false;
        const { toX, toZ } = shell.current;
        const hits = splashDamage(toX, toZ, stats.splash, stats.dps * RELOAD, stats.hitsAir);
        spawnBurst(toX, surfaceY(toX, toZ) + 0.4, toZ, '#ff7b00', stats.splash * 0.8, 0.5);
        if (hits > 0) sfx.boom();
      } else {
        const x = shell.current.fromX + (shell.current.toX - shell.current.fromX) * t;
        const z = shell.current.fromZ + (shell.current.toZ - shell.current.fromZ) * t;
        // Parabole : hauteur maximale a mi-parcours.
        const arc = Math.sin(t * Math.PI) * 3.2;
        shellRef.current.visible = true;
        shellRef.current.position.set(x, surfaceY(x, z) + 0.6 + arc, z);
        shellRef.current.rotation.x += delta * 9;
      }
    }

    // --- Visee et tir ---
    cooldown.current -= delta;
    const found = findTargets(props.pos[0], props.pos[2], stats, 1, targets.current);
    const target = found[0];
    if (!target) return;

    if (barrelRef.current) {
      barrelRef.current.rotation.y = Math.atan2(target.x - props.pos[0], target.z - props.pos[2]);
    }

    if (cooldown.current <= 0 && !shell.current.active) {
      cooldown.current = RELOAD;
      shell.current.active = true;
      shell.current.t = 0;
      shell.current.fromX = props.pos[0];
      shell.current.fromZ = props.pos[2];
      shell.current.toX = target.x;
      shell.current.toZ = target.z;
    }
  });

  return (
    <BuildingWrapper {...props}>
      <RangeRing range={stats?.range ?? 0} color={props.color} />

      {/* Cuve blindee */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.72, 0.86, 0.6, 8]} />
        <meshToonMaterial color="#4a4a52" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.72, 0.16, 8]} />
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
      </mesh>

      {/* Verins — un de plus par niveau, disposes en couronne. */}
      {Array.from({ length: 3 + level }).map((_, i) => {
        const a = (i / (3 + level)) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.8, 0.18, Math.sin(a) * 0.8]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.36, 6]} />
            <meshToonMaterial color="#2f2f36" gradientMap={gradientMap} />
          </mesh>
        );
      })}

      {/* Tube, incline vers le ciel : c'est ce qui dit « tir en cloche ». */}
      <group ref={barrelRef} position={[0, 0.7, 0]}>
        <group rotation={[-0.95, 0, 0]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.26, 1.15, 12]} />
            <meshToonMaterial color="#33333a" gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, 1.08, 0]}>
            <torusGeometry args={[0.2, 0.05, 10, 20]} />
            <meshStandardMaterial color={props.color} emissive={props.color} emissiveIntensity={1.8} />
          </mesh>
          {/* Bandes de renfort : une par niveau. */}
          {Array.from({ length: level }).map((_, i) => (
            <mesh key={i} position={[0, 0.15 + i * 0.24, 0]}>
              <torusGeometry args={[0.24, 0.035, 8, 16]} />
              <meshToonMaterial color={props.color} gradientMap={gradientMap} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Obus — toujours monte, deplace et masque dans useFrame. */}
      <mesh ref={shellRef} visible={false}>
        <icosahedronGeometry args={[0.19, 0]} />
        <meshStandardMaterial color="#ffba08" emissive="#ff7b00" emissiveIntensity={2.4} flatShading />
      </mesh>

      <pointLight position={[0, 0.9, 0]} color={props.color} intensity={0.28} distance={2.6} />
    </BuildingWrapper>
  );
}

/**
 * Cryo-diffuseur — ne vise personne, ralentit tout ce qui entre dans sa bulle.
 *
 * C'est la tour qui ne tue pas. Elle donne du temps aux autres, ce qui est
 * invisible si on ne le montre pas : d'ou la bulle de givre permanente et le
 * halo bleu sur les monstres ralentis.
 */
function BuildingCryo(props: BuildingProps) {
  const gradientMap = useToonGradient();
  const level = useGameStore(state => state.buildingLevels[props.id] || 0);
  const stats = turretStats(props.id, level);

  const domeRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const dmgTimer = useRef(0);

  useFrame(({ clock }, delta) => {
    if (!stats) return;
    const t = clock.elapsedTime;

    if (domeRef.current) {
      const pulse = 1 + Math.sin(t * 1.6) * 0.04;
      domeRef.current.scale.set(pulse, pulse, pulse);
    }
    if (ringRef.current) ringRef.current.rotation.z = t * 0.4;

    // Le ralentissement est repose en continu avec une courte date
    // d'expiration : un monstre qui sort de la bulle se libere tout seul, sans
    // que la tour ait a suivre qui elle a gele.
    const { enemies, damageEnemy } = useGameStore.getState();
    dmgTimer.current += delta;
    const flush = dmgTimer.current >= DAMAGE_TICK;

    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      const live = enemyPositions.get(enemy.id);
      if (!live) continue;
      const st = enemyStates.get(enemy.id);
      if (st?.intangible) continue;
      const dx = live.x - props.pos[0];
      const dz = live.z - props.pos[2];
      if (Math.sqrt(dx * dx + dz * dz) > stats.splash) continue;
      if (st) {
        st.slow = Math.max(st.slow, stats.slow);
        st.slowUntil = t + 0.4;
      }
      if (flush) damageEnemy(enemy.id, stats.dps * dmgTimer.current);
    }
    if (flush) dmgTimer.current = 0;
  });

  return (
    <BuildingWrapper {...props}>
      {/* La zone de gel est permanente, pas seulement pendant les vagues : elle
          fait partie de ce qu'on regarde en placant la tour. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[(stats?.splash ?? 5) - 0.12, stats?.splash ?? 5, 64]} />
        <meshBasicMaterial color={props.color} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[stats?.splash ?? 5, 48]} />
        <meshBasicMaterial color={props.color} transparent opacity={0.06} depthWrite={false} />
      </mesh>

      {/* Base givree */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.8, 0.44, 6]} />
        <meshToonMaterial color="#dbeafe" gradientMap={gradientMap} />
      </mesh>

      {/* Aiguilles de glace — une de plus par niveau. */}
      {Array.from({ length: 3 + level * 2 }).map((_, i) => {
        const n = 3 + level * 2;
        const a = (i / n) * Math.PI * 2;
        const h = 0.5 + (i % 3) * 0.22;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.5, 0.45 + h / 2, Math.sin(a) * 0.5]}
            rotation={[0.16 * Math.cos(a), 0, -0.16 * Math.sin(a)]}
            castShadow
          >
            <coneGeometry args={[0.11, h, 5]} />
            <meshStandardMaterial color="#bae6fd" emissive={props.color} emissiveIntensity={0.6} flatShading />
          </mesh>
        );
      })}

      {/* Coeur de givre */}
      <mesh ref={domeRef} position={[0, 0.85, 0]} castShadow>
        <icosahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color="#e0f2fe" emissive={props.color} emissiveIntensity={1.6} flatShading />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.66, 0.035, 8, 32]} />
        <meshStandardMaterial color={props.color} emissive={props.color} emissiveIntensity={1.6} />
      </mesh>

      <pointLight position={[0, 1, 0]} color={props.color} intensity={0.45} distance={3.4} />
    </BuildingWrapper>
  );
}

/**
 * Bobine Tesla — arcs simultanes sur plusieurs monstres, volants compris.
 *
 * C'est la seule reponse aux Ecumeurs en dehors du heros : sans elle, une
 * vague de volants passe au-dessus de toutes les autres defenses.
 */
function BuildingTesla(props: BuildingProps) {
  const gradientMap = useToonGradient();
  const level = useGameStore(state => state.buildingLevels[props.id] || 0);
  const stats = turretStats(props.id, level);

  const coilRef = useRef<THREE.Group>(null);
  const arcRefs = useRef<(THREE.Mesh | null)[]>([]);
  const targets = useRef<Target[]>([]);
  const dmgAcc = useRef(0);
  const tickTimer = useRef(0);

  /** Nombre maximum d'arcs montes : celui du dernier niveau, pour ne jamais
   *  remonter de geometrie en pleine vague. */
  const MAX_ARCS = 5;
  const ARC_HEIGHT = 1.5;

  useFrame(({ clock }, delta) => {
    if (coilRef.current) coilRef.current.rotation.y = clock.elapsedTime * 1.4;
    if (!stats) {
      for (const arc of arcRefs.current) if (arc) arc.visible = false;
      return;
    }

    const found = findTargets(props.pos[0], props.pos[2], stats, stats.targets, targets.current);

    for (let i = 0; i < MAX_ARCS; i++) {
      const arc = arcRefs.current[i];
      if (!arc) continue;
      const target = found[i];
      if (!target) {
        arc.visible = false;
        continue;
      }
      // Arc tendu du sommet de la bobine jusqu'a la cible : position au
      // milieu, echelle Y = longueur, orientation par quaternion.
      const dx = target.x - props.pos[0];
      const dz = target.z - props.pos[2];
      const dy = surfaceY(target.x, target.z) + 0.7 - (surfaceY(props.pos[0], props.pos[2]) + ARC_HEIGHT);
      _ePos.set(dx, dy, dz);
      const len = _ePos.length();
      arc.visible = true;
      arc.position.set(dx / 2, ARC_HEIGHT + dy / 2, dz / 2);
      arc.scale.set(1, Math.max(0.001, len), 1);
      _arcDir.copy(_ePos).normalize();
      arc.quaternion.setFromUnitVectors(_up, _arcDir);
    }

    if (found.length === 0) {
      dmgAcc.current = 0;
      tickTimer.current = 0;
      return;
    }

    dmgAcc.current += stats.dps * delta;
    tickTimer.current += delta;
    if (tickTimer.current >= DAMAGE_TICK) {
      const damageEnemy = useGameStore.getState().damageEnemy;
      // Chaque cible prend les degats pleins : c'est ce qui rend le tesla
      // decisif sur un paquet, et cher a monter.
      for (const target of found) damageEnemy(target.id, dmgAcc.current);
      sfx.zap();
      dmgAcc.current = 0;
      tickTimer.current = 0;
    }
  });

  return (
    <BuildingWrapper {...props}>
      <RangeRing range={stats?.range ?? 0} color={props.color} />

      {/* Pylone */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.6, 0.7, 6]} />
        <meshToonMaterial color="#3d3357" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.86, 0.16, 6]} />
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
      </mesh>

      {/* Bobines empilees : une de plus par niveau. */}
      <group ref={coilRef} position={[0, 0.7, 0]}>
        {Array.from({ length: Math.max(1, level) }).map((_, i) => (
          <mesh key={i} position={[0, i * 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.34 - i * 0.03, 0.05, 10, 24]} />
            <meshStandardMaterial color={props.color} emissive={props.color} emissiveIntensity={1.5} />
          </mesh>
        ))}
        <mesh position={[0, ARC_HEIGHT - 0.7, 0]}>
          <sphereGeometry args={[0.26, 18, 14]} />
          <meshStandardMaterial color="#f3e8ff" emissive={props.color} emissiveIntensity={2.6} />
        </mesh>
      </group>

      {/* Arcs — pre-montes, visibilite pilotee dans useFrame. */}
      {Array.from({ length: MAX_ARCS }).map((_, i) => (
        <mesh key={i} ref={(el) => { arcRefs.current[i] = el; }} visible={false}>
          <cylinderGeometry args={[0.035, 0.035, 1, 6]} />
          <meshBasicMaterial color="#e9d5ff" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ))}

      <pointLight position={[0, 1.3, 0]} color={props.color} intensity={0.5} distance={3.2} />
    </BuildingWrapper>
  );
}

// Vecteurs de travail des arcs du tesla.
const _arcDir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

// Reexporte pour que d'autres scenes (le radar de vague) sachent quels
// batiments existent sans reimporter gamedata.
export { BUILDINGS };

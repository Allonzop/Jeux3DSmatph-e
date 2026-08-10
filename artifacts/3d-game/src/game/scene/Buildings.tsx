import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { BUILDINGS } from '../gamedata';
import { useToonGradient, enemyPositions } from './utils';
import { WORLD_RADIUS, checkPlacement } from '../world';
import { Html, RoundedBox } from '@react-three/drei';

// Scratch vector reused across frames — never allocate inside useFrame.
const _ePos = new THREE.Vector3();

/** Facteur d'agrandissement des batiments construits. Voir BuildingWrapper. */
const BUILDING_SCALE = 1.35;

type BuildingProps = {
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
};

export function Buildings() {
  const positions = useGameStore(state => state.buildingPositions);
  return (
    <group>
      {Object.entries(positions).map(([id, pos]) => {
        const Comp = BUILDING_COMPONENTS[id];
        const data = BUILDINGS[id];
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
  const validRef = useRef(false);
  const hasPointRef = useRef(false);

  // Reset ghost when entering/leaving placement mode
  useEffect(() => {
    hasPointRef.current = false;
    if (ghostRef.current) ghostRef.current.visible = false;
  }, [placingBuilding]);

  if (!placingBuilding) return null;

  const color = BUILDINGS[placingBuilding]?.color || '#ffffff';

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
      ghostRef.current.position.set(x, 0.02, z);
    }
    if (ringMatRef.current) {
      ringMatRef.current.color.set(check.valid ? '#4ade80' : '#ef4444');
    }
    return check.valid;
  };

  return (
    <group>
      {/* Invisible tap-catcher covering the whole island */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onPointerMove={updateGhost}
        onPointerDown={(e) => {
          e.stopPropagation();
          const valid = updateGhost(e);
          if (valid) {
            placeBuilding(placingBuilding, [e.point.x, 0, e.point.z]);
          }
        }}
      >
        <circleGeometry args={[WORLD_RADIUS + 0.5, 48]} />
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
      </group>
    </group>
  );
}

// Reusable Base Building Component
function BuildingWrapper({ id, pos, color, children }: BuildingProps & { children: React.ReactNode }) {
  const level = useGameStore(state => state.buildingLevels[id] || 0);
  const selectBuilding = useGameStore(state => state.selectBuilding);
  const groupRef = useRef<THREE.Group>(null);
  
  // Les batiments faisaient environ 2 unites de large pour une camera qui en
  // cadre 26 de haut : 7 % de l'ecran, trop peu pour qu'une silhouette se lise
  // sur un telephone. On les agrandit d'un tiers. `BUILDING_MIN_GAP` a suivi.
  const targetScale = BUILDING_SCALE;
  const animRef = useRef({ vel: 0, scale: 0 });

  useEffect(() => {
    animRef.current.scale = 0;
    animRef.current.vel = 0.2;
  }, [level]);

  useFrame((_, delta) => {
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
  });

  const gradientMap = useToonGradient();

  return (
    <group position={pos}>
      {level === 0 ? (
        <group 
          onPointerDown={(e) => { e.stopPropagation(); selectBuilding(id); }}
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
            <mesh position={[0, 0.2, 0.05]} castShadow>
              <RoundedBox args={[0.8, 0.4, 0.1]} radius={0.05} />
              <meshToonMaterial color="#c29d72" gradientMap={gradientMap} />
            </mesh>
          </group>
          <Html position={[0, 0.9, 0.1]} center transform style={{ pointerEvents: 'none' }}>
            <div
              className="px-2 py-1 rounded-lg backdrop-blur text-xs font-bold uppercase tracking-wider whitespace-nowrap border"
              style={{ color, backgroundColor: 'rgba(0,0,0,0.7)', borderColor: `${color}88`, boxShadow: `0 0 10px ${color}55` }}
            >
              Construire
            </div>
          </Html>
        </group>
      ) : (
        <group 
          ref={groupRef}
          onPointerDown={(e) => { e.stopPropagation(); selectBuilding(id); }}
        >
          {children}
        </group>
      )}
    </group>
  );
}

function BuildingHutte(props: BuildingProps) {
  const gradientMap = useToonGradient();
  
  const roofProfile = useMemo(() => [
    new THREE.Vector2(0, 0.8),
    new THREE.Vector2(0.5, 0.75),
    new THREE.Vector2(0.85, 0.5),
    new THREE.Vector2(1.1, 0.1),
    new THREE.Vector2(1.2, -0.1),
    new THREE.Vector2(1.1, -0.2),
    new THREE.Vector2(0.9, -0.1),
    new THREE.Vector2(0.8, 0)
  ], []);

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
      
      <mesh position={[0, 0.7, 0]} castShadow>
        <latheGeometry args={[roofProfile, 32]} />
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
        {/* Spots */}
        <mesh position={[0.6, 0.4, 0.6]} scale={[1, 0.2, 1]} rotation={[0.5, -0.5, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshToonMaterial color="#fff2df" gradientMap={gradientMap} />
        </mesh>
        <mesh position={[-0.7, 0.3, 0.4]} scale={[1, 0.2, 1]} rotation={[0.4, 0.5, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshToonMaterial color="#fff2df" gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, 0.6, -0.8]} scale={[1, 0.2, 1]} rotation={[-0.5, 0, 0]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshToonMaterial color="#fff2df" gradientMap={gradientMap} />
        </mesh>
      </mesh>
      
      {/* Door */}
      <mesh position={[0, 0.25, 0.9]} rotation={[0.1, 0, 0]} scale={[1, 1.2, 1]}>
        <sphereGeometry args={[0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI/2]} />
        <meshToonMaterial color="#a06a45" gradientMap={gradientMap} />
      </mesh>
    </BuildingWrapper>
  );
}

function BuildingFerme(props: BuildingProps) {
  const gradientMap = useToonGradient();
  return (
    <BuildingWrapper {...props}>
      {/* Bed Base */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <RoundedBox args={[1.8, 0.4, 1.8]} radius={0.1} />
        <meshToonMaterial color="#7a5c47" gradientMap={gradientMap} />
      </mesh>
      
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
      
      {/* Inside Sprouts */}
      <group position={[0, 0.4, 0]}>
        <mesh position={[0, 0, 0]} scale={[0.5, 1, 0.5]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshToonMaterial color={props.color} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0.3, 0, 0.3]} scale={[0.4, 0.8, 0.4]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshToonMaterial color={props.color} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[-0.3, 0, -0.2]} scale={[0.6, 1.2, 0.6]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshToonMaterial color={props.color} gradientMap={gradientMap} />
        </mesh>
      </group>
      
      <pointLight position={[0, 0.5, 0]} color={props.color} intensity={0.25} distance={2.4} />
    </BuildingWrapper>
  );
}

function BuildingBar(props: BuildingProps) {
  const gradientMap = useToonGradient();
  
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

      {/* Neon Sign */}
      <mesh position={[0, 1.4, 0.8]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.3, 0.05, 16, 32]} />
        <meshBasicMaterial color="#ff69b4" />
      </mesh>
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
        <mesh key={i} position={[Math.cos(angle)*0.4, 0.4, Math.sin(angle)*0.4]} rotation={[0, -angle + Math.PI/2, 0.2]}>
          <RoundedBox args={[0.1, 0.8, 0.6]} radius={0.05} />
          <meshToonMaterial color={props.color} gradientMap={gradientMap} />
        </mesh>
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
    </BuildingWrapper>
  );
}

function BuildingMarche(props: BuildingProps) {
  const gradientMap = useToonGradient();
  return (
    <BuildingWrapper {...props}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <RoundedBox args={[2.2, 0.6, 1.4]} radius={0.2} />
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
      </mesh>
      
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
        <mesh castShadow>
          <RoundedBox args={[0.5, 0.2, 0.4]} radius={0.05} />
          <meshToonMaterial color="#8a6343" gradientMap={gradientMap} />
        </mesh>
        <mesh position={[-0.1, 0.15, -0.05]}><sphereGeometry args={[0.08, 8, 8]}/><meshToonMaterial color="#ff4d6d"/></mesh>
        <mesh position={[0.1, 0.15, 0.05]}><sphereGeometry args={[0.08, 8, 8]}/><meshToonMaterial color="#ff4d6d"/></mesh>
        <mesh position={[0.0, 0.2, 0.0]}><sphereGeometry args={[0.08, 8, 8]}/><meshToonMaterial color="#ff4d6d"/></mesh>
      </group>

      <group position={[-0.4, 0.6, 0.4]}>
        <mesh castShadow>
          <RoundedBox args={[0.5, 0.2, 0.4]} radius={0.05} />
          <meshToonMaterial color="#8a6343" gradientMap={gradientMap} />
        </mesh>
        <mesh position={[-0.1, 0.15, 0.05]}><sphereGeometry args={[0.08, 8, 8]}/><meshToonMaterial color="#8338ec"/></mesh>
        <mesh position={[0.1, 0.15, -0.05]}><sphereGeometry args={[0.08, 8, 8]}/><meshToonMaterial color="#8338ec"/></mesh>
        <mesh position={[0.0, 0.2, 0.0]}><sphereGeometry args={[0.08, 8, 8]}/><meshToonMaterial color="#8338ec"/></mesh>
      </group>
      
      <pointLight position={[0, 0.7, 0.6]} color="#ffd24c" intensity={0.28} distance={2.4} />
    </BuildingWrapper>
  );
}

function BuildingTourelle(props: BuildingProps) {
  const gradientMap = useToonGradient();
  const barrelRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  
  const level = useGameStore(state => state.buildingLevels['tourelle'] || 0);
  const dmgAcc = useRef(0);
  const tickTimer = useRef(0);

  useFrame(({ clock }, delta) => {
    if (level === 0) return;

    const state = useGameStore.getState();
    const enemies = state.enemies;
    const waveActive = state.waveActive;
    
    let nearestDist = 8;
    let nearestEnemy = null;
    
    if (waveActive) {
      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue;
        // Read live positions from the imperative registry (store pos is only the spawn point).
        const live = enemyPositions.get(enemy.id);
        const ex = live ? live.x : enemy.pos[0];
        const ey = live ? live.y : enemy.pos[1];
        const ez = live ? live.z : enemy.pos[2];
        const dx = ex - props.pos[0];
        const dy = ey - props.pos[1];
        const dz = ez - props.pos[2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = enemy;
        }
      }
    }

    if (nearestEnemy) {
      if (barrelRef.current) {
        const live = enemyPositions.get(nearestEnemy.id);
        if (live) {
          _ePos.copy(live);
        } else {
          _ePos.set(nearestEnemy.pos[0], nearestEnemy.pos[1], nearestEnemy.pos[2]);
        }
        _ePos.y += 0.5; 
        barrelRef.current.lookAt(_ePos);
      }
      if (beamRef.current) beamRef.current.visible = true;
      // Accumulate damage and flush ~4x/sec: same DPS, far fewer store
      // updates (each one re-renders the enemy tree via its hp bars).
      dmgAcc.current += 50 * delta;
      tickTimer.current += delta;
      if (tickTimer.current >= 0.25) {
        state.damageEnemy(nearestEnemy.id, dmgAcc.current);
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
      {/* Legs */}
      {[0, (Math.PI*2)/3, (Math.PI*4)/3].map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle)*0.5, 0.2, Math.sin(angle)*0.5]} rotation={[0, -angle, 0.3]} castShadow>
          <capsuleGeometry args={[0.08, 0.3, 8, 16]} />
          <meshToonMaterial color="#333" gradientMap={gradientMap} />
        </mesh>
      ))}

      {/* Pod Body */}
      <mesh position={[0, 0.5, 0]} scale={[1, 0.8, 1]} castShadow receiveShadow>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshToonMaterial color="#fff2df" gradientMap={gradientMap} />
      </mesh>
      
      {/* Tracking Barrel */}
      <group ref={barrelRef} position={[0, 0.5, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.3, 24, 24]} />
          <meshToonMaterial color="#333" gradientMap={gradientMap} />
        </mesh>
        
        <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.15, 0.4, 16, 16]} />
          <meshToonMaterial color={props.color} gradientMap={gradientMap} />
        </mesh>

        <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.15, 0.04, 16, 32]} />
          <meshStandardMaterial emissive={props.color} emissiveIntensity={2} color={props.color} />
        </mesh>
        
        {/* Laser beam — always mounted, visibility toggled imperatively in useFrame */}
        <mesh ref={beamRef} visible={false} position={[0, 0, 4.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 8]} />
          <meshBasicMaterial color={props.color} transparent opacity={0.6} />
        </mesh>
      </group>
      
      <pointLight position={[0, 0.9, 0]} color={props.color} intensity={0.3} distance={2.4} />
    </BuildingWrapper>
  );
}

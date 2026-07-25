import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { useToonGradient } from './utils';
import { Html } from '@react-three/drei';

type BuildingProps = {
  id: string;
  pos: [number, number, number];
  color: string;
};

export function Buildings() {
  return (
    <group>
      <BuildingHutte id="hutte" pos={[0, 0, -6]} color="#f4a261" />
      <BuildingFerme id="ferme" pos={[6, 0, -3]} color="#57cc99" />
      <BuildingBar id="bar" pos={[-6, 0, -3]} color="#e07a5f" />
      <BuildingAntenne id="antenne" pos={[0, 0, 6]} color="#e63946" />
      <BuildingMarche id="marche" pos={[6, 0, 3]} color="#ffd24c" />
      <BuildingTourelle id="tourelle" pos={[-6, 0, 3]} color="#4cc9f0" />
    </group>
  );
}

// Reusable Base Building Component for common logic
function BuildingWrapper({ id, pos, color, children, onTarget }: BuildingProps & { children: React.ReactNode, onTarget?: (target: THREE.Vector3 | null) => void }) {
  const level = useGameStore(state => state.buildingLevels[id] || 0);
  const selectBuilding = useGameStore(state => state.selectBuilding);
  const groupRef = useRef<THREE.Group>(null);
  
  // Spring animation state
  const [scale, setScale] = useState(0);
  const targetScale = level > 0 ? 1 : 1; // Plot is also scale 1
  const animRef = useRef({ vel: 0, scale: 0 });

  useEffect(() => {
    // Trigger bounce on level change
    animRef.current.scale = 0;
    animRef.current.vel = 0.2;
  }, [level]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Spring physics
      const spring = (targetScale - animRef.current.scale) * 15;
      const damper = animRef.current.vel * 5;
      animRef.current.vel += (spring - damper) * delta;
      animRef.current.scale += animRef.current.vel * delta;
      
      const s = Math.max(0, animRef.current.scale);
      groupRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={pos}>
      {level === 0 ? (
        <mesh 
          position={[0, 0.05, 0]} 
          rotation={[-Math.PI / 2, 0, 0]} 
          onPointerDown={(e) => { e.stopPropagation(); selectBuilding(id); }}
        >
          <cylinderGeometry args={[1.2, 1.2, 0.1, 32]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
          <Html position={[0, 0, 0]} center transform style={{ pointerEvents: 'none' }}>
            <div className="px-2 py-1 bg-black/60 rounded backdrop-blur text-white text-xs font-bold uppercase tracking-wider" style={{ color }}>
              Build
            </div>
          </Html>
        </mesh>
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
  return (
    <BuildingWrapper {...props}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.6, 16]} />
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <sphereGeometry args={[0.78, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[-0.3, 0.3, 0.75]} castShadow>
        <boxGeometry args={[0.2, 0.2, 0.1]} />
        <meshBasicMaterial color="#ffffaa" />
      </mesh>
      <mesh position={[0.3, 0.3, 0.75]} castShadow>
        <boxGeometry args={[0.2, 0.2, 0.1]} />
        <meshBasicMaterial color="#ffffaa" />
      </mesh>
    </BuildingWrapper>
  );
}

function BuildingFerme(props: BuildingProps) {
  const gradientMap = useToonGradient();
  return (
    <BuildingWrapper {...props}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1, 1]} />
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 1.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.2, 0.8, 4]} />
        <meshToonMaterial color="#2d6a4f" gradientMap={gradientMap} />
      </mesh>
      <pointLight position={[0, 1, 0]} color={props.color} intensity={0.6} distance={4} />
    </BuildingWrapper>
  );
}

function BuildingBar(props: BuildingProps) {
  const gradientMap = useToonGradient();
  return (
    <BuildingWrapper {...props}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.8, 1.2]} />
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 0.85, 0.2]} castShadow>
        <boxGeometry args={[2.2, 0.1, 1.5]} />
        <meshToonMaterial color="#3d405b" gradientMap={gradientMap} />
      </mesh>
      {/* Neon sign */}
      <mesh position={[0, 1, 0.8]}>
        <boxGeometry args={[1, 0.3, 0.1]} />
        <meshBasicMaterial color="#ff69b4" />
      </mesh>
      <pointLight position={[0, 0.5, 1]} color="#ff69b4" intensity={0.8} distance={5} />
    </BuildingWrapper>
  );
}

function BuildingAntenne(props: BuildingProps) {
  const gradientMap = useToonGradient();
  const lightRef = useRef<THREE.PointLight>(null);
  const dishRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (lightRef.current) {
      lightRef.current.intensity = Math.abs(Math.sin(clock.elapsedTime * 3));
    }
    if (dishRef.current) {
      dishRef.current.rotation.y = clock.elapsedTime * 0.5;
      dishRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.2) * 0.2 - 0.2;
    }
  });

  return (
    <BuildingWrapper {...props}>
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.12, 2.5]} />
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
      </mesh>
      <group ref={dishRef} position={[0, 2.5, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.4, 0.05, 8, 16]} />
          <meshToonMaterial color={props.color} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, 0, 0.2]}>
          <sphereGeometry args={[0.08]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      </group>
      <pointLight ref={lightRef} position={[0, 2.7, 0]} color="#ff0000" distance={5} />
    </BuildingWrapper>
  );
}

function BuildingMarche(props: BuildingProps) {
  const gradientMap = useToonGradient();
  return (
    <BuildingWrapper {...props}>
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.7, 1.4]} />
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0, 0.74, 0.2]} rotation={[0.1, 0, 0]} castShadow>
        <boxGeometry args={[2.4, 0.08, 1.8]} />
        <meshToonMaterial color="#ffd24c" gradientMap={gradientMap} />
      </mesh>
      <pointLight position={[0, 0.5, 1]} color="#ffd24c" intensity={0.7} distance={5} />
    </BuildingWrapper>
  );
}

function BuildingTourelle(props: BuildingProps) {
  const gradientMap = useToonGradient();
  const barrelRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  
  const [targetPos, setTargetPos] = useState<THREE.Vector3 | null>(null);

  const level = useGameStore(state => state.buildingLevels['tourelle'] || 0);

  useFrame(({ clock }, delta) => {
    if (level === 0) return;

    const state = useGameStore.getState();
    const enemies = state.enemies;
    const waveActive = state.waveActive;
    
    let nearestDist = 8;
    let nearestEnemy = null;
    
    if (waveActive) {
      // Find nearest enemy
      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue;
        const dx = enemy.pos[0] - props.pos[0];
        const dy = enemy.pos[1] - props.pos[1];
        const dz = enemy.pos[2] - props.pos[2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = enemy;
        }
      }
    }

    if (nearestEnemy) {
      // Rotate barrel toward enemy
      if (barrelRef.current) {
        const ePos = new THREE.Vector3(...nearestEnemy.pos);
        ePos.y += 0.5; // aim at center of body
        barrelRef.current.lookAt(ePos);
      }
      setTargetPos(new THREE.Vector3(...nearestEnemy.pos));
      
      // Damage
      state.damageEnemy(nearestEnemy.id, 50 * delta);
    } else {
      setTargetPos(null);
      // Idle rotation
      if (barrelRef.current) {
        barrelRef.current.rotation.y = clock.elapsedTime * 0.5;
        barrelRef.current.rotation.x = 0;
        barrelRef.current.rotation.z = 0;
      }
    }
  });

  return (
    <BuildingWrapper {...props}>
      {/* Base */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 0.8, 0.5, 8]} />
        <meshToonMaterial color={props.color} gradientMap={gradientMap} />
      </mesh>
      
      {/* Rotating Head/Barrel */}
      <group ref={barrelRef} position={[0, 0.6, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.4]} />
          <meshToonMaterial color="#333" gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.15, 0.8]} />
          <meshToonMaterial color={props.color} gradientMap={gradientMap} />
        </mesh>
        
        {/* Beam */}
        {targetPos && (
          <mesh position={[0, 0, 4.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 8]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
          </mesh>
        )}
      </group>
      
      <pointLight position={[0, 1, 0]} color={props.color} intensity={1} distance={5} />
    </BuildingWrapper>
  );
}

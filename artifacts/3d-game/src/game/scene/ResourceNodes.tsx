import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, ResourceType } from '../store';
import { useToonGradient } from './utils';
import { Html } from '@react-three/drei';

type NodeDef = {
  id: ResourceType;
  pos: [number, number, number];
  color: string;
  amount: number;
};

const NODES: NodeDef[] = [
  { id: 'boulons', pos: [-4, 0.5, -4], color: '#c9c9c9', amount: 10 },
  { id: 'matiere_floue', pos: [4, 0.5, 0], color: '#8e5ce8', amount: 3 },
  { id: 'energie_rire', pos: [0, 0.5, 4], color: '#ffd24c', amount: 2 },
];

export function ResourceNodes() {
  return (
    <group>
      {NODES.map((node) => (
        <ResourceNode key={node.id} def={node} />
      ))}
      <Particles />
    </group>
  );
}

function ResourceNode({ def }: { def: NodeDef }) {
  const groupRef = useRef<THREE.Group>(null);
  const [active, setActive] = React.useState(true);
  const [cooldownTime, setCooldownTime] = React.useState(0);
  
  const gradientMap = useToonGradient();
  const addResources = useGameStore(state => state.addResources);
  const addParticle = useGameStore(state => state.addParticle);

  useFrame((state, delta) => {
    // Rotation animation
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
      
      if (active) {
        groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      } else {
        groupRef.current.scale.lerp(new THREE.Vector3(0.5, 0.5, 0.5), 0.1);
      }
    }

    if (!active) {
      setCooldownTime(prev => {
        const next = prev - delta;
        if (next <= 0) {
          setActive(true);
          return 0;
        }
        return next;
      });
    }

    // Collision detection
    if (active) {
      const heroPos = useGameStore.getState().heroPos;
      const dx = heroPos[0] - def.pos[0];
      const dy = heroPos[1] - def.pos[1];
      const dz = heroPos[2] - def.pos[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (dist < 2) {
        // Collect
        setActive(false);
        setCooldownTime(5);
        addResources({ [def.id]: def.amount });
        
        // Spawn particles
        for (let i = 0; i < 5; i++) {
          addParticle({
            from: def.pos,
            resource: def.id
          });
        }
      }
    }
  });

  return (
    <group position={def.pos}>
      <group ref={groupRef}>
        {def.id === 'boulons' && (
          <group>
            {[0, 1, 2, 3].map(i => (
              <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 0.2, 0, Math.sin(i * Math.PI / 2) * 0.2]} rotation={[0.2, i * Math.PI / 2, 0]}>
                <coneGeometry args={[0.2, 0.6, 4]} />
                <meshToonMaterial color={def.color} gradientMap={gradientMap} transparent opacity={active ? 1 : 0.4} />
              </mesh>
            ))}
          </group>
        )}
        {def.id === 'matiere_floue' && (
          <mesh>
            <octahedronGeometry args={[0.5]} />
            <meshToonMaterial color={def.color} gradientMap={gradientMap} transparent opacity={active ? 1 : 0.4} />
          </mesh>
        )}
        {def.id === 'energie_rire' && (
          <group>
            <mesh rotation={[Math.PI / 4, 0, 0]}>
              <torusGeometry args={[0.4, 0.15, 8, 16]} />
              <meshToonMaterial color={def.color} gradientMap={gradientMap} transparent opacity={active ? 1 : 0.4} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.2]} />
              <meshToonMaterial color={def.color} gradientMap={gradientMap} transparent opacity={active ? 1 : 0.4} />
            </mesh>
          </group>
        )}
      </group>
      
      <pointLight color={def.color} intensity={active ? 1 : 0.2} distance={5} />
      
      {!active && (
        <Html position={[0, 1, 0]} center transform style={{ pointerEvents: 'none' }}>
          <div className="w-8 h-2 bg-black/50 rounded overflow-hidden">
            <div 
              className="h-full bg-white/80 transition-all duration-100 ease-linear"
              style={{ width: `${(1 - cooldownTime / 5) * 100}%` }}
            />
          </div>
        </Html>
      )}
    </group>
  );
}

function Particles() {
  const particles = useGameStore(state => state.particles);
  const updateParticles = useGameStore(state => state.updateParticles);
  const removeParticle = useGameStore(state => state.removeParticle);
  
  useFrame((_, delta) => {
    updateParticles(delta);
    const stateParticles = useGameStore.getState().particles;
    stateParticles.forEach(p => {
      if (p.progress >= 1) {
        removeParticle(p.id);
      }
    });
  });

  return (
    <group>
      {particles.map(p => (
        <ParticleMesh key={p.id} particle={p} />
      ))}
    </group>
  );
}

function ParticleMesh({ particle }: { particle: any }) {
  const ref = useRef<THREE.Mesh>(null);
  
  const color = particle.resource === 'boulons' ? '#c9c9c9' : 
                particle.resource === 'matiere_floue' ? '#8e5ce8' : '#ffd24c';

  useFrame(() => {
    if (ref.current) {
      const heroPos = useGameStore.getState().heroPos;
      const start = new THREE.Vector3(...particle.from);
      const end = new THREE.Vector3(heroPos[0], heroPos[1] + 1, heroPos[2]);
      
      // Arc path
      const mid = start.clone().lerp(end, 0.5);
      mid.y += 2; // arc height
      
      // Quadratic bezier manually
      const t = particle.progress;
      const t1 = 1 - t;
      const pos = new THREE.Vector3()
        .addScaledVector(start, t1 * t1)
        .addScaledVector(mid, 2 * t1 * t)
        .addScaledVector(end, t * t);
        
      ref.current.position.copy(pos);
      ref.current.scale.setScalar(1 - t);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

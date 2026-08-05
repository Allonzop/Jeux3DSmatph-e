import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, ResourceType } from '../store';
import { useToonGradient } from './utils';
import { RESOURCE_NODE_POSITIONS } from '../world';
import { Html, Float } from '@react-three/drei';

// Scratch vectors reused across frames — never allocate inside useFrame.
const _one = new THREE.Vector3(1, 1, 1);
const _half = new THREE.Vector3(0.5, 0.5, 0.5);
const _start = new THREE.Vector3();
const _end = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _pos = new THREE.Vector3();

type NodeDef = {
  id: ResourceType;
  pos: [number, number, number];
  color: string;
  amount: number;
};

const NODES: NodeDef[] = [
  { id: 'boulons', pos: RESOURCE_NODE_POSITIONS.boulons, color: '#c9c9c9', amount: 10 },
  { id: 'matiere_floue', pos: RESOURCE_NODE_POSITIONS.matiere_floue, color: '#8e5ce8', amount: 3 },
  { id: 'energie_rire', pos: RESOURCE_NODE_POSITIONS.energie_rire, color: '#ffd24c', amount: 2 },
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
  const cooldownRef = useRef(0);
  const displayAccum = useRef(0);

  useFrame((state, delta) => {
    if (groupRef.current) {
      if (active) {
        groupRef.current.scale.lerp(_one, 0.1);
      } else {
        groupRef.current.scale.lerp(_half, 0.1);
      }
    }

    if (!active) {
      cooldownRef.current -= delta;
      displayAccum.current += delta;
      if (cooldownRef.current <= 0) {
        setActive(true);
        setCooldownTime(0);
      } else if (displayAccum.current >= 0.1) {
        // Throttle the cooldown-bar re-render to ~10/sec instead of every frame.
        displayAccum.current = 0;
        setCooldownTime(cooldownRef.current);
      }
    }

    if (active) {
      const heroPos = useGameStore.getState().heroPos;
      const dx = heroPos[0] - def.pos[0];
      const dy = heroPos[1] - def.pos[1];
      const dz = heroPos[2] - def.pos[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (dist < 2) {
        setActive(false);
        cooldownRef.current = 5;
        displayAccum.current = 0;
        setCooldownTime(5);
        addResources({ [def.id]: def.amount });
        
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
      {/* Dirt Mound */}
      <mesh position={[0, -0.4, 0]} scale={[1, 0.4, 1]} receiveShadow>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshToonMaterial color="#6b4c3a" gradientMap={gradientMap} />
      </mesh>

      <group ref={groupRef}>
        {def.id === 'boulons' && (
          <group>
            {[0, 1, 2, 3, 4].map(i => (
              <mesh key={i} position={[Math.cos(i * Math.PI*2/5) * 0.3, 0, Math.sin(i * Math.PI*2/5) * 0.3]} rotation={[0.5, i * Math.PI*2/5, 0]} castShadow>
                <icosahedronGeometry args={[0.3, 0]} />
                <meshStandardMaterial color="#888" emissive="#c9c9c9" emissiveIntensity={0.5} flatShading transparent opacity={active ? 1 : 0.4} />
              </mesh>
            ))}
          </group>
        )}
        
        {def.id === 'matiere_floue' && (
          <Float speed={2} rotationIntensity={1} floatIntensity={0.5}>
            <mesh castShadow>
              <icosahedronGeometry args={[0.45, 1]} />
              <meshStandardMaterial color="#8e5ce8" emissive="#8e5ce8" emissiveIntensity={1.5} flatShading transparent opacity={active ? 1 : 0.4} />
            </mesh>
          </Float>
        )}
        
        {def.id === 'energie_rire' && (
          <Float speed={3} rotationIntensity={0} floatIntensity={0.2}>
            <mesh scale={[1, 0.8, 1]} castShadow>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color="#ffd24c" emissive="#ffd24c" emissiveIntensity={1} transparent opacity={active ? 1 : 0.4} />
            </mesh>
            <OrbitingSpheres active={active} color={def.color} />
          </Float>
        )}
      </group>
      
      <pointLight color={def.color} intensity={active ? 1.5 : 0.2} distance={5} />
      
      {!active && (
        <Html position={[0, 1, 0]} center transform style={{ pointerEvents: 'none' }}>
          <div className="w-8 h-2 bg-black/50 rounded overflow-hidden border border-black/50">
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

function OrbitingSpheres({ active, color }: { active: boolean, color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 2;
  });
  return (
    <group ref={ref}>
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} position={[Math.cos(i * Math.PI/2) * 0.6, 0, Math.sin(i * Math.PI/2) * 0.6]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} transparent opacity={active ? 1 : 0.2} />
        </mesh>
      ))}
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
      _start.set(particle.from[0], particle.from[1], particle.from[2]);
      _end.set(heroPos[0], heroPos[1] + 1, heroPos[2]);
      
      _mid.copy(_start).lerp(_end, 0.5);
      _mid.y += 2;
      
      const t = particle.progress;
      const t1 = 1 - t;
      _pos.set(0, 0, 0)
        .addScaledVector(_start, t1 * t1)
        .addScaledVector(_mid, 2 * t1 * t)
        .addScaledVector(_end, t * t);
        
      ref.current.position.copy(_pos);
      ref.current.scale.setScalar(1 - t);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshStandardMaterial emissive={color} emissiveIntensity={2} color={color} />
    </mesh>
  );
}

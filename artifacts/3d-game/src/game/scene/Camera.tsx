import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store';
import * as THREE from 'three';

export function Camera() {
  const { camera } = useThree();
  const heroPos = useGameStore((state) => state.heroPos);
  
  useFrame(() => {
    const targetPos = new THREE.Vector3(heroPos[0], heroPos[1] + 14, heroPos[2] + 10);
    camera.position.lerp(targetPos, 0.05);
    camera.lookAt(heroPos[0], heroPos[1] + 1, heroPos[2]);
  });
  
  return null;
}

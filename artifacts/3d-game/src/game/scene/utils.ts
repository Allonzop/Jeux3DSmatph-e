import * as THREE from 'three';
import { useMemo } from 'react';

export function useToonGradient() {
  return useMemo(() => {
    const data = new Uint8Array([
      80, 80, 80, 255,
      140, 140, 140, 255,
      220, 220, 220, 255,
    ]);
    const map = new THREE.DataTexture(data, 3, 1);
    map.format = THREE.RGBAFormat;
    map.type = THREE.UnsignedByteType;
    map.needsUpdate = true;
    return map;
  }, []);
}

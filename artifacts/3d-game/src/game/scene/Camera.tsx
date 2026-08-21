import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store';
import { surfaceY } from '../world';
import { damp } from './utils';
import { shake } from '../effects';
import { cameraControl } from '../cameraControl';
import * as THREE from 'three';

// Vecteur de travail — la version precedente allouait un Vector3 par image.
const _target = new THREE.Vector3();

/**
 * Camera d'epaule fixe au-dessus du heros.
 *
 * Depuis le passage a la planete, la hauteur visee suit la courbure du sol
 * (`surfaceY`) : sans ca, le heros descendait hors cadre des qu'il s'eloignait
 * du centre, la ou le terrain plonge de quatre unites.
 */
export function Camera() {
  const { camera } = useThree();
  const heroPos = useGameStore((state) => state.heroPos);

  useFrame(({ clock }, delta) => {
    const ground = surfaceY(heroPos[0], heroPos[2]);
    // Amortissement de l'orientation : une rotation instantanee donne le mal
    // de mer sur un telephone. `damp` la rend independante de la cadence.
    cameraControl.yaw += (cameraControl.target - cameraControl.yaw) * damp(0.12, delta);

    // Angle abaisse depuis le passage a la planete : a 55° on ne voyait que du
    // sol, et la courbure — tout l'interet de la sphere — sortait du cadre. A
    // 45° l'horizon, l'anneau et les lunes entrent dans l'image sans que les
    // batiments se cachent les uns les autres.
    //
    // Le decalage de 13 unites derriere le heros tourne avec `yaw` : a 0 on
    // retombe exactement sur (0, +13,5, +13), le cadrage d'origine.
    const sin = Math.sin(cameraControl.yaw);
    const cos = Math.cos(cameraControl.yaw);
    _target.set(
      heroPos[0] + sin * 13,
      heroPos[1] + ground + 13.5,
      heroPos[2] + cos * 13,
    );
    camera.position.lerp(_target, damp(0.05, delta));

    // Secousse : un monstre qui atteint le noyau doit se sentir. L'amplitude
    // est posee par `addShake` (effects.ts) et retombe ici — deux frequences
    // premieres entre elles pour eviter le tremblement mecanique.
    if (shake.amount > 0.001) {
      const t = clock.elapsedTime;
      const a = shake.amount;
      camera.position.x += Math.sin(t * 47) * a * 0.35;
      camera.position.y += Math.sin(t * 61) * a * 0.28;
      shake.amount = Math.max(0, a - delta * 2.2);
    }

    camera.lookAt(heroPos[0], heroPos[1] + ground + 1.6, heroPos[2]);
  });

  return null;
}

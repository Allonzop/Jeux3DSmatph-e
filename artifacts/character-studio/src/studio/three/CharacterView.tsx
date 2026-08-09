import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { ToonHumanoid } from '@game/characters/ToonHumanoid';
import type { CharacterDef } from '@game/characters/types';
import { shapeSignature } from '../defaults';

const box = new THREE.Box3();
const scaleVec = new THREE.Vector3();

export interface CharacterViewProps {
  def: CharacterDef;
  moving?: boolean;
  /** Hauteur mesurée du personnage, en unités monde. Doit être stable (useCallback). */
  onMeasure?: (height: number) => void;
}

/**
 * `ToonHumanoid` ne gère ni position ni rotation : c'est à l'appelant de placer
 * le groupe parent (PRD §3). Ce composant assume cette responsabilité et pose
 * les pieds du personnage sur le plan y = 0, quelle que soit sa morphologie.
 *
 * La table `BODY_DIMS` qui donnerait la hauteur est privée à `ToonHumanoid.tsx`
 * (voir RAPPORT.md). Plutôt que d'en recopier une version — qui divergerait à
 * la première mise à jour du kit — on mesure la boîte englobante réelle du rig
 * une fois monté. La mesure suit donc le kit automatiquement.
 */
export function CharacterView({ def, moving = false, onMeasure }: CharacterViewProps) {
  const groupRef = useRef<THREE.Group>(null);
  const measureCb = useRef(onMeasure);
  measureCb.current = onMeasure;

  const signature = shapeSignature(def);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // La `key` ci-dessous vient de remonter le rig : son `useFrame` n'a pas
    // encore tourné, la pose est au repos et la mesure n'est pas faussée par
    // le rebond de la marche.
    group.position.y = 0;
    group.updateWorldMatrix(true, true);
    box.setFromObject(group);
    if (box.isEmpty()) return;

    // `box` est en coordonnées monde. On ne cherche qu'un déplacement, donc la
    // translation du parent s'annule ; seule son échelle doit être compensée.
    const parentScale = group.parent ? group.parent.getWorldScale(scaleVec).y || 1 : 1;
    group.position.y = -box.min.y / parentScale;
    measureCb.current?.((box.max.y - box.min.y) / parentScale);
  }, [signature]);

  return (
    <group ref={groupRef}>
      {/* Remonter le rig quand la silhouette change garantit une mesure sur
          une pose au repos. Les changements de couleur, de visage ou d'humeur
          ne touchent pas la signature : ils ne remontent rien. */}
      <ToonHumanoid key={signature} def={def} moving={moving} />
    </group>
  );
}

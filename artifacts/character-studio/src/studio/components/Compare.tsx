import { useCallback, useMemo, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { PerspectiveCamera } from 'three';
import { clearCompare, openEditor, toggleCompare, useStudio } from '../store';
import { CharacterView } from '../three/CharacterView';
import { Ground, LIGHTING, PlaybackSpeed, StudioLights, StudioPostFX } from '../three/Stage';
import type { LibraryEntry } from '../types';

/** Écart entre deux personnages, en unités monde. */
const SPACING = 1.15;
/** Marges laissées autour du groupe lors du cadrage. */
const MARGIN = { vertical: 1.3, horizontal: 1.12 };

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;

export function Compare() {
  const entries = useStudio((s) => s.entries);
  const compareUids = useStudio((s) => s.compareUids);
  const [moving, setMoving] = useState(true);
  const [speed, setSpeed] = useState(1);

  const selected = useMemo(
    () => compareUids
      .map((uid) => entries.find((e) => e.uid === uid))
      .filter((e): e is LibraryEntry => e !== undefined),
    [entries, compareUids],
  );

  const count = selected.length;
  const span = Math.max(1, count) * SPACING;

  const controlsRef = useRef<OrbitControlsImpl>(null);
  const tallestRef = useRef(0);
  const fittedKey = useRef('');
  const fitKey = `${compareUids.join(',')}`;

  /**
   * Cadre le groupe entier. La contrainte qui l'emporte dépend du format de la
   * fenêtre : sur un écran large c'est la hauteur, sur un écran étroit avec
   * quatre personnages c'est la largeur. On calcule les deux et on recule
   * d'autant qu'il faut.
   */
  const fit = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return false;
    const camera = controls.object as PerspectiveCamera;
    const height = tallestRef.current || 1.2;
    const halfTan = Math.tan((camera.fov * Math.PI) / 180 / 2);
    const distV = (height * MARGIN.vertical) / (2 * halfTan);
    const distH = (span * MARGIN.horizontal) / (2 * halfTan * camera.aspect);

    // Caméra à la hauteur de sa cible : le groupe est centré verticalement.
    controls.target.set(0, height * 0.5, 0);
    camera.position.set(0, height * 0.5, Math.max(distV, distH));
    controls.update();
    return true;
  }, [span]);

  // Chaque personnage annonce sa hauteur ; c'est le plus grand qui décide.
  const onMeasure = useCallback((height: number) => {
    if (fittedKey.current !== fitKey) tallestRef.current = 0;
    tallestRef.current = Math.max(tallestRef.current, height);
    requestAnimationFrame(() => { if (fit()) fittedKey.current = fitKey; });
  }, [fit, fitKey]);

  return (
    <section className="compare">
      <header className="compare-bar">
        <strong>Vue comparative</strong>
        <span className="muted">
          {count === 0
            ? 'Sélectionnez 2 à 4 personnages dans la bibliothèque (bouton « comparer »).'
            : `${count} personnage${count > 1 ? 's' : ''} — 4 maximum`}
        </span>
        <span className="spacer" />
        <div className="segmented">
          <button type="button" className={!moving ? 'active' : ''} onClick={() => setMoving(false)}>repos</button>
          <button type="button" className={moving ? 'active' : ''} onClick={() => setMoving(true)}>marche</button>
        </div>
        <label className="speed">
          vitesse
          <input type="range" min={0} max={2} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          <output>{speed.toFixed(1)}×</output>
        </label>
        <button type="button" className="btn" onClick={clearCompare} disabled={count === 0}>vider</button>
      </header>

      {count === 0 ? (
        <p className="empty">Rien à comparer pour l'instant.</p>
      ) : (
        <>
          <div className="compare-canvas">
            <Canvas shadows camera={{ position: [0, 0.9, 2 + span], fov: 32 }} gl={{ antialias: true }}>
              <color attach="background" args={[LIGHTING.background]} />
              <PlaybackSpeed speed={speed} />
              <StudioLights shadows />
              <Ground />
              {selected.map((entry, i) => (
                <group key={entry.uid} position={[(i - (count - 1) / 2) * SPACING, 0, 0]}>
                  <CharacterView def={entry.def} moving={moving} onMeasure={onMeasure} />
                </group>
              ))}
              <OrbitControls ref={controlsRef} target={[0, 0.62, 0]} enablePan={false} minDistance={1.5} maxDistance={14} maxPolarAngle={Math.PI * 0.52} />
              <StudioPostFX />
            </Canvas>
          </div>

          <footer className="compare-legend">
            {selected.map((entry, i) => (
              <div key={entry.uid} className="legend-item">
                <span className="legend-index">{i + 1}</span>
                <div className="legend-text">
                  <strong>{entry.name}</strong>
                  <code>{entry.def.id}</code>
                </div>
                <button type="button" className="btn small" onClick={() => openEditor(entry.uid)}>ouvrir</button>
                <button type="button" className="btn small" onClick={() => toggleCompare(entry.uid)}>retirer</button>
              </div>
            ))}
          </footer>
        </>
      )}
    </section>
  );
}

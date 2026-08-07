import { useCallback, useMemo, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { CharacterDef } from '../../kit/types';

/** `three-stdlib` n'est qu'une dépendance transitive de drei : on lit le type
 *  du ref depuis le composant lui-même plutôt que de l'importer de là. */
type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;
import {
  BACK_KEYS, BODY_TYPES, EYE_SHAPES, FACE_GEAR_KEYS, HEADWEAR_KEYS,
  MOUTH_SHAPES, NECK_KEYS, PERSONALITY_KEYS, RANGES, minimalDef, toFullDef,
} from '../defaults';
import { randomSeed, surpriseDef } from '../generate';
import { copyToClipboard, defToJson } from '../exchange';
import { openEditor, replaceDef, updateDef, updateEntry, useStudio } from '../store';
import { CharacterView } from '../three/CharacterView';
import { Ground, PlaybackSpeed, StudioLights } from '../three/Stage';
import {
  ColorField, Field, NullableSelect, SeedField, Select, Slider, TagField, TextField, Toggle,
} from './controls';

/**
 * Cadrage : caméra à la même hauteur que sa cible — le personnage se retrouve
 * exactement au centre de l'image, sans le décentrage qu'induirait une visée
 * plongeante. Les ratios sont relatifs à la hauteur mesurée du personnage.
 */
const FRAME = { targetY: 0.5, cameraY: 0.5, distance: 2.5 };

interface PreviewProps {
  def: CharacterDef;
  moving: boolean;
  speed: number;
  onMeasure: (height: number) => void;
}

function Preview({ def, moving, speed, onMeasure }: PreviewProps) {
  return (
    <>
      {/* Monté avant le personnage : son `useFrame` s'exécute donc avant, et la
          valeur d'horloge qu'il écrit est celle que lira le rig. */}
      <PlaybackSpeed speed={speed} />
      <StudioLights shadows />
      <Ground />
      <CharacterView def={def} moving={moving} onMeasure={onMeasure} />
    </>
  );
}

export function Editor() {
  const uid = useStudio((s) => s.editingUid);
  const entry = useStudio((s) => s.entries.find((e) => e.uid === s.editingUid));
  const [moving, setMoving] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [copied, setCopied] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const heightRef = useRef(1.4);
  const framedUid = useRef<string | null>(null);

  const reframe = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return false;
    const h = heightRef.current;
    controls.target.set(0, h * FRAME.targetY, 0);
    controls.object.position.set(0, h * FRAME.cameraY, h * FRAME.distance);
    controls.update();
    return true;
  }, []);

  const onMeasure = useCallback((height: number) => {
    heightRef.current = height;
    // Recadrage automatique au changement de personnage uniquement : pendant
    // l'édition d'un même personnage, la caméra ne bouge pas sous la main.
    if (framedUid.current === uid) return;
    // `OrbitControls` est monté après le personnage, son ref n'est donc pas
    // encore attaché au moment de la mesure : on attend une frame.
    requestAnimationFrame(() => { if (reframe()) framedUid.current = uid; });
  }, [uid, reframe]);

  const def = entry?.def;
  const full = useMemo(() => (def ? toFullDef(def) : null), [def]);
  const exported = useMemo(() => (def ? minimalDef(def) : null), [def]);

  if (!uid || !entry || !def || !full || !exported) {
    return (
      <section className="editor empty-editor">
        <p className="empty">Aucun personnage ouvert.</p>
      </section>
    );
  }

  const set = <K extends keyof CharacterDef>(key: K, value: CharacterDef[K]) =>
    updateDef(uid, { [key]: value } as Partial<CharacterDef>);

  const copyDef = async () => {
    const ok = await copyToClipboard(defToJson(def));
    setCopied(ok);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const surprise = () => {
    const seed = randomSeed();
    // On garde l'`id` : c'est la clé côté jeu, la surprise porte sur l'apparence.
    replaceDef(uid, surpriseDef({ seed, id: def.id }));
  };

  const fieldCount = Object.keys(exported).length;

  return (
    <section className="editor">
      <div className="viewport">
        <Canvas
          shadows
          camera={{ position: [0, 0.85, 3.6], fov: 32 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={['#2a2d34']} />
          <Preview def={def} moving={moving} speed={speed} onMeasure={onMeasure} />
          <OrbitControls
            ref={controlsRef}
            target={[0, 0.7, 0]}
            enablePan={false}
            minDistance={1.2}
            maxDistance={7}
            maxPolarAngle={Math.PI * 0.52}
          />
        </Canvas>

        <div className="viewport-bar">
          <button type="button" className="btn" onClick={() => openEditor(null)}>
            ← bibliothèque
          </button>
          <span className="spacer" />
          <div className="segmented">
            <button
              type="button"
              className={!moving ? 'active' : ''}
              onClick={() => setMoving(false)}
            >
              repos
            </button>
            <button
              type="button"
              className={moving ? 'active' : ''}
              onClick={() => setMoving(true)}
            >
              marche
            </button>
          </div>
          <label className="speed">
            vitesse
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
            <output>{speed.toFixed(1)}×</output>
          </label>
          <button type="button" className="btn" onClick={reframe}>recadrer</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-scroll">
          <section className="group">
            <h3>Identité</h3>
            <Field label="nom">
              <TextField value={entry.name} onChange={(name) => updateEntry(uid, { name })} />
            </Field>
            <Field label="tags">
              <TagField tags={entry.tags} onChange={(tags) => updateEntry(uid, { tags })} />
            </Field>
            <Field label="id" hint="clé côté jeu">
              <TextField mono value={full.id} onChange={(v) => set('id', v)} />
            </Field>
            <Field label="seed" hint="micro-variations">
              <SeedField
                value={full.seed}
                onChange={(v) => set('seed', v)}
                onReroll={() => set('seed', randomSeed())}
              />
            </Field>
          </section>

          <section className="group">
            <h3>Proportions</h3>
            <Field label="bodyType">
              <Select value={full.bodyType} options={BODY_TYPES} onChange={(v) => set('bodyType', v)} />
            </Field>
            <Field label="headScale">
              <Slider value={full.headScale} {...RANGES.headScale} onChange={(v) => set('headScale', v)} />
            </Field>
            <Field label="limbThickness">
              <Slider value={full.limbThickness} {...RANGES.limbThickness} onChange={(v) => set('limbThickness', v)} />
            </Field>
            <Field label="scale">
              <Slider value={full.scale} {...RANGES.scale} onChange={(v) => set('scale', v)} />
            </Field>
          </section>

          <section className="group">
            <h3>Palette</h3>
            <Field label="primary" hint="corps, membres">
              <ColorField value={full.primary} onChange={(v) => set('primary', v)} />
            </Field>
            <Field label="secondary" hint="vêtements">
              <ColorField value={full.secondary} onChange={(v) => set('secondary', v)} />
            </Field>
            <Field label="accent" hint="accessoires">
              <ColorField value={full.accent} onChange={(v) => set('accent', v)} />
            </Field>
            <Field label="skin" hint="tête">
              <ColorField value={full.skin} onChange={(v) => set('skin', v)} />
            </Field>
            <Field label="glow" hint="parties émissives">
              <ColorField value={full.glow} onChange={(v) => set('glow', v)} />
            </Field>
          </section>

          <section className="group">
            <h3>Silhouette</h3>
            <Field label="headwear">
              <NullableSelect value={full.headwear} options={HEADWEAR_KEYS} onChange={(v) => set('headwear', v)} />
            </Field>
            <Field label="back">
              <NullableSelect value={full.back} options={BACK_KEYS} onChange={(v) => set('back', v)} />
            </Field>
            <Field label="neck">
              <NullableSelect value={full.neck} options={NECK_KEYS} onChange={(v) => set('neck', v)} />
            </Field>
            <Field label="faceGear">
              <NullableSelect value={full.faceGear} options={FACE_GEAR_KEYS} onChange={(v) => set('faceGear', v)} />
            </Field>
          </section>

          <section className="group">
            <h3>Visage</h3>
            <Field label="eyeShape">
              <Select value={full.eyeShape} options={EYE_SHAPES} onChange={(v) => set('eyeShape', v)} />
            </Field>
            <Field label="mouth">
              <Select value={full.mouth} options={MOUTH_SHAPES} onChange={(v) => set('mouth', v)} />
            </Field>
            <Field label="brows">
              <Toggle value={full.brows} onChange={(v) => set('brows', v)} />
            </Field>
          </section>

          <section className="group">
            <h3>Animation</h3>
            <Field label="personality" hint="visible en marche">
              <Select value={full.personality} options={PERSONALITY_KEYS} onChange={(v) => set('personality', v)} />
            </Field>
          </section>

          <section className="group">
            <h3>Sortie</h3>
            <p className="note">
              {fieldCount} champ{fieldCount > 1 ? 's' : ''} non-défaut — c'est exactement
              ce qui sera exporté.
            </p>
            <pre className="def-preview">{defToJson(def)}</pre>
          </section>
        </div>

        <footer className="panel-footer">
          <button type="button" className="btn" onClick={surprise} title="Personnage aléatoire mais cohérent">
            surprends-moi
          </button>
          <button type="button" className="btn primary" onClick={copyDef}>
            {copied ? 'copié ✓' : 'copier le JSON'}
          </button>
        </footer>
      </div>
    </section>
  );
}

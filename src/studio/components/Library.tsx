import { useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { View } from '@react-three/drei';
import type { LibraryEntry } from '../types';
import {
  duplicateEntry, openEditor, removeEntry, toggleCompare, updateEntry, useStudio,
} from '../store';
import { CharacterView } from '../three/CharacterView';
import { StudioLights, Turntable } from '../three/Stage';

interface TileProps {
  entry: LibraryEntry;
  moving: boolean;
  spinning: boolean;
  selected: boolean;
}

function Tile({ entry, moving, spinning, selected }: TileProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const character = <CharacterView def={entry.def} moving={moving} />;

  return (
    <article className={`tile ${selected ? 'selected' : ''}`}>
      {/* `View` rend cette div et téléporte son contenu 3D dans le canvas
          unique de la bibliothèque : un seul contexte WebGL pour toute la
          grille, et drei saute le rendu des vignettes hors écran. */}
      <View className="tile-slot">
        <StudioLights />
        {spinning ? <Turntable>{character}</Turntable> : character}
      </View>

      <div className="tile-body">
        <input
          className="tile-name"
          value={entry.name}
          spellCheck={false}
          aria-label="Nom du personnage"
          onChange={(e) => updateEntry(entry.uid, { name: e.target.value })}
        />
        <div className="tile-meta">
          <code className="tile-id">{entry.def.id}</code>
          {entry.tags.map((t) => <span key={t} className="tag">{t}</span>)}
        </div>
        <div className="tile-actions">
          <button type="button" className="btn small primary" onClick={() => openEditor(entry.uid)}>
            ouvrir
          </button>
          <button type="button" className="btn small" onClick={() => duplicateEntry(entry.uid)}>
            dupliquer
          </button>
          <button
            type="button"
            className={`btn small ${selected ? 'active' : ''}`}
            onClick={() => toggleCompare(entry.uid)}
            title="Ajouter à la vue comparative"
          >
            comparer
          </button>
          {confirmingDelete ? (
            <>
              <button type="button" className="btn small danger" onClick={() => removeEntry(entry.uid)}>
                confirmer
              </button>
              <button type="button" className="btn small" onClick={() => setConfirmingDelete(false)}>
                annuler
              </button>
            </>
          ) : (
            <button type="button" className="btn small" onClick={() => setConfirmingDelete(true)}>
              supprimer
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

interface LibraryProps {
  onNew: () => void;
}

export function Library({ onNew }: LibraryProps) {
  const entries = useStudio((s) => s.entries);
  const compareUids = useStudio((s) => s.compareUids);
  const sectionRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const [moving, setMoving] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) for (const t of e.tags) set.add(t);
    return [...set].sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      e.name.toLowerCase().includes(q)
      || e.def.id.toLowerCase().includes(q)
      || e.tags.some((t) => t.toLowerCase().includes(q)));
  }, [entries, query]);

  return (
    <section className="library" ref={sectionRef}>
      <header className="library-bar">
        <input
          className="control search"
          type="search"
          value={query}
          placeholder="filtrer par nom, id ou tag…"
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="tag-filters">
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              className={`tag clickable ${query.trim().toLowerCase() === t ? 'active' : ''}`}
              onClick={() => setQuery((c) => (c.trim().toLowerCase() === t ? '' : t))}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <span className="count">{filtered.length} / {entries.length}</span>
        <button
          type="button"
          className={`btn ${moving ? 'active' : ''}`}
          onClick={() => setMoving((m) => !m)}
        >
          {moving ? 'marche' : 'repos'}
        </button>
        <button
          type="button"
          className={`btn ${spinning ? 'active' : ''}`}
          onClick={() => setSpinning((s) => !s)}
          title="Rotation lente, pour juger la silhouette"
        >
          tourner
        </button>
        <button type="button" className="btn primary" onClick={onNew}>
          nouveau personnage
        </button>
      </header>

      <div className="library-scroll">
        {filtered.length === 0 ? (
          <p className="empty">
            {entries.length === 0
              ? 'Bibliothèque vide. Créez un personnage, ou importez un fichier.'
              : 'Aucun personnage ne correspond à ce filtre.'}
          </p>
        ) : (
          <div className="grid">
            {filtered.map((entry) => (
              <Tile
                key={entry.uid}
                entry={entry}
                moving={moving}
                spinning={spinning}
                selected={compareUids.includes(entry.uid)}
              />
            ))}
          </div>
        )}
      </div>

      {/*
        Un seul canvas pour toute la grille. Il couvre le viewport en position
        fixe : les rectangles de découpe des vignettes sont alors calculés
        correctement par drei, et l'en-tête de l'application, au-dessus dans la
        pile de z-index, masque ce qui déborderait.

        `eventSource` renvoie les événements de pointeur vers la section HTML :
        sans lui, R3F pose `pointer-events: auto` en style inline sur son
        conteneur et le canvas avale les clics sur les boutons des vignettes.
        Le positionnement passe par `style` pour la même raison — l'inline de
        R3F l'emporterait sur la feuille de style.
      */}
      <Canvas
        className="grid-canvas"
        eventSource={sectionRef as React.RefObject<HTMLElement>}
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}
        /* Caméra fixe et commune à toutes les vignettes : c'est ce qui rend les
           tailles relatives honnêtes d'une vignette à l'autre — un personnage à
           `scale` 0.7 doit *paraître* plus petit. Le recul cadre le plus grand
           personnage possible (héros casqué, ~1.5 unité). */
        camera={{ position: [0, 0.62, 3.4], fov: 30 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.62, 0)}
        /* Le coût de la grille est dominé par le remplissage de pixels, pas par
           les appels de dessin. On plafonne donc la densité : une vignette de
           190 px n'a rien à gagner à être rendue en 3× sur un écran retina. */
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
      >
        <View.Port />
      </Canvas>
    </section>
  );
}

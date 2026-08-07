import { useMemo, useState } from 'react';
import { KIT_VERSION } from '../../kit/KIT_VERSION';
import {
  agentNote, buildExportBundle, buildLibraryFile, copyToClipboard, downloadJson, parseImport,
} from '../exchange';
import { mergeEntries, setEntries, useStudio } from '../store';
import type { LibraryEntry } from '../types';

interface DialogProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Dialog({ title, onClose, children }: DialogProps) {
  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <header className="dialog-head">
          <h2>{title}</h2>
          <button type="button" className="btn small" onClick={onClose}>fermer</button>
        </header>
        {children}
      </div>
    </div>
  );
}

function CopyButton({ text, label, className = 'btn' }: { text: string; label: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const ok = await copyToClipboard(text);
        setDone(ok);
        window.setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? 'copié ✓' : label}
    </button>
  );
}

// --------------------------------------------------------------------------

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const entries = useStudio((s) => s.entries);
  const [tagFilter, setTagFilter] = useState<string>('');

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) for (const t of e.tags) set.add(t);
    return [...set].sort();
  }, [entries]);

  const selected = useMemo(
    () => (tagFilter ? entries.filter((e) => e.tags.includes(tagFilter)) : entries),
    [entries, tagFilter],
  );

  const bundle = useMemo(() => buildExportBundle(selected), [selected]);
  const note = agentNote(selected.length);

  return (
    <Dialog title="Exporter vers l'agent" onClose={onClose}>
      <div className="dialog-body">
        <div className="row">
          <span className="badge">kitVersion {KIT_VERSION}</span>
          <span className="muted">lu depuis <code>src/kit/KIT_VERSION.ts</code></span>
        </div>

        <div className="row wrap">
          <button
            type="button"
            className={`tag clickable ${tagFilter === '' ? 'active' : ''}`}
            onClick={() => setTagFilter('')}
          >
            tous ({entries.length})
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              className={`tag clickable ${tagFilter === t ? 'active' : ''}`}
              onClick={() => setTagFilter(t)}
            >
              {t} ({entries.filter((e) => e.tags.includes(t)).length})
            </button>
          ))}
        </div>

        <h3>Note pour l'agent</h3>
        <pre className="scrollbox small">{note}</pre>
        <CopyButton text={note} label="copier la note" className="btn small" />

        <h3>characters-export.json — {selected.length} personnage{selected.length > 1 ? 's' : ''}</h3>
        <pre className="scrollbox">{JSON.stringify(bundle, null, 2)}</pre>
      </div>

      <footer className="dialog-foot">
        <CopyButton text={JSON.stringify(bundle, null, 2)} label="copier le JSON" className="btn" />
        <button
          type="button"
          className="btn primary"
          disabled={selected.length === 0}
          onClick={() => downloadJson('characters-export.json', bundle)}
        >
          télécharger characters-export.json
        </button>
      </footer>
    </Dialog>
  );
}

// --------------------------------------------------------------------------

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const entries = useStudio((s) => s.entries);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const run = (replace: boolean) => {
    setError(null);
    setWarnings([]);
    setResult(null);
    try {
      const parsed = parseImport(text);
      if (parsed.entries.length === 0) {
        setError('Aucun personnage valide trouvé.');
        setWarnings(parsed.warnings);
        return;
      }
      const versionWarning = parsed.kitVersion && parsed.kitVersion !== KIT_VERSION
        ? [`Ce fichier a été produit avec le kit ${parsed.kitVersion}, le studio embarque ${KIT_VERSION}. Vérifiez le rendu.`]
        : [];

      if (replace) {
        const withUids: LibraryEntry[] = parsed.entries.map((e, i) => ({
          ...e,
          uid: `c_import_${Date.now().toString(36)}_${i}`,
        }));
        setEntries(withUids);
        setResult(`Bibliothèque remplacée : ${withUids.length} personnage(s).`);
      } else {
        const added = mergeEntries(parsed.entries);
        setResult(`${added} personnage(s) ajouté(s).`);
      }
      setWarnings([...versionWarning, ...parsed.warnings]);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Dialog title="Importer" onClose={onClose}>
      <div className="dialog-body">
        <p className="muted">
          Accepte un fichier de bibliothèque, un <code>characters-export.json</code>,
          un tableau de <code>def</code>, ou un <code>CharacterDef</code> seul.
        </p>

        <div className="row">
          <label className="btn small file-btn">
            choisir un fichier…
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setText(await file.text());
                e.target.value = '';
              }}
            />
          </label>
          <span className="muted">ou collez le JSON ci-dessous</span>
        </div>

        <textarea
          className="paste-area"
          spellCheck={false}
          value={text}
          placeholder={'{\n  "id": "v9",\n  "seed": 909,\n  "primary": "#57cc99",\n  "headwear": "mushroom"\n}'}
          onChange={(e) => setText(e.target.value)}
        />

        {error && <p className="error">{error}</p>}
        {result && <p className="success">{result}</p>}
        {warnings.length > 0 && (
          <ul className="warnings">
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        )}
      </div>

      <footer className="dialog-foot">
        <button type="button" className="btn" disabled={!text.trim()} onClick={() => run(true)}>
          remplacer la bibliothèque
        </button>
        <button type="button" className="btn primary" disabled={!text.trim()} onClick={() => run(false)}>
          ajouter à la bibliothèque ({entries.length})
        </button>
      </footer>
    </Dialog>
  );
}

// --------------------------------------------------------------------------

/** Sauvegarde manuelle de la bibliothèque complète (PRD §4.3). */
export function saveLibraryFile(entries: LibraryEntry[]) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJson(`character-studio-library-${stamp}.json`, buildLibraryFile(entries));
}

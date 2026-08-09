import { useCallback, useEffect, useState } from 'react';
import { KIT_VERSION } from '@game/characters/KIT_VERSION';
import { Library } from './studio/components/Library';
import { Editor } from './studio/components/Editor';
import { Compare } from './studio/components/Compare';
import { ExportDialog, ImportDialog, saveLibraryFile } from './studio/components/Exchange';
import { blankDef, randomSeed } from './studio/generate';
import { parseImport } from './studio/exchange';
import {
  addEntry, loadFromStorage, mergeEntries, openEditor, uniqueDefId, useStudio,
} from './studio/store';

type Tab = 'library' | 'compare';
type Dialog = 'export' | 'import' | null;

export default function App() {
  const [tab, setTab] = useState<Tab>('library');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dropping, setDropping] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const entries = useStudio((s) => s.entries);
  const editingUid = useStudio((s) => s.editingUid);
  const compareCount = useStudio((s) => s.compareUids.length);

  useEffect(() => { loadFromStorage(); }, []);

  const flash = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const newCharacter = useCallback(() => {
    const id = uniqueDefId('perso');
    const uid = addEntry({
      name: 'Nouveau personnage',
      tags: [],
      def: blankDef(id, randomSeed()),
    });
    openEditor(uid);
  }, []);

  // Chargement d'un fichier de bibliothèque par glisser-déposer (PRD §4.3).
  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDropping(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      const parsed = parseImport(await file.text());
      const added = mergeEntries(parsed.entries);
      const mismatch = parsed.kitVersion && parsed.kitVersion !== KIT_VERSION
        ? ` — attention : fichier produit avec le kit ${parsed.kitVersion}`
        : '';
      flash(`${added} personnage(s) ajouté(s) depuis ${file.name}${mismatch}`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Fichier illisible');
    }
  }, [flash]);

  return (
    <div
      className={`app ${dropping ? 'dropping' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDropping(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDropping(false); }}
      onDrop={onDrop}
    >
      <header className="topbar">
        <h1>Character Studio</h1>
        <span className="badge" title="Version du kit embarqué">kit {KIT_VERSION}</span>

        <nav className="segmented">
          <button
            type="button"
            className={tab === 'library' && !editingUid ? 'active' : ''}
            onClick={() => { setTab('library'); openEditor(null); }}
          >
            bibliothèque
          </button>
          <button
            type="button"
            className={editingUid ? 'active' : ''}
            onClick={() => { if (entries.length) openEditor(editingUid ?? entries[0].uid); }}
            disabled={entries.length === 0}
          >
            éditeur
          </button>
          <button
            type="button"
            className={tab === 'compare' && !editingUid ? 'active' : ''}
            onClick={() => { setTab('compare'); openEditor(null); }}
          >
            comparer{compareCount > 0 ? ` (${compareCount})` : ''}
          </button>
        </nav>

        <span className="spacer" />

        <button type="button" className="btn" onClick={() => setDialog('import')}>importer</button>
        <button type="button" className="btn" onClick={() => saveLibraryFile(entries)} disabled={entries.length === 0}>
          sauvegarder .json
        </button>
        <button type="button" className="btn primary" onClick={() => setDialog('export')} disabled={entries.length === 0}>
          exporter le lot
        </button>
      </header>

      <main className="main">
        {editingUid ? <Editor /> : tab === 'library' ? <Library onNew={newCharacter} /> : <Compare />}
      </main>

      {dialog === 'export' && <ExportDialog onClose={() => setDialog(null)} />}
      {dialog === 'import' && <ImportDialog onClose={() => setDialog(null)} />}

      {dropping && <div className="drop-hint">Déposer un fichier de bibliothèque…</div>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

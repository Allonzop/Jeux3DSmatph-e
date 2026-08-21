import { useSyncExternalStore } from 'react';
import type { CharacterDef } from '@game/characters/types';
import { heroDef, villagerDefs, enemyDefs, hunterDefs } from '@game/characters/defs';
import type { LibraryEntry } from './types';

const STORAGE_KEY = 'character-studio.library.v1';

/**
 * Store minimal (pas de dépendance externe) : un état immuable, des abonnés,
 * et une écriture dans `localStorage` à chaque changement (PRD §4.3).
 */
export interface StudioState {
  entries: LibraryEntry[];
  /** `uid` du personnage ouvert dans l'éditeur, `null` si on est sur la bibliothèque. */
  editingUid: string | null;
  /** `uid` sélectionnés pour la vue comparative (2 à 4). */
  compareUids: string[];
}

let state: StudioState = { entries: [], editingUid: null, compareUids: [] };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setState(next: Partial<StudioState>, persist = true) {
  state = { ...state, ...next };
  if (persist) save();
  emit();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export const getState = () => state;

export function useStudio<T>(selector: (s: StudioState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

// ---------- Persistance ----------

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: state.entries }));
  } catch (err) {
    // Quota dépassé ou stockage indisponible : on ne casse pas la session en
    // cours, mais l'utilisateur doit savoir que la sauvegarde auto ne suit plus.
    console.error('[studio] sauvegarde locale impossible', err);
  }
}

function uid(): string {
  return `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Les personnages déjà en jeu, pour ne pas démarrer sur une page blanche (PRD §4.5). */
export function seedEntriesFromKit(): LibraryEntry[] {
  const fromDef = (def: CharacterDef, name: string, tags: string[]): LibraryEntry => ({
    uid: uid(), name, tags, def,
  });
  return [
    fromDef(heroDef, 'Héros', ['héros']),
    ...villagerDefs.map((d, i) => fromDef(d, `Villageois ${i + 1}`, ['villageois'])),
    // Tout le bestiaire et les Chasseurs spatiaux, pas seulement l'imp
    // d'origine — voir `enemyDefs` / `hunterDefs` dans le jeu.
    ...enemyDefs.map((d) => fromDef(d, `Monstre ${d.id}`, ['ennemi'])),
    ...hunterDefs.map((d, i) => fromDef(d, `Chasseur ${i + 1}`, ['allié'])),
  ];
}

export function loadFromStorage() {
  let entries: LibraryEntry[] | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { entries?: unknown };
      if (Array.isArray(parsed.entries)) entries = parsed.entries as LibraryEntry[];
    }
  } catch (err) {
    console.error('[studio] bibliothèque locale illisible, on repart du kit', err);
  }
  // `entries` peut être un tableau vide volontaire (tout supprimé) : seul
  // l'absence de sauvegarde déclenche le pré-remplissage.
  setState({ entries: entries ?? seedEntriesFromKit() }, entries === null);
}

// ---------- Actions bibliothèque ----------

export function addEntry(entry: Omit<LibraryEntry, 'uid'>): string {
  const id = uid();
  setState({ entries: [...state.entries, { ...entry, uid: id }] });
  return id;
}

export function updateEntry(target: string, patch: Partial<Omit<LibraryEntry, 'uid'>>) {
  setState({
    entries: state.entries.map((e) => (e.uid === target ? { ...e, ...patch } : e)),
  });
}

export function updateDef(target: string, patch: Partial<CharacterDef>) {
  setState({
    entries: state.entries.map((e) => (e.uid === target ? { ...e, def: { ...e.def, ...patch } } : e)),
  });
}

export function replaceDef(target: string, def: CharacterDef) {
  setState({ entries: state.entries.map((e) => (e.uid === target ? { ...e, def } : e)) });
}

export function removeEntry(target: string) {
  setState({
    entries: state.entries.filter((e) => e.uid !== target),
    editingUid: state.editingUid === target ? null : state.editingUid,
    compareUids: state.compareUids.filter((u) => u !== target),
  });
}

/** Duplique une entrée juste après l'originale, avec un `id` de def unique. */
export function duplicateEntry(target: string): string | null {
  const index = state.entries.findIndex((e) => e.uid === target);
  if (index === -1) return null;
  const source = state.entries[index];
  const id = uid();
  const copy: LibraryEntry = {
    uid: id,
    name: `${source.name} (copie)`,
    tags: [...source.tags],
    def: { ...source.def, id: uniqueDefId(`${source.def.id}-copie`) },
  };
  const entries = [...state.entries];
  entries.splice(index + 1, 0, copy);
  setState({ entries });
  return id;
}

/** Garantit l'unicité de `def.id` : c'est la clé côté jeu. */
export function uniqueDefId(base: string): string {
  const taken = new Set(state.entries.map((e) => e.def.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function setEntries(entries: LibraryEntry[]) {
  setState({ entries, editingUid: null, compareUids: [] });
}

/** Fusionne des entrées importées : les `uid` en collision sont ré-attribués. */
export function mergeEntries(incoming: Omit<LibraryEntry, 'uid'>[]): number {
  const added: LibraryEntry[] = [];
  const taken = new Set(state.entries.map((e) => e.def.id));
  for (const entry of incoming) {
    let defId = entry.def.id;
    if (taken.has(defId)) {
      let n = 2;
      while (taken.has(`${defId}-${n}`)) n += 1;
      defId = `${defId}-${n}`;
    }
    taken.add(defId);
    added.push({ ...entry, uid: uid(), def: { ...entry.def, id: defId } });
  }
  setState({ entries: [...state.entries, ...added] });
  return added.length;
}

// ---------- Navigation ----------

export const openEditor = (target: string | null) => setState({ editingUid: target }, false);

export function toggleCompare(target: string) {
  const current = state.compareUids;
  const next = current.includes(target)
    ? current.filter((u) => u !== target)
    : [...current, target].slice(-4); // 4 maximum (PRD §4.2)
  setState({ compareUids: next }, false);
}

export const clearCompare = () => setState({ compareUids: [] }, false);

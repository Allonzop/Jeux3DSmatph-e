import type { CharacterDef } from '../kit/types';

/** Une entrée de la bibliothèque : un `CharacterDef` plus les métadonnées du studio. */
export interface LibraryEntry {
  /** Identifiant interne au studio, stable même si `def.id` est renommé. */
  uid: string;
  name: string;
  tags: string[];
  def: CharacterDef;
}

/** Un personnage tel qu'il apparaît dans `characters-export.json` (PRD §4.4). */
export interface ExportedCharacter {
  name: string;
  tags: string[];
  def: CharacterDef;
}

/** Le lot exporté vers l'agent IA. */
export interface ExportBundle {
  kitVersion: string;
  exportedAt: string;
  characters: ExportedCharacter[];
}

/**
 * Le fichier de sauvegarde manuelle de la bibliothèque (PRD §4.3).
 * Contrairement au lot d'export, il conserve les `def` complets et les `uid`
 * pour pouvoir reprendre le travail à l'identique.
 */
export interface LibraryFile {
  format: 'character-studio-library';
  kitVersion: string;
  savedAt: string;
  entries: LibraryEntry[];
}

export const LIBRARY_FILE_FORMAT = 'character-studio-library';

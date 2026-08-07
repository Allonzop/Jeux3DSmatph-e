import { KIT_VERSION } from '../kit/KIT_VERSION';
import type { CharacterDef } from '../kit/types';
import {
  BACK_KEYS, BODY_TYPES, EYE_SHAPES, FACE_GEAR_KEYS, HEADWEAR_KEYS,
  MOUTH_SHAPES, NECK_KEYS, PERSONALITY_KEYS, minimalDef,
} from './defaults';
import { LIBRARY_FILE_FORMAT } from './types';
import type { ExportBundle, LibraryEntry, LibraryFile } from './types';

// --------------------------------------------------------------------------
// Export
// --------------------------------------------------------------------------

/** Le `CharacterDef` seul, réduit à ses champs non-défaut, prêt à coller dans `defs.ts`. */
export function defToJson(def: CharacterDef): string {
  return JSON.stringify(minimalDef(def), null, 2);
}

/**
 * Le lot complet (PRD §4.4). `kitVersion` est lu depuis `KIT_VERSION.ts`,
 * jamais écrit en dur : c'est ce qui permet à l'agent de détecter un décalage
 * avec la version du kit embarquée dans le jeu.
 */
export function buildExportBundle(entries: LibraryEntry[]): ExportBundle {
  return {
    kitVersion: KIT_VERSION,
    exportedAt: new Date().toISOString(),
    characters: entries.map((e) => ({
      name: e.name,
      tags: e.tags,
      def: minimalDef(e.def),
    })),
  };
}

export function buildLibraryFile(entries: LibraryEntry[]): LibraryFile {
  return {
    format: LIBRARY_FILE_FORMAT,
    kitVersion: KIT_VERSION,
    savedAt: new Date().toISOString(),
    entries,
  };
}

/** Note copiable destinée à l'agent qui intègre le lot (PRD §4.4). */
export function agentNote(count: number): string {
  return [
    `Ce lot contient ${count} personnage${count > 1 ? 's' : ''} produits avec le kit ${KIT_VERSION}.`,
    '',
    `1. Vérifier que \`src/game/characters/KIT_VERSION.ts\` du jeu vaut bien "${KIT_VERSION}".`,
    "   Si les versions diffèrent, ne pas intégrer tel quel : le rig ou les registres ont bougé.",
    '2. Coller chaque `def` dans `src/game/characters/defs.ts`, dans le tableau',
    '   correspondant à son tag (`villagerDefs` pour `villageois`, etc.).',
    '3. Les champs absents sont les valeurs par défaut de `resolveDef` : ne pas les compléter.',
    '4. Les `id` sont uniques dans ce lot ; vérifier qu\'ils ne collisionnent pas avec',
    '   ceux déjà présents dans `defs.ts`.',
  ].join('\n');
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // `navigator.clipboard` exige un contexte sécurisé ; en HTTP sur le réseau
    // local il est absent. On retombe sur la vieille méthode.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

// --------------------------------------------------------------------------
// Import
// --------------------------------------------------------------------------

export interface ParseResult {
  entries: Omit<LibraryEntry, 'uid'>[];
  /** Version du kit annoncée par le fichier, si présente. */
  kitVersion?: string;
  /** Anomalies non bloquantes : champs inconnus ignorés, valeurs corrigées. */
  warnings: string[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Valide et nettoie un `CharacterDef` venu de l'extérieur. Les clés de registre
 * inconnues sont ramenées à `null` plutôt que transmises au rig : elles
 * disparaîtraient silencieusement du rendu, ce qui est plus déroutant qu'un
 * avertissement.
 */
function sanitizeDef(raw: unknown, warnings: string[], where: string): CharacterDef | null {
  if (!isRecord(raw)) {
    warnings.push(`${where} : ce n'est pas un objet, ignoré.`);
    return null;
  }

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  const seed = typeof raw.seed === 'number' && Number.isFinite(raw.seed) ? raw.seed : null;
  const primary = typeof raw.primary === 'string' && HEX.test(raw.primary) ? raw.primary.toLowerCase() : null;

  if (!id || seed === null || !primary) {
    warnings.push(`${where} : \`id\`, \`seed\` et \`primary\` sont requis (primary au format #rrggbb), ignoré.`);
    return null;
  }

  const def: CharacterDef = { id, seed, primary };

  const color = (key: 'secondary' | 'accent' | 'skin' | 'glow') => {
    const v = raw[key];
    if (v === undefined || v === null) return;
    if (typeof v === 'string' && HEX.test(v)) def[key] = v.toLowerCase();
    else warnings.push(`${where} : \`${key}\` n'est pas un hex #rrggbb, valeur par défaut utilisée.`);
  };
  (['secondary', 'accent', 'skin', 'glow'] as const).forEach(color);

  const num = (key: 'headScale' | 'limbThickness' | 'scale') => {
    const v = raw[key];
    if (v === undefined || v === null) return;
    if (typeof v === 'number' && Number.isFinite(v)) def[key] = v;
    else warnings.push(`${where} : \`${key}\` n'est pas un nombre, valeur par défaut utilisée.`);
  };
  (['headScale', 'limbThickness', 'scale'] as const).forEach(num);

  const oneOf = <T extends string>(key: string, allowed: readonly T[]): T | undefined => {
    const v = raw[key];
    if (v === undefined || v === null) return undefined;
    if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return v as T;
    warnings.push(`${where} : \`${key}\` = ${JSON.stringify(v)} inconnu du kit ${KIT_VERSION}, ignoré.`);
    return undefined;
  };

  const bodyType = oneOf('bodyType', BODY_TYPES);
  if (bodyType) def.bodyType = bodyType;
  const headwear = oneOf('headwear', HEADWEAR_KEYS);
  if (headwear) def.headwear = headwear;
  const back = oneOf('back', BACK_KEYS);
  if (back) def.back = back;
  const neck = oneOf('neck', NECK_KEYS);
  if (neck) def.neck = neck;
  const faceGear = oneOf('faceGear', FACE_GEAR_KEYS);
  if (faceGear) def.faceGear = faceGear;
  const eyeShape = oneOf('eyeShape', EYE_SHAPES);
  if (eyeShape) def.eyeShape = eyeShape;
  const mouth = oneOf('mouth', MOUTH_SHAPES);
  if (mouth) def.mouth = mouth;
  const personality = oneOf('personality', PERSONALITY_KEYS);
  if (personality) def.personality = personality;

  if (typeof raw.brows === 'boolean') def.brows = raw.brows;

  return def;
}

function entryFrom(raw: unknown, fallbackName: string, warnings: string[], where: string) {
  const record = isRecord(raw) ? raw : {};
  // Une entrée peut être `{ name, tags, def }` ou directement un `CharacterDef`.
  const defSource = isRecord(record.def) ? record.def : record;
  const def = sanitizeDef(defSource, warnings, where);
  if (!def) return null;
  const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : fallbackName;
  const tags = Array.isArray(record.tags)
    ? record.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).map((t) => t.trim())
    : [];
  return { name, tags, def };
}

/**
 * Accepte tout ce qu'on peut raisonnablement coller ou déposer :
 * un fichier de bibliothèque, un `characters-export.json`, un tableau de `def`,
 * ou un `CharacterDef` seul (PRD §4.5).
 */
export function parseImport(text: string): ParseResult {
  const warnings: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON invalide — vérifier les virgules et les guillemets.');
  }

  const collect = (list: unknown[], label: string) => {
    const entries: Omit<LibraryEntry, 'uid'>[] = [];
    list.forEach((item, i) => {
      const entry = entryFrom(item, `${label} ${i + 1}`, warnings, `${label} ${i + 1}`);
      if (entry) entries.push(entry);
    });
    return entries;
  };

  // Fichier de bibliothèque du studio
  if (isRecord(parsed) && parsed.format === LIBRARY_FILE_FORMAT && Array.isArray(parsed.entries)) {
    return {
      entries: collect(parsed.entries, 'Personnage'),
      kitVersion: typeof parsed.kitVersion === 'string' ? parsed.kitVersion : undefined,
      warnings,
    };
  }

  // Lot d'export
  if (isRecord(parsed) && Array.isArray(parsed.characters)) {
    return {
      entries: collect(parsed.characters, 'Personnage'),
      kitVersion: typeof parsed.kitVersion === 'string' ? parsed.kitVersion : undefined,
      warnings,
    };
  }

  // Tableau brut de defs
  if (Array.isArray(parsed)) {
    return { entries: collect(parsed, 'Personnage'), warnings };
  }

  // Un seul CharacterDef collé. S'il est mal formé on renvoie quand même les
  // avertissements collectés : dire « format non reconnu » serait faux et
  // n'aiderait pas à trouver le champ fautif.
  if (isRecord(parsed)) {
    const entry = entryFrom(parsed, typeof parsed.id === 'string' ? parsed.id : 'Sans nom', warnings, 'Le personnage collé');
    return { entries: entry ? [entry] : [], warnings };
  }

  throw new Error("Format non reconnu : attendu un fichier de bibliothèque, un characters-export.json, un tableau de defs, ou un CharacterDef seul.");
}

export { KIT_VERSION };

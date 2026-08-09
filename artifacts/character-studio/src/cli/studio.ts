/**
 * Surface sans interface du studio, pour un agent de code.
 *
 * L'interface web et cette CLI partagent exactement le même cœur — mêmes
 * défauts lus dans le kit, même réduction des `def`, même générateur, même
 * validation. Ce qui passe ici passe là-bas, et réciproquement.
 *
 * Le studio n'écrit jamais dans le dépôt du jeu (PRD §2) : `emit` produit du
 * texte à coller, il ne touche pas à `defs.ts`. C'est délibéré — l'intégration
 * reste une décision humaine ou une étape explicite de l'agent.
 *
 * Contrat détaillé dans AGENTS.md.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { KIT_VERSION } from '../kit/KIT_VERSION';
import type { CharacterDef } from '../kit/types';
import { heroDef, villagerDefs, enemyDef } from '../kit/defs';
import {
  BACK_KEYS, BODY_TYPES, DEFAULTS, EYE_SHAPES, FACE_GEAR_KEYS, FIELD_ORDER,
  HEADWEAR_KEYS, MOUTH_SHAPES, NECK_KEYS, PERSONALITY_KEYS, RANGES, minimalDef,
} from '../studio/defaults';
import { ARCHETYPE_NAMES, surpriseDef } from '../studio/generate';
import { auditDefs, defDistance, paletteIssues } from '../studio/analysis';
import { buildExportBundle, parseImport } from '../studio/exchange';
import { LIGHTING, POST } from '../studio/three/constants';
import type { LibraryEntry } from '../studio/types';

// --------------------------------------------------------------------------
// Utilitaires
// --------------------------------------------------------------------------

interface Args {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): Args {
  const [command = 'help', ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i += 1) {
    const a = rest[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else if (rest[i + 1] && !rest[i + 1].startsWith('--')) { flags[a.slice(2)] = rest[i + 1]; i += 1; }
      else flags[a.slice(2)] = true;
    } else positional.push(a);
  }
  return { command, positional, flags };
}

const out = (data: unknown) => process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);

function fail(message: string): never {
  process.stderr.write(`erreur : ${message}\n`);
  process.exit(1);
}

const num = (v: string | boolean | undefined, fallback: number) => {
  if (v === undefined || typeof v === 'boolean') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const str = (v: string | boolean | undefined) => (typeof v === 'string' ? v : undefined);

/** Lit un fichier et en extrait les entrées, quel qu'en soit le format accepté. */
function readEntries(path: string | undefined): Omit<LibraryEntry, 'uid'>[] {
  if (!path) fail('chemin de fichier manquant. Utiliser `--` pour lire l\'entrée standard.');
  const text = path === '-' ? readFileSync(0, 'utf8') : readFileSync(path, 'utf8');
  const parsed = parseImport(text);
  for (const w of parsed.warnings) process.stderr.write(`avertissement : ${w}\n`);
  if (parsed.kitVersion && parsed.kitVersion !== KIT_VERSION) {
    process.stderr.write(
      `avertissement : fichier produit avec le kit ${parsed.kitVersion}, `
      + `le studio embarque ${KIT_VERSION}.\n`,
    );
  }
  return parsed.entries;
}

// --------------------------------------------------------------------------
// schema — ce que le kit sait faire, en lisible par machine
// --------------------------------------------------------------------------

/**
 * Tout est dérivé du kit à l'exécution. Un agent n'a donc jamais à lire du TSX
 * pour deviner une clé d'accessoire : il lit cette sortie et ne peut pas
 * inventer un `headwear` qui n'existe pas.
 */
function cmdSchema() {
  out({
    kitVersion: KIT_VERSION,
    required: ['id', 'seed', 'primary'],
    fieldOrder: FIELD_ORDER,
    defaults: DEFAULTS,
    enums: {
      bodyType: BODY_TYPES,
      eyeShape: EYE_SHAPES,
      mouth: MOUTH_SHAPES,
      personality: PERSONALITY_KEYS,
    },
    registries: {
      headwear: HEADWEAR_KEYS,
      back: BACK_KEYS,
      neck: NECK_KEYS,
      faceGear: FACE_GEAR_KEYS,
    },
    ranges: RANGES,
    colorFormat: '#rrggbb',
    nullableFields: ['headwear', 'back', 'neck', 'faceGear'],
    archetypes: ARCHETYPE_NAMES,
    rendering: {
      note: 'Recopié de GameCanvas.tsx du jeu. Sert aux contrôles de palette.',
      background: LIGHTING.background,
      bloomLuminanceThreshold: POST.bloom.luminanceThreshold,
      emissiveIntensity: 2,
    },
  });
}

// --------------------------------------------------------------------------
// gen — produire des personnages cohérents
// --------------------------------------------------------------------------

function cmdGen(args: Args) {
  const count = Math.max(1, Math.min(200, num(args.flags.count, 6)));
  const baseSeed = num(args.flags.seed, Math.floor(Math.random() * 100000));
  const prefix = str(args.flags.prefix) ?? 'gen';
  const archetype = str(args.flags.archetype);
  const tags = (str(args.flags.tags) ?? '').split(',').map((t) => t.trim()).filter(Boolean);

  if (archetype && !ARCHETYPE_NAMES.includes(archetype)) {
    fail(`archétype « ${archetype} » inconnu. Disponibles : ${ARCHETYPE_NAMES.join(', ')}.`);
  }

  const entries: LibraryEntry[] = [];
  // Les seeds sont espacés pour que deux appels voisins ne produisent pas des
  // personnages presque identiques.
  for (let i = 0; i < count; i += 1) {
    const seed = baseSeed + i * 7919;
    const def = surpriseDef({ seed, id: `${prefix}${i + 1}`, archetype });
    entries.push({ uid: `cli_${seed}`, name: `${prefix} ${i + 1}`, tags, def });
  }

  const bundle = buildExportBundle(entries);
  const target = str(args.flags.out);
  if (target) {
    writeFileSync(target, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
    process.stderr.write(`${count} personnage(s) écrits dans ${target}\n`);
  } else {
    out(bundle);
  }
}

// --------------------------------------------------------------------------
// validate — refuser ce que le jeu ne saurait pas rendre
// --------------------------------------------------------------------------

function cmdValidate(args: Args) {
  const entries = readEntries(args.positional[0]);
  const defs = entries.map((e) => e.def);
  const issues = defs.flatMap(paletteIssues);
  const ids = defs.map((d) => d.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);

  const report = {
    kitVersion: KIT_VERSION,
    count: defs.length,
    duplicateIds: [...new Set(duplicates)],
    issues,
    ok: duplicates.length === 0 && !issues.some((i) => i.severity === 'erreur'),
  };
  out(report);
  // Les avertissements n'échouent pas : ce sont des jugements esthétiques, pas
  // des erreurs de format. Seuls les doublons d'`id` cassent vraiment le jeu.
  if (!report.ok) process.exit(2);
}

// --------------------------------------------------------------------------
// audit — la variété d'ensemble, en nombres
// --------------------------------------------------------------------------

function cmdAudit(args: Args) {
  const entries = readEntries(args.positional[0]);
  const defs = entries.map((e) => e.def);
  const threshold = num(args.flags.threshold, 0.22);
  const report = auditDefs(defs, threshold);

  if (args.flags.json) { out(report); return; }

  const lines: string[] = [];
  lines.push(`Bibliothèque : ${report.count} personnages, kit ${KIT_VERSION}`);
  lines.push(`Distance moyenne entre paires : ${report.averageDistance.toFixed(3)} (0 = clones, 1 = tout oppose)`);
  lines.push('');

  if (report.duplicateIds.length) {
    lines.push(`ERREUR — id en double : ${report.duplicateIds.join(', ')}`);
    lines.push('');
  }

  lines.push(`Quasi-doublons (seuil ${threshold}) : ${report.nearDuplicates.length}`);
  for (const d of report.nearDuplicates.slice(0, 15)) {
    const b = d.breakdown;
    lines.push(
      `  ${d.a} ≈ ${d.b}  distance ${d.distance.toFixed(3)}`
      + `  [silhouette ${b.silhouette.toFixed(2)} palette ${b.palette.toFixed(2)}]`,
    );
  }
  if (report.nearDuplicates.length > 15) lines.push(`  … ${report.nearDuplicates.length - 15} de plus`);
  lines.push('');

  lines.push('Couverture des registres :');
  for (const c of report.coverage) {
    const pct = Math.round(c.ratio * 100);
    lines.push(`  ${c.field.padEnd(12)} ${String(pct).padStart(3)}%  inutilisés : ${c.unused.join(', ') || '—'}`);
  }
  lines.push('');

  const bySeverity = (s: string) => report.issues.filter((i) => i.severity === s);
  lines.push(`Palette : ${bySeverity('avertissement').length} avertissement(s), ${bySeverity('note').length} note(s)`);
  for (const i of report.issues.slice(0, 20)) {
    lines.push(`  [${i.severity}] ${i.id} — ${i.message}`);
  }
  if (report.issues.length > 20) lines.push(`  … ${report.issues.length - 20} de plus`);

  process.stdout.write(`${lines.join('\n')}\n`);
}

// --------------------------------------------------------------------------
// emit — le texte à coller dans defs.ts
// --------------------------------------------------------------------------

/** Sérialise un `def` dans le style de `defs.ts` : littéral TS, pas du JSON. */
function defToTs(def: CharacterDef, indent = '  '): string {
  const min = minimalDef(def);
  const parts = Object.entries(min).map(([k, v]) => {
    if (typeof v === 'string') return `${k}: '${v}'`;
    return `${k}: ${v}`;
  });
  return `${indent}{ ${parts.join(', ')} },`;
}

function cmdEmit(args: Args) {
  const entries = readEntries(args.positional[0]);
  const arrayName = str(args.flags.array);
  const lines: string[] = [];

  lines.push(`// Produit par Character Studio — kit ${KIT_VERSION}`);
  lines.push('// Vérifier que KIT_VERSION.ts du jeu vaut la même valeur avant de coller.');
  if (arrayName) lines.push(`export const ${arrayName}: CharacterDef[] = [`);
  for (const e of entries) {
    if (e.name) lines.push(`  // ${e.name}${e.tags.length ? ` — ${e.tags.join(', ')}` : ''}`);
    lines.push(defToTs(e.def));
  }
  if (arrayName) lines.push('];');

  const text = `${lines.join('\n')}\n`;
  const target = str(args.flags.out);
  if (target) {
    writeFileSync(target, text, 'utf8');
    process.stderr.write(`${entries.length} définition(s) écrites dans ${target}\n`);
  } else {
    process.stdout.write(text);
  }
}

// --------------------------------------------------------------------------
// diff — en quoi deux personnages diffèrent
// --------------------------------------------------------------------------

function cmdDiff(args: Args) {
  const entries = readEntries(args.positional[0]);
  const [idA, idB] = [args.positional[1], args.positional[2]];
  if (!idA || !idB) fail('usage : diff <fichier> <idA> <idB>');
  const find = (id: string) => {
    const e = entries.find((x) => x.def.id === id);
    if (!e) fail(`id « ${id} » introuvable dans le fichier.`);
    return e.def;
  };
  out({ a: idA, b: idB, ...defDistance(find(idA), find(idB)) });
}

// --------------------------------------------------------------------------
// kit — les personnages actuellement en jeu, en lot exportable
// --------------------------------------------------------------------------

function cmdKit() {
  const entries: LibraryEntry[] = [
    { uid: 'kit_hero', name: 'Héros', tags: ['héros'], def: heroDef },
    ...villagerDefs.map((def, i) => ({
      uid: `kit_v${i}`, name: `Villageois ${i + 1}`, tags: ['villageois'], def,
    })),
    { uid: 'kit_imp', name: 'Imp', tags: ['ennemi'], def: enemyDef },
  ];
  out(buildExportBundle(entries));
}

// --------------------------------------------------------------------------

const USAGE = `Character Studio — surface sans interface (kit ${KIT_VERSION})

  schema                       Capacités du kit en JSON : registres, enums,
                               défauts, bornes. À lire avant de composer un def.
  kit                          Les personnages actuellement en jeu, en lot.
  gen [options]                Génère des personnages cohérents.
      --count N                combien (défaut 6)
      --seed S                 seed de base — même seed, même résultat
      --archetype A            ${ARCHETYPE_NAMES.join(' | ')}
      --prefix P               préfixe des id (défaut « gen »)
      --tags a,b               tags appliqués à tous
      --out FICHIER            écrire au lieu de sortir sur stdout
  validate <fichier>           Contrôle format et palette. Sort en 2 si problème.
  audit <fichier> [--json]     Variété, quasi-doublons, couverture des registres.
      --threshold T            seuil de quasi-doublon (défaut 0.22)
  diff <fichier> <idA> <idB>   Distance détaillée entre deux personnages.
  emit <fichier> [--array N]   Littéraux TypeScript prêts à coller dans defs.ts.
      --out FICHIER            écrire au lieu de sortir sur stdout

Le fichier d'entrée peut être un characters-export.json, une bibliothèque
sauvegardée, un tableau de defs, ou un CharacterDef seul. « - » lit stdin.

Le studio n'écrit jamais dans le dépôt du jeu : « emit » produit du texte,
l'intégration reste une étape explicite.
`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case 'schema': return cmdSchema();
    case 'kit': return cmdKit();
    case 'gen': return cmdGen(args);
    case 'validate': return cmdValidate(args);
    case 'audit': return cmdAudit(args);
    case 'diff': return cmdDiff(args);
    case 'emit': return cmdEmit(args);
    case 'help': case '--help': case '-h': return process.stdout.write(USAGE);
    default:
      process.stderr.write(`commande inconnue : ${args.command}\n\n${USAGE}`);
      return process.exit(1);
  }
}

main();

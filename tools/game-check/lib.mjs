/**
 * Socle commun des vérifications du jeu : servir le build, ouvrir un navigateur
 * capable de WebGL, et injecter une sauvegarde avant que le jeu ne démarre.
 *
 * Aucune dépendance npm ajoutée au dépôt : le serveur statique n'utilise que
 * les modules de Node, et Chromium est cherché là où les environnements
 * Claude Code le placent déjà.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);

/**
 * Chromium logiciel. Le rendu matériel n'existe pas dans un conteneur ; sans
 * SwiftShader, three.js échoue sur « Error creating WebGL context ».
 *
 * `--enable-unsafe-swiftshader` est indispensable sur Chromium récent : sans
 * lui le rastériseur logiciel est refusé et le canvas reste noir.
 */
export const CHROMIUM_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--no-sandbox',
];

/**
 * Playwright n'est pas une dépendance du dépôt : il est déjà installé dans les
 * environnements Claude Code, et l'y ajouter imposerait le téléchargement d'un
 * navigateur à chaque installation.
 */
export async function getChromium() {
  const candidates = [
    'playwright',
    '/opt/node22/lib/node_modules/playwright/index.mjs',
    '/usr/lib/node_modules/playwright/index.mjs',
  ];
  for (const spec of candidates) {
    try {
      const mod = await import(spec);
      if (mod.chromium) return mod.chromium;
    } catch {
      // candidat suivant
    }
  }
  throw new Error(
    'Playwright introuvable. Environnements Claude Code : il est déjà là.\n'
    + 'Sinon : npm install -g playwright (le navigateur est dans /opt/pw-browsers).',
  );
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Sert `dir` sous `basePath`. Le jeu est construit avec `BASE_PATH=/dépôt/`
 * pour GitHub Pages ; le servir à la racine casserait tous ses chemins.
 */
export function serveStatic(dir, basePath = '/') {
  const root = resolve(dir);
  const prefix = basePath.endsWith('/') ? basePath : `${basePath}/`;

  const server = createServer(async (req, res) => {
    let path = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!path.startsWith(prefix)) {
      res.writeHead(404).end('hors base');
      return;
    }
    path = path.slice(prefix.length - 1);
    if (path.endsWith('/')) path += 'index.html';

    const file = join(root, path);
    if (!file.startsWith(root) || !existsSync(file)) {
      res.writeHead(404).end('introuvable');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  });

  return new Promise((ok) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      ok({ url: `http://127.0.0.1:${port}${prefix}`, close: () => server.close() });
    });
  });
}

/** Clé de persistance du jeu — voir `store.ts`. */
export const SAVE_KEY = 'village-spatial-storage';

/**
 * Construit une sauvegarde. Seuls ces quatre champs sont persistés (`partialize`
 * dans `store.ts`) ; en écrire d'autres n'a aucun effet.
 */
export function makeSave({
  resources = { boulons: 500, matiere_floue: 100, energie_rire: 50 },
  buildingLevels = { hutte: 0, ferme: 0, bar: 0, antenne: 0, marche: 0, tourelle: 0 },
  buildingPositions = {},
  tutorialStep = 5,
} = {}) {
  return { state: { resources, buildingLevels, buildingPositions, tutorialStep }, version: 2 };
}

/**
 * Ouvre le jeu avec une sauvegarde donnée.
 *
 * La sauvegarde passe par `addInitScript`, qui s'exécute avant tout script de
 * la page. L'écrire après `goto` ne marche pas : le magasin a déjà lu le
 * localStorage et écrasé la valeur.
 */
export async function openGame(url, { save = makeSave(), viewport = { width: 430, height: 900 } } = {}) {
  const chromium = await getChromium();
  const browser = await chromium.launch({ args: CHROMIUM_ARGS });
  const page = await browser.newPage({ viewport });

  // Le jeu demande une police à Google Fonts. On coupe tout ce qui n'est pas
  // servi localement : le test devient hermétique, et surtout l'échec réseau
  // ne pollue plus la console — son message ne contient pas l'URL, donc il
  // était indistinguable d'une vraie erreur du jeu.
  await page.route('**', (route) => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1') || url.startsWith('data:') || url.startsWith('blob:')) {
      return route.continue();
    }
    // Réponse vide plutôt qu'abandon : un `abort()` produit lui-même une
    // erreur console, qu'on ne saurait pas distinguer d'une vraie.
    return route.fulfill({ status: 200, body: '' });
  });

  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });

  await page.addInitScript(([key, value]) => {
    localStorage.setItem(key, value);
  }, [SAVE_KEY, JSON.stringify(save)]);

  await page.goto(url, { waitUntil: 'networkidle' });
  return { browser, page, errors };
}

/**
 * Le rendu logiciel tourne à quelques images par seconde. Les animations du
 * jeu utilisent `delta`, donc elles suivent le temps réel — mais l'apparition
 * des bâtiments borne son pas à 1/30 s, ce qui l'allonge d'autant que la
 * machine rame. D'où une attente généreuse par défaut.
 */
export const SETTLE_MS = 30_000;

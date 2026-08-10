/**
 * Rend le jeu en PNG, dans l'état qu'on veut. C'est l'outil qui permet de
 * *regarder* le jeu — la seule façon de juger ce qu'aucun test ne mesure.
 *
 *   node tools/game-check/shot.mjs --out /tmp/jeu.png
 *   node tools/game-check/shot.mjs --village --out /tmp/village.png
 *   node tools/game-check/shot.mjs --village --wide --wait 45000
 *
 * Options
 *   --village        les six bâtiments construits et placés autour du cristal
 *   --empty          partie neuve, tutoriel actif
 *   --wide           cadre bureau (1280×900) au lieu du cadre téléphone
 *   --wait <ms>      attente avant la capture (défaut 30000)
 *   --out <fichier>  destination (défaut game-shot.png)
 */
import { openGame, makeSave, serveStatic, SETTLE_MS } from './lib.mjs';
import { buildIfNeeded, DIST_DIR, BASE_PATH } from './build.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const VILLAGE = {
  resources: { boulons: 9999, matiere_floue: 9999, energie_rire: 9999 },
  buildingLevels: { hutte: 2, ferme: 2, bar: 2, antenne: 2, marche: 2, tourelle: 2 },
  buildingPositions: {
    hutte: [-4, 0, -3], ferme: [0, 0, -4.4], bar: [4, 0, -3],
    antenne: [-4, 0, 2], marche: [0, 0, 3.4], tourelle: [4, 0, 2],
  },
  tutorialStep: 5,
};

await buildIfNeeded();
const server = await serveStatic(DIST_DIR, BASE_PATH);

const save = flag('village') ? makeSave(VILLAGE)
  : flag('empty') ? makeSave({ tutorialStep: 0, resources: { boulons: 50, matiere_floue: 0, energie_rire: 0 } })
    : makeSave();

const viewport = flag('wide') ? { width: 1280, height: 900 } : { width: 430, height: 900 };
const out = opt('out', 'game-shot.png');

const { browser, page, errors } = await openGame(server.url, { save, viewport });
await page.waitForTimeout(Number(opt('wait', SETTLE_MS)));
await page.screenshot({ path: out });

console.log(`capture : ${out}`);
console.log(`erreurs : ${errors.length ? errors.slice(0, 5).join(' | ') : 'aucune'}`);

await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);

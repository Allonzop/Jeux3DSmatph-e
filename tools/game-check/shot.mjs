/**
 * Rend le jeu en PNG, dans l'état qu'on veut. C'est l'outil qui permet de
 * *regarder* le jeu — la seule façon de juger ce qu'aucun test ne mesure.
 *
 *   node tools/game-check/shot.mjs --out /tmp/jeu.png
 *   node tools/game-check/shot.mjs --village --out /tmp/village.png
 *   node tools/game-check/shot.mjs --village --wide --wait 45000
 *
 * Options
 *   --village        les six bâtiments d'origine, construits autour du cristal
 *   --arsenal        le village complet : deux huttes, les quatre tours, tout au max
 *   --empty          partie neuve, tutoriel actif
 *   --wave <n>       lance la vague n et capture en plein combat
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

/**
 * Le village d'une partie avancée : les quatre types de tour, un deuxième
 * exemplaire de hutte et de tourelle, et tout le monde à haut niveau.
 *
 * C'est le seul moyen de *regarder* ce qui n'existe pas dans une partie neuve :
 * les tours ajoutées après la tourelle laser, les exemplaires multiples
 * (`tourelle#2`, voir `baseId` dans gamedata.ts), et l'évolution visuelle des
 * bâtiments par niveau. `--village` reste inchangé : c'est la référence
 * historique des captures, et les comparer n'a de sens que si elle ne bouge pas.
 */
const ARSENAL = {
  resources: { boulons: 99999, matiere_floue: 9999, energie_rire: 999 },
  buildingLevels: {
    hutte: 5, 'hutte#2': 3, ferme: 4, bar: 3, antenne: 3, marche: 3,
    tourelle: 5, 'tourelle#2': 3, mortier: 4, cryo: 3, tesla: 4,
  },
  // Deux couronnes autour du cristal, décalées vers le fond pour tenir dans le
  // cadre téléphone : la caméra regarde le héros posé à l'origine, et tout ce
  // qui dépasse z = +6 passe sous le HUD.
  buildingPositions: {
    cryo: [5.26, 0, -0.08], marche: [0.97, 0, 3.51], antenne: [-4.29, 0, 1.6],
    hutte: [-5.26, 0, -3.92], ferme: [-0.97, 0, -7.51], tourelle: [4.29, 0, -5.6],
    bar: [5.91, 0, 5.05], 'tourelle#2': [-4.88, 0, 5.8], 'hutte#2': [-8.93, 0, -4.22],
    mortier: [-0.64, 0, -11.18], tesla: [8.53, 0, -5.45],
  },
  tutorialStep: 5,
};

await buildIfNeeded();
const server = await serveStatic(DIST_DIR, BASE_PATH);

const save = flag('village') ? makeSave(VILLAGE)
  : flag('arsenal') ? makeSave(ARSENAL)
    : flag('empty') ? makeSave({ tutorialStep: 0, resources: { boulons: 50, matiere_floue: 0, energie_rire: 0 } })
      : makeSave();

const viewport = flag('wide') ? { width: 1280, height: 900 } : { width: 430, height: 900 };
const out = opt('out', 'game-shot.png');

const { browser, page, errors } = await openGame(server.url, { save, viewport });
await page.waitForTimeout(Number(opt('wait', SETTLE_MS)));

/**
 * `--wave <n>` : voir une vague tardive.
 *
 * Les profils de monstres entrent en scène au fil des vagues (voir
 * `WAVE_ROSTER` dans `src/game/enemies.ts`) : le Spectre n'apparaît qu'à la
 * huitième. Les atteindre en jouant prendrait un quart d'heure de rendu
 * logiciel, alors on pose directement l'index de vague et on lance.
 *
 * Le magasin est exposé par le jeu sous `window.__villageStore` — c'est la
 * seule voie depuis un navigateur, la sauvegarde ne portant pas le numéro de
 * vague.
 */
const waveArg = opt('wave', null);
if (waveArg) {
  const started = await page.evaluate((n) => {
    const store = window.__villageStore;
    if (!store) return false;
    store.setState({ waveNumber: n - 1, waveFailed: false, waveActive: false });
    store.getState().startWave();
    return true;
  }, Number(waveArg));
  if (!started) {
    console.log('vague : window.__villageStore introuvable — jeu trop ancien ?');
  } else {
    // Le temps que les monstres quittent le bord et entrent dans le cadre.
    await page.waitForTimeout(Number(opt('fight', 6000)));
  }
}

await page.screenshot({ path: out });

console.log(`capture : ${out}`);
console.log(`erreurs : ${errors.length ? errors.slice(0, 5).join(' | ') : 'aucune'}`);

await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);

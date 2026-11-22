/**
 * Capture les feuilles et écrans d'un coup, à la taille d'écran voulue : menu
 * Construire, fiche du commandant, fiche de bâtiment, fiche de zone, fin de
 * vague (victoire, défaite), annonce de vague, boutons de pouvoir.
 *
 *   node tools/game-check/screens.mjs 844 390 /tmp/ecrans            # tout, couché
 *   node tools/game-check/screens.mjs 430 900 /tmp/ecrans build,zone # une partie
 *
 * Arguments : largeur, hauteur, dossier de sortie, liste d'écrans (facultatif,
 * parmi powers, build, hero, bld, zone, win, lose, intro). Le joueur est mis au
 * niveau 12 pour que les deux pouvoirs aient un bouton. Chaque écran repart
 * d'une page rechargée. Sortie : <dossier>/<largeur>-<écran>.png.
 */
import { openGame, makeSave, serveStatic } from './lib.mjs';
import { buildIfNeeded, DIST_DIR, BASE_PATH } from './build.mjs';
const W = Number(process.argv[2]||844), H = Number(process.argv[3]||390), OUT = process.argv[4]||'.';
const only = process.argv[5];
await buildIfNeeded();
const server = await serveStatic(DIST_DIR, BASE_PATH);
const save = makeSave({
  resources: { boulons: 9999, matiere_floue: 9999, energie_rire: 9999 },
  buildingLevels: { hutte: 2, ferme: 2, bar: 2, antenne: 2, marche: 2, tourelle: 2 },
  buildingPositions: { hutte: [-4,0,-3], ferme: [0,0,-4.4], bar: [4,0,-3], antenne: [-4,0,2], marche: [0,0,3.4], tourelle: [4,0,2] },
  tutorialStep: 5 });
const { browser, page, errors } = await openGame(server.url, { save, viewport: { width: W, height: H } });
await page.waitForTimeout(15000);
await page.evaluate(() => window.__villageStore.setState({ playerLevel: 12 }));
await page.waitForTimeout(1500);
const st = (f, a) => page.evaluate(f, a);
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${W}-${n}.png` }); console.log('shot', n); };
const steps = {
  powers: async () => { await shot('powers'); },
  build: async () => { await page.getByRole('button', { name: /^Construire$/ }).first().click(); await page.waitForTimeout(1500); await shot('build');
    await page.keyboard.press('Escape'); },
  hero: async () => { await page.locator('[title="Fiche du commandant"]').click(); await page.waitForTimeout(2500); await shot('hero'); },
  bld: async () => { await st(() => window.__villageStore.getState().selectBuilding('tourelle')); await page.waitForTimeout(2500); await shot('bld'); },
  zone: async () => { await st(() => window.__villageStore.getState().selectZone('cendres')); await page.waitForTimeout(2500); await shot('zone'); },
  win: async () => { await st(() => window.__villageStore.setState({ lastWaveOutcome: { type: 'victory', wave: 3, gains: { boulons: 120, matiere_floue: 40, energie_rire: 15 } } })); await page.waitForTimeout(1500); await shot('win'); },
  lose: async () => { await st(() => window.__villageStore.setState({ lastWaveOutcome: { type: 'defeat', wave: 3, losses: { boulons: 120, matiere_floue: 40 } } })); await page.waitForTimeout(1500); await shot('lose'); },
  intro: async () => { await st(() => window.__villageStore.getState().startWave()); await page.waitForTimeout(700); await shot('intro'); },
};
for (const [k, f] of Object.entries(steps)) {
  if (only && !only.split(',').includes(k)) continue;
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(8000);
  await page.evaluate(() => window.__villageStore.setState({ playerLevel: 12 })); await page.waitForTimeout(800);
  try { await f(); } catch (e) { console.log('ERR', k, e.message.split('\n')[0]); }
}
console.log('erreurs', errors.slice(0,5));
await browser.close(); server.close(); process.exit(0);

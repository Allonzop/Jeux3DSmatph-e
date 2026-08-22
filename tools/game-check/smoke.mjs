/**
 * Promène le jeu dans ses états et signale tout ce qui casse.
 *
 *   node tools/game-check/smoke.mjs
 *
 * `wave.mjs --check` protège le cœur du jeu — perdre sans défense, gagner avec
 * une tourelle — et `shot.mjs` montre une image. Ni l'un ni l'autre n'ouvre les
 * panneaux, ne tourne la caméra, ne pose un bâtiment ni ne déclenche un
 * pouvoir. La moitié du jeu n'était donc jamais exécutée entre deux séances :
 * une fiche qui plante à l'ouverture, un panneau qui boucle, un bouton dont le
 * libellé a changé — tout ça passait inaperçu jusqu'au playtest suivant.
 *
 * Ce script joue quatre parcours dans un vrai navigateur et **sort en 1 dès
 * qu'une erreur console apparaît**, quelle qu'elle soit. Il ne juge rien : il
 * constate qu'on peut traverser le jeu sans rien casser.
 *
 * Ajouter un parcours = ajouter un appel à `scenario()`. Un parcours qui lève
 * une exception — élément introuvable, état inattendu — compte comme un échec,
 * et c'est voulu : un bouton qui disparaît est un bug, pas un détail de test.
 *
 * Les parcours désignent les boutons par leur libellé ou leur `title`. C'est
 * fragile par construction, et c'est l'intérêt : renommer « Poser ici » sans
 * s'en rendre compte fait échouer le test au lieu de casser le jeu en silence.
 */
import { openGame, makeSave, serveStatic } from './lib.mjs';
import { buildIfNeeded, DIST_DIR, BASE_PATH } from './build.mjs';

await buildIfNeeded();
const server = await serveStatic(DIST_DIR, BASE_PATH);
const results = [];

async function scenario(name, save, steps) {
  const { browser, page, errors } = await openGame(server.url, { save });
  await page.waitForTimeout(17000);
  try {
    await steps(page);
  } catch (e) {
    errors.push(`étape: ${e.message.split('\n')[0]}`);
  }
  await page.waitForTimeout(1500);
  results.push({ name, errors: [...new Set(errors)] });
  await browser.close();
}

// 1. Partie neuve, tutoriel actif.
await scenario('partie neuve + tutoriel', makeSave({ tutorialStep: 0, resources: { boulons: 50, matiere_floue: 0, energie_rire: 0 } }), async (page) => {
  await page.locator('button:has-text("Suivant")').first().click();
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Suivant")').first().click();
  await page.waitForTimeout(600);
});

// 2. Tous les panneaux ouverts l'un après l'autre.
await scenario('tous les panneaux', makeSave({
  resources: { boulons: 60000, matiere_floue: 900, energie_rire: 300 },
  buildingLevels: { hutte: 3, bar: 2, tourelle: 3 },
  buildingPositions: { hutte: [-5, 0, -4], bar: [5, 0, 4], tourelle: [4.5, 0, -5] },
}), async (page) => {
  await page.evaluate(() => window.__villageStore.setState({ playerLevel: 12 }));
  await page.locator('button[title="Fiche du commandant"]').click();
  await page.waitForTimeout(1500);
  await page.mouse.click(215, 100);
  await page.waitForTimeout(700);
  await page.locator('button:has-text("Construire")').first().click();
  await page.waitForTimeout(1200);
  for (const t of ['Production', 'Soutien', 'Empire', 'Défense']) {
    await page.locator(`button:has-text("${t}")`).first().click();
    await page.waitForTimeout(500);
  }
  await page.keyboard.press('Escape').catch(() => {});
  await page.mouse.click(215, 60);
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__villageStore.getState().selectBuilding('bar'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__villageStore.getState().selectBuilding(null));
  await page.evaluate(() => window.__villageStore.getState().selectDecor('tree-0'));
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__villageStore.getState().selectDecor(null));
  await page.evaluate(() => window.__villageStore.getState().selectZone('cendres'));
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__villageStore.getState().selectZone(null));
});

// 3. Vague tardive, quatre secteurs annexés, pouvoirs déclenchés.
await scenario('vague 12 + zones + pouvoirs', makeSave({
  resources: { boulons: 90000, matiere_floue: 2000, energie_rire: 600 },
  buildingLevels: { hutte: 4, bar: 4, tourelle: 5, cryo: 3, tesla: 4, mortier: 4 },
  buildingPositions: {
    hutte: [-5, 0, -4], bar: [5, 0, 4], tourelle: [4.5, 0, -5],
    cryo: [5.5, 0, 0], tesla: [-8, 0, 0], mortier: [0, 0, -11],
  },
}), async (page) => {
  await page.evaluate(() => {
    const s = window.__villageStore;
    s.setState({ playerLevel: 15 });
    for (const id of ['cendres', 'givre', 'spores', 'dunes']) s.getState().unlockZone(id);
  });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const s = window.__villageStore;
    s.setState({ waveNumber: 11, waveFailed: false, waveActive: false });
    s.getState().startWave();
  });
  await page.waitForTimeout(6000);
  await page.locator('button[title="Onde de choc"]').click();
  await page.waitForTimeout(1200);
  await page.locator('button[title="Surcharge"]').click();
  await page.waitForTimeout(4000);
});

// 4. Rotation caméra + déblayage + pose pendant que la caméra est tournée.
await scenario('caméra tournée + pose', makeSave({ resources: { boulons: 9999, matiere_floue: 200, energie_rire: 20 } }), async (page) => {
  const btn = page.getByLabel('Tourner la vue à droite');
  await btn.hover(); await page.mouse.down(); await page.waitForTimeout(1800); await page.mouse.up();
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.__villageStore.getState().startPlacing('tourelle'));
  await page.waitForTimeout(800);
  await page.mouse.move(215, 560); await page.mouse.down();
  await page.mouse.move(160, 600, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(900);
  await page.locator('button:has-text("Poser ici")').click().catch(() => {});
  await page.waitForTimeout(1200);
  const n = await page.evaluate(() => Object.keys(window.__villageStore.getState().buildingPositions).length);
  if (n === 0) throw new Error('rien posé alors que la caméra est tournée');
});

server.close();
let bad = 0;
for (const r of results) {
  const ok = r.errors.length === 0;
  if (!ok) bad++;
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${r.name}`);
  for (const e of r.errors.slice(0, 4)) console.log(`        ${e.slice(0, 150)}`);
}
process.exit(bad ? 1 : 0);

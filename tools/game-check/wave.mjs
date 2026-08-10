/**
 * Joue une vague et rapporte l'issue. C'est le test de non-régression du
 * cœur du jeu : il a servi à prouver qu'on pouvait enfin perdre.
 *
 *   node tools/game-check/wave.mjs             # sans tourelle → défaite attendue
 *   node tools/game-check/wave.mjs --tourelle  # avec tourelle → victoire attendue
 *   node tools/game-check/wave.mjs --check     # joue les deux et sort en 1 si l'une ment
 *
 * Ne toucher à rien pendant la vague est délibéré : c'est le scénario du
 * joueur passif. Il donnait une victoire, ce qui vidait le jeu de tout enjeu.
 */
import { openGame, makeSave, serveStatic } from './lib.mjs';
import { buildIfNeeded, DIST_DIR, BASE_PATH } from './build.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);

async function playWave(url, withTurret) {
  const save = makeSave({
    buildingLevels: {
      hutte: 0, ferme: 0, bar: 0, antenne: 0, marche: 0, tourelle: withTurret ? 2 : 0,
    },
    buildingPositions: withTurret ? { tourelle: [2, 0, 2] } : {},
  });

  const { browser, page, errors } = await openGame(url, { save });
  await page.waitForTimeout(5000);
  await page.getByText('Lancer la vague', { exact: false }).click();

  let outcome = null;
  // Les monstres mettent ~9 s à traverser ; on laisse largement de quoi voir
  // l'issue même quand le rendu logiciel rame.
  for (let i = 0; i < 90; i += 1) {
    await page.waitForTimeout(1000);
    const text = await page.locator('body').innerText();
    if (/repouss/i.test(text)) { outcome = 'victoire'; break; }
    if (/défaite/i.test(text)) { outcome = 'défaite'; break; }
  }

  await browser.close();
  return { outcome, errors };
}

await buildIfNeeded();
const server = await serveStatic(DIST_DIR, BASE_PATH);

let failed = false;

if (flag('check')) {
  const cases = [
    { turret: false, expected: 'défaite', why: 'joueur passif sans tourelle' },
    { turret: true, expected: 'victoire', why: 'tourelle construite' },
  ];
  for (const c of cases) {
    const { outcome, errors } = await playWave(server.url, c.turret);
    const ok = outcome === c.expected;
    if (!ok) failed = true;
    console.log(`${ok ? 'OK  ' : 'ÉCHEC'} ${c.why} : attendu ${c.expected}, obtenu ${outcome ?? 'aucune issue'}`);
    if (errors.length) console.log(`      erreurs : ${errors.slice(0, 3).join(' | ')}`);
  }
} else {
  const { outcome, errors } = await playWave(server.url, flag('tourelle'));
  console.log(`issue   : ${outcome ?? 'aucune issue en 90 s'}`);
  console.log(`erreurs : ${errors.length ? errors.slice(0, 5).join(' | ') : 'aucune'}`);
  failed = !outcome;
}

server.close();
process.exit(failed ? 1 : 0);

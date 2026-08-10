/**
 * Construit le jeu si nécessaire, et dit où le trouver.
 *
 * Les vérifications tournent sur le *build*, pas sur le serveur de
 * développement : c'est ce que le joueur reçoit, et c'est le seul moyen de
 * détecter ce que seule la production casse (chemins préfixés, minification).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** Le jeu est servi sous /<dépôt>/ sur GitHub Pages ; on reproduit ce chemin. */
export const BASE_PATH = '/Jeux3DSmatph-e/';
export const DIST_DIR = join(ROOT, 'artifacts/3d-game/dist/public');

const GAME_SRC = join(ROOT, 'artifacts/3d-game/src');

/** Le build est-il plus vieux qu'un fichier source ? */
function isStale() {
  const index = join(DIST_DIR, 'index.html');
  if (!existsSync(index)) return true;
  const built = statSync(index).mtimeMs;

  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (walk(p)) return true;
      } else if (statSync(p).mtimeMs > built) {
        return true;
      }
    }
    return false;
  };
  return walk(GAME_SRC);
}

export async function buildIfNeeded({ force = false } = {}) {
  if (!force && !isStale()) {
    console.log('build à jour');
    return DIST_DIR;
  }
  console.log('construction du jeu…');
  execFileSync('pnpm', ['--filter', '@workspace/3d-game', 'run', 'build'], {
    cwd: ROOT,
    env: { ...process.env, BASE_PATH },
    stdio: 'inherit',
  });
  return DIST_DIR;
}

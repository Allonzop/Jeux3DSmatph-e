import { useGameStore } from './store';
import { enemyPositions, enemyStates } from './scene/utils';
import { POWERS, SHOCK_DAMAGE, SHOCK_RADIUS, SHOCK_PUSH, type PowerId } from './hero';
import { spawnBurst, spawnPopup, addShake } from './effects';
import { surfaceY } from './world';
import { sfx } from './sfx';

/**
 * L'état des pouvoirs du héros.
 *
 * Recharges et durées vivent ici, hors de React et de Zustand : ce sont des
 * dates comparées à chaque image, exactement le genre de donnée que
 * `.agents/memory/r3f-game-perf.md` interdit de faire passer par le magasin.
 * `Hero.tsx` les lit dans sa boucle, `ui/PowerButtons.tsx` les échantillonne
 * dix fois par seconde — assez pour que la jauge paraisse continue, assez peu
 * pour ne pas re-rendre le HUD à chaque image.
 *
 * L'horloge est `performance.now()`, pas celle de three : le HUD n'a pas accès
 * à la seconde, et deux horloges décalées donneraient une jauge qui ment.
 */

export const powers = {
  /** Date (en secondes) à partir de laquelle chaque pouvoir redevient prêt. */
  readyAt: { onde: 0, surcharge: 0 } as Record<PowerId, number>,
  /** Date de fin de la surcharge. */
  surchargeUntil: 0,
};

export function nowSeconds(): number {
  return performance.now() / 1000;
}

/** Remet tout à zéro — au reset de partie. */
export function resetPowers(): void {
  powers.readyAt.onde = 0;
  powers.readyAt.surcharge = 0;
  powers.surchargeUntil = 0;
}

/** Part de recharge écoulée, de 0 (vient d'être lancé) à 1 (prêt). */
export function cooldownRatio(id: PowerId, now: number): number {
  const ready = powers.readyAt[id];
  if (now >= ready) return 1;
  return 1 - (ready - now) / POWERS[id].cooldown;
}

export function isSurcharged(now: number): boolean {
  return now < powers.surchargeUntil;
}

/**
 * Déclenche un pouvoir. Rend `false` s'il n'est pas prêt ou pas encore ouvert
 * — c'est au bouton de le griser, mais on refuse aussi ici : le clavier, un
 * double appui et une reprise de session passent tous par cette porte.
 */
export function triggerPower(id: PowerId): boolean {
  const state = useGameStore.getState();
  if (state.playerLevel < POWERS[id].requiredLevel) return false;
  const now = nowSeconds();
  if (now < powers.readyAt[id]) return false;

  powers.readyAt[id] = now + POWERS[id].cooldown;

  if (id === 'surcharge') {
    powers.surchargeUntil = now + POWERS.surcharge.duration;
    sfx.levelUp();
    const [hx, , hz] = state.heroPos;
    spawnBurst(hx, surfaceY(hx, hz) + 1, hz, POWERS.surcharge.color, 1.4, 0.7);
    spawnPopup(hx, surfaceY(hx, hz) + 2.2, hz, 'SURCHARGE', 'crit', 1.4);
    return true;
  }

  // --- Onde de choc ---
  const [hx, , hz] = state.heroPos;
  const hy = surfaceY(hx, hz);
  const hit: string[] = [];

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const live = enemyPositions.get(enemy.id);
    if (!live) continue;
    if (enemyStates.get(enemy.id)?.intangible) continue;
    const dx = live.x - hx;
    const dz = live.z - hz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > SHOCK_RADIUS) continue;
    hit.push(enemy.id);
    // Repoussée : on écrit directement la position vivante. C'est le registre
    // impératif que `EnemyNode` lit et écrit — le monstre repartira de là.
    const push = dist < 0.001 ? 0 : SHOCK_PUSH / dist;
    live.x += dx * push;
    live.z += dz * push;
  }

  useGameStore.getState().damageEnemies(hit, SHOCK_DAMAGE);
  spawnBurst(hx, hy + 0.8, hz, POWERS.onde.color, 2.6, 0.65);
  addShake(0.7);
  sfx.boom();
  if (hit.length > 0) {
    spawnPopup(hx, hy + 2.2, hz, `${hit.length} touchés`, 'crit', 1.2);
  }
  return true;
}

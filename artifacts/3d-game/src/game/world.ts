// Shared world geometry: island size, deterministic scatter, placement rules.
// Single source of truth so Ground, Hero, Enemies and placement validation agree.

export const WORLD_RADIUS = 14; // playable plateau radius (was 8.5)
export const EDGE_MARGIN = 1; // keep buildings away from the cliff edge
export const CORE_CLEAR_RADIUS = 4; // nothing scattered/built near the crystal core
// Ecart minimal entre deux batiments. Releve avec BUILDING_SCALE (1,35) : a
// 2,6 les batiments agrandis se chevauchaient visuellement, alors que le
// placement les declarait valides.
export const BUILDING_MIN_GAP = 3.4;
export const ENEMY_SPAWN_RADIUS = WORLD_RADIUS + 1;

// Legacy hardcoded building spots (pre free-placement saves migrate to these).
export const LEGACY_BUILDING_POSITIONS: Record<string, [number, number, number]> = {
  hutte: [0, 0, -6],
  ferme: [6, 0, -3],
  bar: [-6, 0, -3],
  antenne: [0, 0, 6],
  marche: [6, 0, 3],
  tourelle: [-6, 0, 3],
};

// Resource node positions — shared with ResourceNodes.tsx and kept clear of
// scatter and building placement.
export const RESOURCE_NODE_POSITIONS: Record<string, [number, number, number]> = {
  boulons: [-4.5, 0.5, -4.5],
  matiere_floue: [5.5, 0.5, 0],
  energie_rire: [0, 0.5, 5.5],
};

// Deterministic RNG (mulberry32) so the scatter layout is identical on every
// load — placement validation can then reliably avoid decorations.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ScatterItem = {
  pos: [number, number, number];
  scale: number;
  rot: number;
  type: number;
  /** blocking radius for building placement (0 = walkable decoration) */
  blockRadius: number;
};

export type Scatter = {
  trees: ScatterItem[];
  bushes: ScatterItem[];
  flowers: ScatterItem[];
  rocks: ScatterItem[];
  pond: ScatterItem;
};

function buildScatter(): Scatter {
  const rand = mulberry32(20260805);
  const placed: { x: number; z: number; r: number }[] = [];

  // Keep legacy spots clear too, so migrated saves never collide with decor.
  for (const p of Object.values(LEGACY_BUILDING_POSITIONS)) {
    placed.push({ x: p[0], z: p[2], r: 2.2 });
  }
  for (const p of Object.values(RESOURCE_NODE_POSITIONS)) {
    placed.push({ x: p[0], z: p[2], r: 1.8 });
  }

  const randomPos = (minR: number, maxR: number, selfR: number): [number, number, number] => {
    for (let attempts = 0; attempts < 60; attempts++) {
      const angle = rand() * Math.PI * 2;
      const radius = minR + rand() * (maxR - minR);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (Math.sqrt(x * x + z * z) < CORE_CLEAR_RADIUS + selfR) continue;
      let overlap = false;
      for (const p of placed) {
        const dx = x - p.x;
        const dz = z - p.z;
        if (Math.sqrt(dx * dx + dz * dz) < p.r + selfR + 0.5) {
          overlap = true;
          break;
        }
      }
      if (!overlap) {
        placed.push({ x, z, r: selfR });
        return [x, 0.5, z];
      }
    }
    // Fallback: far edge
    const a = rand() * Math.PI * 2;
    return [Math.cos(a) * (maxR - 0.5), 0.5, Math.sin(a) * (maxR - 0.5)];
  };

  const item = (minR: number, maxR: number, selfR: number, blockRadius: number, scaleBase: number, scaleVar: number): ScatterItem => ({
    pos: randomPos(minR, maxR, selfR),
    scale: scaleBase + rand() * scaleVar,
    rot: rand() * Math.PI,
    type: rand() > 0.5 ? 0 : 1,
    blockRadius,
  });

  const max = WORLD_RADIUS - 0.5;
  return {
    pond: item(6, max - 2, 2.0, 2.2, 1, 0),
    trees: Array.from({ length: 9 }).map(() => item(5.5, max, 1.0, 1.4, 0.8, 0.4)),
    rocks: Array.from({ length: 7 }).map(() => item(6, max, 0.8, 1.1, 0.5, 0.5)),
    bushes: Array.from({ length: 10 }).map(() => item(4.5, max, 0.6, 0.9, 0.7, 0.6)),
    flowers: Array.from({ length: 14 }).map(() => item(4.5, max, 0.3, 0, 0.8, 0.4)),
  };
}

export const SCATTER: Scatter = buildScatter();

const BLOCKERS: { x: number; z: number; r: number }[] = [
  SCATTER.pond,
  ...SCATTER.trees,
  ...SCATTER.rocks,
  ...SCATTER.bushes,
]
  .filter((s) => s.blockRadius > 0)
  .map((s) => ({ x: s.pos[0], z: s.pos[2], r: s.blockRadius * s.scale }));

export type PlacementCheck = { valid: boolean; reason: 'ok' | 'edge' | 'core' | 'building' | 'decor' };

export function checkPlacement(
  x: number,
  z: number,
  otherBuildings: [number, number, number][],
): PlacementCheck {
  const dist = Math.sqrt(x * x + z * z);
  if (dist > WORLD_RADIUS - EDGE_MARGIN) return { valid: false, reason: 'edge' };
  if (dist < CORE_CLEAR_RADIUS) return { valid: false, reason: 'core' };
  for (const b of otherBuildings) {
    const dx = x - b[0];
    const dz = z - b[2];
    if (Math.sqrt(dx * dx + dz * dz) < BUILDING_MIN_GAP) return { valid: false, reason: 'building' };
  }
  for (const o of BLOCKERS) {
    const dx = x - o.x;
    const dz = z - o.z;
    if (Math.sqrt(dx * dx + dz * dz) < o.r + 1.2) return { valid: false, reason: 'decor' };
  }
  for (const n of Object.values(RESOURCE_NODE_POSITIONS)) {
    const dx = x - n[0];
    const dz = z - n[2];
    if (Math.sqrt(dx * dx + dz * dz) < 2.2) return { valid: false, reason: 'decor' };
  }
  return { valid: true, reason: 'ok' };
}

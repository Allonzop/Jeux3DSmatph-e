---
name: R3F game performance conventions
description: Rules for React Three Fiber work in the 3D game — avoiding per-frame React/Zustand churn and type pitfalls the design subagent keeps reintroducing
---

# R3F performance conventions (3D game)

**Rule:** Fast-changing spatial data (enemy positions, aim targets) must never flow through Zustand or React state. Movement lives in refs/scene graph; cross-component reads go through a module-level registry (`enemyPositions` Map in `scene/utils.ts`). Damage writes are accumulated and flushed ~4x/sec, not per frame.

**Why:** The first implementation wrote enemy positions to the store every frame and kept turret targets in useState — every frame re-rendered the whole enemy tree and a heavy mesh subtree. Code review flagged it as the top mobile-performance killer.

**How to apply:** When adding anything that moves per frame (projectiles, NPCs, pickups), mutate `ref.current` in `useFrame`, publish positions to a registry if others need them, and use module-level scratch `THREE.Vector3`s instead of allocating in the loop. Throttle any unavoidable setState to ≤10Hz.

# Type pitfalls the design subagent reintroduces

- `<EffectComposer disableNormalPass>` — prop no longer exists in @react-three/postprocessing; just omit it. It has been reintroduced twice by subagents; check after every design-subagent pass.
- `flatShading` + `gradientMap` on `meshToonMaterial` — MeshToonMaterial's TS types have no `flatShading`. For faceted low-poly rocks use `meshStandardMaterial flatShading roughness={1}` instead.
- `Math.random()` in JSX render (rotations of scatter props) — must be precomputed in the `useMemo` that generates scatter data, or props jump on re-render.

**Why:** All three passed the subagent's own review but broke `pnpm --filter @workspace/3d-game run typecheck` or caused visual jumping; they cost a fix round each time.

**How to apply:** After any design-subagent pass on the game, run typecheck first and grep for `disableNormalPass`, `flatShading.*ToonMaterial`, and `Math.random` outside useMemo.

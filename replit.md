# Village Spatial 3D

A mobile-first 3D village-builder / auto-clicker game built with React Three Fiber. Players guide a stylized robot hero around a floating space island, collect resources from glowing crystal nodes, and invest them to build and upgrade a sci-fi village. Combat waves of enemies attack the crystal core, defended by laser turrets.

## Run & Operate

- `pnpm --filter @workspace/3d-game run dev` — run the 3D game (port 24982, preview at `/`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Game: React Three Fiber (@react-three/fiber), Three.js, @react-three/drei, @react-three/postprocessing
- State: Zustand (persisted to localStorage)
- UI: Tailwind CSS + shadcn/ui components
- API: Express 5 (shared backend, not used by game)
- DB: PostgreSQL + Drizzle ORM (not used by game — game state in localStorage)

## Where things live

- `artifacts/3d-game/src/game/` — all game logic
  - `store.ts` — Zustand game state (resources, buildings, enemies, hero)
  - `gamedata.ts` — building definitions, resource metadata
  - `GameCanvas.tsx` — root R3F Canvas with all scene components
  - `scene/` — 3D scene components (Ground, Hero, Buildings, ResourceNodes, Enemies, CrystalCore, Stars, Camera)
  - `ui/` — HTML overlay components (HUD, Joystick, BuildingPopup)
- `artifacts/api-server/` — shared Express API (currently unused by game)
- `lib/api-spec/openapi.yaml` — API contract source of truth

## Architecture decisions

- **Frontend-only game**: No backend needed — game state (resources, building levels) persists to localStorage via Zustand persist middleware.
- **Procedural geometry only**: No external texture files. All 3D assets are Three.js primitives (Box, Cylinder, Sphere, Cone, Torus) with MeshToonMaterial.
- **Toon shading**: All materials use a 3-step RGBA DataTexture as gradientMap for the cartoon-3D look.
- **WebGL dependency**: The 3D canvas requires WebGL. A WebGLErrorBoundary shows a friendly message if WebGL is unavailable.
- **HUD as HTML overlay**: Game UI (resource bars, joystick, building panel) is a `position:fixed` HTML div over the canvas — not Three.js Html elements — for best performance.

## Product

- 6 procedural 3D buildings (Hutte, Ferme, Bar, Antenne, Marché, Tourelle)
- 3 resources: Boulons (standard), Matière Floue (rare), Énergie de Rire (premium)
- Virtual joystick for hero movement (touch + mouse)
- Resource collection from glowing crystal nodes
- Building upgrade system with level caps and resource costs
- Passive resource generation from buildings
- Combat wave system with enemy AI and auto-turrets
- Bloom + vignette post-processing

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- THREE.RGBFormat is deprecated in Three.js 0.185 — always use THREE.RGBAFormat with 4-channel Uint8Array data for DataTexture.
- THREE.Clock is deprecated — use THREE.Timer instead (or just use R3F's built-in clock via useFrame delta).
- bufferAttribute in R3F requires the `args` prop pattern: `<bufferAttribute args={[array, itemSize]} attach="..." />`.
- The WebGL error in the Replit preview screenshot tool is expected (headless Chrome, no GPU) — it works fine in real browsers.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `gamestack-js` skill for R3F setup, movement, and physics guidelines

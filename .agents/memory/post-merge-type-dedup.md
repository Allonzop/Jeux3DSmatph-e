---
name: Post-merge @types dedup for R3F
description: Task-agent merges can split @types/react versions and re-key pnpm peer instances, silently breaking React Three Fiber JSX types project-wide
---

# Rule
After any task-agent merge that touches `pnpm-lock.yaml`, run the web game's typecheck. If R3F JSX types explode everywhere (`Property 'mesh'/'group'/'sphereGeometry' does not exist on JSX.IntrinsicElements`), suspect duplicate `@types/react` copies — not the game code.

**Why:** A merged mobile Expo app pinned `@types/react ~19.1.x` while the workspace catalog resolved `^19.2.0`. The reconciliation install created two `@types/react` copies and re-keyed `@react-three/fiber` to an expo-flavored peer instance whose type chain touched the *other* copy, so fiber's `declare module 'react'` JSX augmentation no longer merged with the copy the app compiled against. Hundreds of JSX errors appeared in files nobody had edited.

**How to apply:** Keep every workspace package on `"@types/react": "catalog:"` / `"@types/react-dom": "catalog:"` (task agents tend to hardcode pins — fix their package.json, not the game). Then plain `pnpm install` collapses the copies and typecheck goes green. Diagnose with `ls node_modules/.pnpm | grep "@types+react@"` (expect one linked version) and `readlink <artifact>/node_modules/@react-three/fiber`.

---
name: WebGL screenshot limitation
description: Headless screenshot browser cannot create a WebGL context for the 3d-game artifact
---

The Screenshot tool's headless browser fails with "THREE.WebGLRenderer: Error creating WebGL context" on the 3d-game artifact.

**Why:** the sandboxed browser has no GPU/swiftshader WebGL support, so any R3F canvas shows only the runtime-error overlay.

**How to apply:** don't treat this error as an app bug and don't retry screenshots for 3D scenes. Verify 3D changes via typecheck, browser console logs (non-WebGL errors), and by keeping animation/geometry math provably identical; ask the user to confirm visuals.

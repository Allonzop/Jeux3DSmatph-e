# Memory index

- [R3F game perf conventions](r3f-game-perf.md) — never route per-frame positions through Zustand/useState; registry + scratch vectors; typecheck traps the design subagent reintroduces.
- [Post-merge @types dedup](post-merge-type-dedup.md) — task-agent merges can split @types/react copies and break all R3F JSX types; keep every package on `catalog:` and re-run typecheck after merges.
- [Captures WebGL en headless](webgl-screenshot-limit.md) — **corrigé** : la limitation venait du bac à sable Replit, pas du headless. Chromium + SwiftShader rend les scènes R3F ; recette vérifiée dans la note.
- [Studio de personnages](../../artifacts/character-studio/AGENTS.md) — ne jamais composer un CharacterDef à la main sans lire `studio schema` : une clé d'accessoire inexistante disparaît en silence, sans erreur.

# Memory index

- [R3F game perf conventions](r3f-game-perf.md) — never route per-frame positions through Zustand/useState; registry + scratch vectors; typecheck traps the design subagent reintroduces.
- [Post-merge @types dedup](post-merge-type-dedup.md) — task-agent merges can split @types/react copies and break all R3F JSX types; keep every package on `catalog:` and re-run typecheck after merges.
- [WebGL screenshot limitation](webgl-screenshot-limit.md) — headless screenshots can't create a WebGL context; 3D scenes show an error overlay, verify via typecheck/logs instead.

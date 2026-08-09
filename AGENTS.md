# Dépôt du jeu — carte pour un agent

Espace de travail pnpm. Le développement se fait avec **Claude Code** ; Replit
n'est plus utilisé (voir « Héritage Replit » plus bas).

```bash
pnpm install          # à la racine, jamais npm — le preinstall le refuse
pnpm run typecheck    # les 6 projets d'un coup
```

## Où est quoi

| Chemin | Quoi |
|---|---|
| `artifacts/3d-game/` | **Le jeu.** React Three Fiber. C'est ici que se fait le travail. |
| `artifacts/character-studio/` | **L'outil de création de personnages.** Interface web + ligne de commande. |
| `artifacts/api-server/` | Serveur d'API |
| `artifacts/mockup-sandbox/`, `artifacts/village-mobile/` | Autres projets, hors périmètre du jeu |
| `lib/`, `scripts/` | Paquets partagés de l'espace de travail |
| `.agents/memory/` | **Notes durement acquises. À lire avant de toucher au jeu.** |

## Le jeu

```bash
pnpm --filter @workspace/3d-game run typecheck
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/3d-game run dev
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/3d-game run build
```

**`PORT` et `BASE_PATH` sont obligatoires** — sans eux, `vite.config.ts` lève
`PORT environment variable is required but was not provided.` avant même de
commencer. C'est un reste de Replit ; le typecheck, lui, n'en a pas besoin.
Ces deux variables sont aussi la raison pour laquelle `pnpm run build` à la
racine échoue sur le jeu.

Structure : `src/game/scene/` (monde, héros, villageois, ennemis),
`src/game/characters/` (le système de personnages), `src/game/ui/`,
`src/game/store.ts` (Zustand), `src/game/world.ts` et `gamedata.ts` (données).

Les conventions de performance R3F sont dans `.agents/memory/r3f-game-perf.md`
et ne sont pas négociables : jamais de position par frame dans Zustand ou
`useState`, mutation de `ref.current` dans `useFrame`, pas de `Math.random()`
hors `useMemo`.

## Créer des personnages : passer par le studio

Un personnage du jeu est un objet de données `CharacterDef` dans
`src/game/characters/defs.ts`, rendu par le rig partagé `ToonHumanoid`. Aucun
modèle 3D, aucune texture.

**Ne composez pas un `CharacterDef` à la main sans lire le schéma.** Une clé
d'accessoire inexistante ne provoque aucune erreur : le rig rend `undefined` et
l'accessoire disparaît en silence.

```bash
cd artifacts/character-studio
pnpm --silent run studio schema     # registres, enums, défauts, bornes — dérivés du kit
pnpm --silent run studio kit        # les personnages actuellement en jeu
pnpm --silent run studio gen --count 8 --archetype creature --out /tmp/neufs.json
pnpm --silent run studio audit /tmp/neufs.json      # variété, doublons, palettes
pnpm --silent run studio validate /tmp/neufs.json   # sort en 2 si problème
pnpm --silent run studio emit /tmp/neufs.json --array enemyDefs
pnpm run dev                  # l'interface, pour juger à l'œil
```

Le studio lit `artifacts/3d-game/src/game/characters/` **à la source**, via
l'alias `@game/characters/*`. Il n'en garde aucune copie : ce qu'il affiche est
littéralement le code que le jeu exécute. Modifier le rig ou ajouter un
accessoire au jeu se répercute immédiatement dans le studio, sans rien
synchroniser.

Détail complet dans `artifacts/character-studio/AGENTS.md`.

## Règles qui coûtent cher si on les ignore

- **pnpm, jamais npm.** Le `preinstall` racine échoue volontairement sinon.
- **Toute dépendance partagée sur `catalog:`.** Un paquet qui épingle
  `@types/react` hors catalogue crée une seconde copie et fait exploser les
  types JSX de R3F dans tout le jeu — c'est arrivé, voir
  `.agents/memory/post-merge-type-dedup.md`. Idem pour `three` et
  `@react-three/*` : deux copies cassent le réconciliateur R3F.
- **`pnpm run typecheck` après toute fusion** touchant `pnpm-lock.yaml`.
- Pas de `disableNormalPass` sur `<EffectComposer>` (prop supprimée), pas de
  `flatShading` sur `meshToonMaterial` (types TS incompatibles).

## Rendu : le studio est la référence

L'éclairage et le post-traitement du jeu sont dans
`artifacts/3d-game/src/game/GameCanvas.tsx`. Le studio en tient une copie
commentée dans `artifacts/character-studio/src/studio/three/constants.ts`.

**Si vous changez le rendu du jeu, répercutez-le là.** C'est le seul endroit, et
c'est ce qui garantit que l'aperçu du studio ne ment pas sur les couleurs.

## Héritage Replit

Le projet vient de Replit, qui n'est plus utilisé. Restent en place, sans effet
sur le développement Claude Code : `.replit`, `.replitignore`, `.config/`,
`replit.md`, `artifacts/*/.replit-artifact/`, et les greffons
`@replit/vite-plugin-*` dans les configs Vite. Ils sont conservés plutôt que
supprimés à l'aveugle — retirez-les quand vous serez sûr que rien n'en dépend,
dans un commit dédié.

Les branches `replit-agent`, `subrepl-*` de l'historique viennent aussi de là.
`main` est la branche de référence.

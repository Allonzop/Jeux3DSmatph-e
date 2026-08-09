# Character Studio — mode d'emploi pour un agent

Cet outil a deux surfaces sur le même cœur :

- **l'interface web** (`pnpm run dev`) — pour un humain, qui juge à l'œil ;
- **la ligne de commande** (`pnpm --silent run studio`) — pour un agent, qui n'a pas d'œil.

Les deux lisent les mêmes défauts dans les personnages du jeu, appliquent la même réduction
des `def`, le même générateur et la même validation. Ce qui passe d'un côté
passe de l'autre.

```bash
pnpm install          # à la racine du dépôt, jamais npm
cd artifacts/character-studio
pnpm --silent run studio help
```

`--silent` n'est pas décoratif : sans lui, pnpm écrit sa bannière et la sortie
du build sur *stdout*, et toute redirection en JSON devient inanalysable
(`… schema > fichier.json` produirait un fichier cassé).

---

## Le studio lit le jeu, il ne le possède pas

Les personnages viennent de `artifacts/3d-game/src/game/characters/`, lus **à
la source** via l'alias `@game/characters/*`. Aucune copie, rien à
synchroniser : ce que le studio affiche est littéralement le code que le jeu
exécute.

Conséquence à garder en tête : toucher au rig ou aux registres depuis le studio
revient à **modifier le jeu**. C'est légitime — c'est le même dépôt — mais ça
change le rendu de tous les personnages existants, pas seulement l'aperçu.
Faites-le sciemment, dans un commit qui le dit.

Le studio **n'écrit jamais dans `defs.ts`**. `emit` produit du texte à coller ;
l'intégration reste une étape explicite, décidée en connaissance de cause.

---

## Commencer par `schema`

```bash
pnpm --silent run studio schema
```

Renvoie, dérivé du kit à l'exécution : les champs requis, tous les défauts, les
registres d'accessoires, les énumérations, les bornes des curseurs, et l'ordre
canonique des champs.

**N'inventez jamais une clé d'accessoire.** `headwear: 'sombrero'` ne provoque
aucune erreur — le rig rend `undefined`, l'accessoire disparaît en silence.
Lisez `schema` et n'employez que ce qu'il liste.

`schema.rendering` donne aussi le fond du jeu et le seuil de bloom : ce sont
eux qui décident si un `glow` brillera.

---

## Le cycle de travail

```bash
# 1. Partir de l'existant
pnpm --silent run studio kit > /tmp/actuel.json
pnpm --silent run studio audit /tmp/actuel.json

# 2. Produire, en visant ce qui manque
pnpm --silent run studio gen --count 8 --archetype creature --tags ennemi --out /tmp/neufs.json

# 3. Contrôler
pnpm --silent run studio validate /tmp/neufs.json     # sort en 2 si problème
pnpm --silent run studio audit /tmp/neufs.json

# 4. Sortir le texte à coller
pnpm --silent run studio emit /tmp/neufs.json --array enemyDefs
```

`gen` est **déterministe** : même `--seed`, même résultat. Notez le seed d'une
série réussie, elle est reproductible.

`gen` compare aussi chaque candidat à ceux déjà retenus dans le lot et re-tire
tant qu'il est trop proche. Espacer les seeds ne suffisait pas : deux tirages
indépendants retombent sur le même archétype et les mêmes accessoires, les
pools étant petits. Un lot de 60 contenait 11 quasi-doublons, il n'en contient
plus. Le re-tirage se voit dans le champ `seed`, qui n'est alors plus
`seed + rang × 7919`.

## `selftest` — après toute modification

```bash
pnpm --silent run studio selftest     # sort en 1 au premier écart
```

Rejoue cinq invariants sur les personnages du jeu et sur un lot généré :
aller-retour d'export sans perte, aucun champ par défaut exporté, réimport par
le vrai chemin d'import, déterminisme du générateur, et absence de ce que
l'audit reproche à ses propres sorties.

**Lancez-le après avoir touché au rig, aux registres, aux défauts du jeu, à
`minimalDef`, à `FIELD_ORDER` ou au générateur.** Ces changements peuvent casser
le format d'échange en silence : le JSON reste valide, les personnages changent.

---

## Lire un `audit`

C'est la commande qui remplace le coup d'œil sur la grille.

| Sortie | Ce qu'elle dit |
|---|---|
| `Distance moyenne` | 0 = clones, 1 = tout oppose. En dessous de ~0,35, le casting manque de variété. |
| `Quasi-doublons` | Paires trop proches. La ventilation dit *pourquoi* : `silhouette` faible = même modèle recoloré, le pire cas. |
| `Couverture` | Pièces du kit jamais employées. C'est la piste la plus rentable : du contenu déjà écrit qui ne sert pas. |
| `Palette` | Problèmes qui ne se voient qu'au rendu. |

La distance pondère la **silhouette à 45 %** : deux personnages de même
morphologie et mêmes accessoires restent « le même modèle recoloré » même avec
des couleurs opposées. Pour faire monter la variété, changez `bodyType` et les
accessoires avant les couleurs.

### Les contrôles de palette

- **`glow-terne`** — le `glow` est trop sombre pour déclencher le bloom du jeu.
  La luminance perçue dépend surtout de la teinte : un bleu et un jaune de même
  clarté HSL n'ont pas du tout la même luminance. Un `glow` bleu foncé ne
  brillera jamais, et rien ne le signale à l'écran. *(Ce contrôle a trouvé un
  défaut du générateur lui-même — voir `bloomingGlow` dans `generate.ts`.)*
- **`corps-noyé`** — `primary` trop proche du fond `#0d1117` : la silhouette ne
  se détache pas.
- **`couleurs-proches`** — deux rôles de palette quasi identiques ; l'un des
  deux ne se verra pas. Parfois voulu (l'imp du jeu a `skin` = `primary`), d'où
  la sévérité « note » et non « avertissement ».

`validate` ne sort en erreur que sur ce qui casse vraiment le jeu — un `id` en
double. Le reste est un jugement esthétique, à vous d'arbitrer.

---

## Écrire un `def` à la main

Seuls `id`, `seed` et `primary` sont requis ; `{ id, seed, primary }` rend déjà
un personnage correct. Tout le reste a un défaut, listé par `schema`.

**N'écrivez que ce qui diffère du défaut.** `minimalDef` le fait
automatiquement dans `gen` et `emit` — un champ qui vaut son défaut est retiré
de la sortie. Un `def` exporté puis remis dans `resolveDef` donne exactement le
même personnage : c'est ce que `selftest` vérifie à chaque fois, sur les
70 personnages du jeu et d'un lot généré.

Le `seed` ne change pas les couleurs ni la silhouette : il pilote les
micro-variations déterministes des pièces (taches du champignon, inclinaison du
chapeau, écartement des ailes) et désynchronise les cycles de marche. Changer
le seed est le moyen le moins cher de distinguer deux personnages proches.

---

## Intégrer côté jeu

1. Vérifier que `KIT_VERSION` concorde des deux côtés. `schema` donne celle du
   studio ; le jeu a la sienne dans `src/game/characters/KIT_VERSION.ts`. Si
   elles diffèrent, **ne pas intégrer** : le rig ou les registres ont bougé.
2. Coller la sortie de `emit` dans `src/game/characters/defs.ts`, dans le
   tableau correspondant au tag (`villagerDefs`, `enemyDefs`…).
3. Vérifier qu'aucun `id` ne collisionne avec ceux déjà présents.
4. Ne pas compléter les champs absents : ce sont les défauts de `resolveDef`.

---

## Ce que la CLI ne fait pas

**Elle ne voit pas.** Elle mesure des écarts entre données ; elle ne juge pas si
un personnage est réussi. Pour ça il faut des yeux — les vôtres via
`pnpm run dev`, ou un humain.

Conséquence pratique : `audit` peut donner un excellent score à un casting
laid, et un score médiocre à un casting cohérent qui joue volontairement sur
une famille visuelle. Traitez-le comme un détecteur de problèmes, pas comme une
note.

Un rendu automatisé en images (headless + capture, pour boucler
génération → rendu → observation) serait la suite logique. Il n'existe pas
encore.

---

## Où toucher quoi

| Besoin | Fichier |
|---|---|
| Ajuster le rendu au jeu (lumières, bloom) | `src/studio/three/constants.ts` — **seul endroit** |
| Règles du générateur, archétypes | `src/studio/generate.ts` |
| Métriques d'analyse, contrôles de palette | `src/studio/analysis.ts` |
| Réduction des `def`, listes dérivées du kit | `src/studio/defaults.ts` |
| Commandes de la CLI | `src/cli/studio.ts` |
| Le rig, les registres, les `defs` | `artifacts/3d-game/src/game/characters/` — **c'est le jeu** |

Après toute modification : `pnpm run typecheck`. Les deux projets TypeScript
(kit et studio) sont construits ensemble ; le code du studio est vérifié
strictement, imports et paramètres inutilisés compris.

Les pièges connus du jeu valent ici — voir `.agents/memory/r3f-game-perf.md`
côté jeu : pas de `disableNormalPass` sur `<EffectComposer>`, pas de
`flatShading` sur `meshToonMaterial`, pas de `Math.random()` hors `useMemo`,
pas de `setState` par frame.

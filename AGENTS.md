# Character Studio — mode d'emploi pour un agent

Cet outil a deux surfaces sur le même cœur :

- **l'interface web** (`npm run dev`) — pour un humain, qui juge à l'œil ;
- **la ligne de commande** (`npm run studio`) — pour un agent, qui n'a pas d'œil.

Les deux lisent les mêmes défauts dans `src/kit/`, appliquent la même réduction
des `def`, le même générateur et la même validation. Ce qui passe d'un côté
passe de l'autre.

```bash
npm install
npm run studio -- help
```

---

## Règle absolue

> **Ne jamais modifier `src/kit/`.**

C'est la copie conforme de `src/game/characters/` du jeu ; c'est elle qui
garantit que l'aperçu correspond au rendu réel. Si une limitation du kit gêne,
la contourner côté studio et la consigner dans `RAPPORT.md`.

Le studio **n'écrit jamais dans le dépôt du jeu**. `emit` produit du texte à
coller ; l'intégration reste une étape explicite, décidée en connaissance de
cause.

---

## Commencer par `schema`

```bash
npm run studio -- schema
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
npm run studio -- kit > /tmp/actuel.json
npm run studio -- audit /tmp/actuel.json

# 2. Produire, en visant ce qui manque
npm run studio -- gen --count 8 --archetype creature --tags ennemi --out /tmp/neufs.json

# 3. Contrôler
npm run studio -- validate /tmp/neufs.json     # sort en 2 si problème
npm run studio -- audit /tmp/neufs.json

# 4. Sortir le texte à coller
npm run studio -- emit /tmp/neufs.json --array enemyDefs
```

`gen` est **déterministe** : même `--seed`, même résultat. Notez le seed d'une
série réussie, elle est reproductible.

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
même personnage : vérifié sur 70 cas, l'aller-retour est sans perte.

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
`npm run dev`, ou un humain.

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
| Le kit | **ne pas toucher** |

Après toute modification : `npm run typecheck`. Les deux projets TypeScript
(kit et studio) sont construits ensemble ; le code du studio est vérifié
strictement, imports et paramètres inutilisés compris.

Les pièges connus du jeu valent ici — voir `.agents/memory/r3f-game-perf.md`
côté jeu : pas de `disableNormalPass` sur `<EffectComposer>`, pas de
`flatShading` sur `meshToonMaterial`, pas de `Math.random()` hors `useMemo`,
pas de `setState` par frame.

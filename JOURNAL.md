# Journal des séances

Une entrée par séance, la plus récente en haut. L'agent écrit ici ; Allonzo n'a
rien à y faire.

Le but est qu'un agent qui reprend le projet sache en une lecture ce qui a été
tenté, ce qui a marché, et surtout **ce qui a été essayé sans succès** — pour
ne pas le refaire.

Format : ce qui a été fait, comment ça a été vérifié, ce qui reste ouvert.

---

## 2026-08-29 — Un push oublié récupéré, et le bonus de zone « Chasseurs en plus » qui ne faisait rien au niveau max

**Ce qui a été trouvé en démarrant.** La branche locale portait déjà, non
poussée, les trois commits du 26/08, 27/08 et 28/08 — `BACKLOG.md` et
`JOURNAL.md` les documentaient comme faits et vérifiés, mais
`origin/claude/bold-brown-wefyca` n'existait même pas côté distant : aucune
séance depuis le 26/08 n'était jamais arrivée jusqu'au push (même piège que
le 27/08, en pire — là c'est trois séances d'affilée qui étaient restées
locales). Poussé en tout premier, avant tout autre travail
(`git push -u origin claude/bold-brown-wefyca`) : le workflow `auto-merge.yml`
se déclenche sur le push de la branche, donc ce seul geste suffit à
rattraper les trois séances perdues sans rien recommencer.

**Choix de la tâche.** Toujours les trois mêmes cases non cochées en tête de
`BACKLOG.md` : « équilibrage du combat au ressenti » (vrai appareil requis,
14 séances de suite écartée depuis le 15/08), « faire le tour de la
planète » et « deuxième planète » (chantiers à part entière, notés comme
tels depuis le 22/08). Suivant la consigne pour ce cas (jouer, trouver ce
qui cloche, l'ajouter au backlog, le traiter) : `pnpm install`
(`node_modules` absent), rejeu complet — `smoke.mjs` (5/5), `wave.mjs
--check` (2/2), captures `--village`, `--arsenal`, `--wave 9`, `--wide`,
`--empty` — rien de cassé à l'écran. Faute de piste visuelle, élargi la
recherche à une lecture de code dans une zone récemment ajoutée et peu
revisitée depuis : `scene/Hunters.tsx` (les Chasseurs spatiaux recrutés par
le Bar, restaurés le 21/08) et son lien avec les bonus de zone (`zones.ts`,
ajoutés le même jour).

**Fait**

- Trouvé en lisant `scene/Hunters.tsx` : `count = Math.min(barLevel +
  zoneEffects(unlockedZones).extraHunters, hunterDefs.length)` — le nombre de
  chasseurs affichés est plafonné à `hunterDefs.length`, le nombre de
  personnages *définis* dans `characters/defs.ts` (4 : `h1`..`h4`). Le Bar a
  un niveau max de 4 (`gamedata.ts`), et la Jungle de Spores promet
  explicitement « Deux Chasseurs spatiaux de plus » une fois annexée
  (`zones.ts`, `bonus: { kind: 'hunters', value: 2, ... }`). Avec seulement 4
  personnages disponibles : un Bar seul niveau 4 réclame déjà 4 chasseurs
  (`min(4+0, 4) = 4`), donc le bonus de zone (`min(4+2, 4) = 4`) n'ajoute
  strictement rien — le texte promis par l'annexion de zone est un mensonge
  pur pour quiconque a maximisé le Bar, ce qui est le chemin de progression
  naturel. Au niveau 3, le bonus était déjà tronqué (`min(3+2,4)=4` au lieu
  de 5 attendus) ; seuls les niveaux 1-2 du Bar en profitaient pleinement.
  Un bug purement numérique et vérifiable par lecture de code, dans le même
  esprit que les recalibrages du 24/08 et l'anneau de portée du 25/08 — pas
  un jugement de ressenti.
- `characters/defs.ts` : deux personnages ajoutés à `hunterDefs` (`h5`, `h6`),
  portant le tableau à 6 entrées — exactement `bar.maxLevel (4) +
  extraHunters de la Jungle de Spores (2)`. Générés avec `studio gen
  --archetype technique` puis ajustés à la main (accessoires/couleurs
  choisis dans les registres non encore utilisés par `h1`-`h4`, voir schéma
  `studio schema`) pour rester dans le même registre visuel qu'eux
  (« habitant armé »). `studio audit` a d'abord signalé un quasi-doublon
  (`h6` copiait exactement la silhouette de `v4` — même `bodyType`,
  `headwear`, `back`, `faceGear` — malgré des couleurs différentes) ;
  corrigé en changeant le gabarit et les accessoires de `h6`, ré-audité à
  0 quasi-doublon. Un commentaire posé au-dessus de `hunterDefs` documente
  l'invariant (`hunterDefs.length` doit rester ≥ `bar.maxLevel +
  extraHunters`) pour que la prochaine zone ou le prochain niveau de Bar n'y
  retombe pas en silence.

**Vérifié comment**

- `cd artifacts/character-studio && pnpm --silent run studio validate` puis
  `studio audit` sur le kit complet (`studio kit`) : 0 quasi-doublon, 0
  avertissement de palette (les 6 notes existantes sur d'autres personnages
  sont antérieures, non touchées), couverture des registres 100 %.
  `studio selftest` : 5/5 (22 personnages du jeu + 60 générés).
- `pnpm run typecheck` (les 6 projets) : passe.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé (aucun des deux scénarios ne construit le Bar).
- `node tools/game-check/smoke.mjs` : 5/5 — cette séance ne touche à aucun
  parcours existant.
- Script Playwright ad hoc (sauvegarde avec Bar niveau 4 + `unlockedZones:
  { spores: true }`, capture large autour du Bar) : au moins cinq
  silhouettes de chasseurs distinctes visibles autour du Bar (avant le
  correctif, 4 au maximum quelle que soit la zone annexée) — capture non
  gardée dans le dépôt. Confirmé aussi par lecture : `studio kit` liste
  désormais `h1` à `h6`, six exemplaires.
- `node tools/game-check/shot.mjs --village --out /tmp/apres.png`, ouvert et
  comparé à la capture d'avant séance : identique (le scénario `--village`
  pose le Bar au niveau 2, sous le nouveau plafond de 6, donc jamais affecté
  par le changement).

**Essayé sans succès, à ne pas refaire**

- Rien écarté sur le fond : le bug a été trouvé du premier coup en lisant
  `Hunters.tsx` avec le bonus de zone en tête. Un seul faux départ mineur :
  la première version de `h6` copiait involontairement la silhouette de
  `v4` (même combinaison `bodyType`/`headwear`/`back`/`faceGear`) —
  `studio audit` l'a signalé immédiatement, corrigé en changeant le gabarit
  plutôt que juste les couleurs (les couleurs seules ne suffisent pas à
  distinguer deux silhouettes identiques, voir le score `silhouette 0.00`
  du rapport).

**Reste ouvert**

- Toujours ouvert (voir `BACKLOG.md`) : équilibrage du combat au ressenti
  (vrai appareil requis), faire le tour de la planète (refonte moteur),
  deuxième planète (fonctionnalité neuve).
- Le même genre de plafond silencieux pourrait exister ailleurs si un
  système suppose implicitement qu'un registre de personnages ou de
  définitions est « assez grand » sans jamais le vérifier — pas d'autre cas
  trouvé cette séance, mais `hunterDefs` n'était pas le seul tableau de
  taille fixe croisé avec un niveau de bâtiment potentiellement croissant.

## 2026-08-28 — Le parcours « caméra tournée + pose » de `smoke.mjs` était flaky

**Choix de la tâche.** Toujours les trois mêmes cases bloquées en tête de
`BACKLOG.md` (équilibrage au ressenti — vrai appareil requis, 14 séances de
suite écartée depuis le 15/08 ; faire le tour de la planète et deuxième
planète — chantiers à part entière, notés comme tels depuis le 22/08).
Rebranché sur `origin/main` en début de séance : la branche locale de la
séance était déjà à jour (`git merge-base --is-ancestor HEAD origin/main` a
répondu vrai du premier coup, tout le travail du 26/08 et du 27/08 était bien
fusionné). Rejeu complet ensuite, comme d'habitude : `pnpm install`
(`node_modules` absent), puis `node tools/game-check/smoke.mjs`.

**Ce qui a été trouvé.** Le parcours n°4 (« caméra tournée + pose ») a échoué
dès ce premier rejeu : `aucune cible de pose valide trouvée près du héros`.
`wave.mjs --check` passait toujours (2/2) — rien de cassé dans le jeu lui-même.
Diagnostiqué avec un script Playwright ad hoc, en suivant la règle posée le
23/08 (« toujours interroger la validité exacte plutôt que deviner ») : rejoué
le même parcours isolément avec les cinq points fixes du script, puis un
balayage complet en grille de l'écran. Résultat : un des cinq points fixes
*était* valide en isolation (`[215, 650]`), mais pas dans le run complet de
`smoke.mjs`. Ce n'est donc pas une régression du jeu — c'est le test lui-même
qui est flaky : la rotation de caméra est un `mouse.down()` tenu 1800 ms puis
relâché, et l'angle final exact dépend du temps réel écoulé pendant ce geste,
qui varie d'une exécution à l'autre (charge machine, ordre des scénarios). Un
angle légèrement différent déplace toute la scène à l'écran, et les cinq
points fixes — choisis à l'œil le 23/08, resserrés autour du héros —
retombent ou non sur une cible constructible selon la chance. Le balayage en
grille complet (voir script ad hoc) a confirmé qu'il existe toujours de larges
zones valides à l'écran une fois la caméra tournée : le problème n'est jamais
qu'il n'y a nulle part où poser, seulement que les cinq points devinés
peuvent tous la manquer.

**Fait**

- `tools/game-check/smoke.mjs` : les deux listes de points fixes (parcours 4
  « caméra tournée + pose » et parcours 5 « déplacer la 2e tourelle », qui
  souffre du même risque en théorie même si son run précédent avait réussi)
  remplacées par une fonction commune `findPlacementTarget(page)` : elle
  balaie l'écran en grille (pas de 50 px, 60 à 370 en x, 400 à 750 en y) et
  s'arrête dès qu'un point retombe sur une cible valide (`pendingPlacement.valid`).
  Coût : jusqu'à 400 ms par point testé au lieu de 700 ms — le geste de pose
  est plus rapide que le geste de rotation de caméra, pas besoin de la même
  marge — et le balayage s'arrête tôt dans la quasi-totalité des cas (la
  grille couvre une zone où l'échantillonnage du 28/08 a montré que 30 à 40 %
  des points sont valides).

**Vérifié comment**

- `node tools/game-check/smoke.mjs` : relancé deux fois de suite après le
  correctif, 5/5 les deux fois (le point qui comptait : le parcours 4 ne
  dépend plus d'un point precis).
- `pnpm run typecheck` (les 6 projets) : passe.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé, cette séance ne touche à aucune mécanique de jeu, seulement
  à l'outillage de test.
- `node tools/game-check/shot.mjs --village --out /tmp/apres.png`, ouvert :
  rien de changé à l'écran — seul `smoke.mjs` a été modifié, aucun fichier du
  jeu.
- `cd artifacts/character-studio && pnpm --silent run studio selftest` :
  5/5 — cette séance n'a pas touché `src/game/characters/`.

**Essayé sans succès, à ne pas refaire**

- Rien écarté : la cause a été confirmée du premier coup en isolant le
  parcours et en comparant point fixe vs balayage en grille, pas de fausse
  piste sur le code du jeu (le bug était dans le test, pas dans
  `PlacementController`).

**Reste ouvert**

- Toujours ouvert (voir `BACKLOG.md`) : équilibrage du combat au ressenti
  (vrai appareil requis), faire le tour de la planète (refonte moteur),
  deuxième planète (fonctionnalité neuve).
- Le balayage en grille a un coût pire cas plus élevé qu'une liste de cinq
  points (jusqu'à 84 points × 400 ms ≈ 34 s au lieu de 5 × 700 ms = 3,5 s) —
  invisible dans les deux runs de vérification (la cible valide est trouvée
  bien avant la fin de la grille), mais si `smoke.mjs` devient sensiblement
  plus lent à l'usage, resserrer la grille autour d'une zone plus proche du
  héros serait la première piste.


## 2026-08-27 — Un commit du 26/08 était resté impoussé, et un cinquième parcours pour `smoke.mjs`

**Ce qui a été trouvé en démarrant.** La branche locale portait déjà, non
poussé, le commit du 26/08 (« Le panneau Construire ne peut plus atteindre
que la première tour posée ») — `BACKLOG.md` et `JOURNAL.md` le documentaient
comme fait et vérifié, mais `origin/claude/bold-brown-q2g6c4` n'existait même
pas encore côté distant : la séance précédente s'est arrêtée avant le push,
ou pendant. Pas le piège du 22/08 (poussé sur la mauvaise branche) — ici rien
n'avait été poussé du tout. Poussé en premier (`git push -u origin
claude/bold-brown-q2g6c4`), puis vérifié avec le contrôle qui ne ment pas
(`git merge-base --is-ancestor <sha> origin/main`) : passé après quelques
dizaines de secondes, le commit du 26/08 est bien dans `main`. Rebranché
ensuite sur `origin/main` avant de commencer le travail du jour, comme prévu
par la consigne pour une branche déjà fusionnée.

**Choix de la tâche.** Toujours les trois mêmes cases bloquées en tête de
`BACKLOG.md` (équilibrage au ressenti, tour de la planète, deuxième
planète). Rejeu complet d'abord : `pnpm install` (`node_modules` absent),
`smoke.mjs` (4/4), `wave.mjs --check` (2/2), captures `--village`,
`--arsenal`, `--wave 9`, `--wide` — rien de cassé à l'écran. Repris ensuite le
point noté trois séances de suite (23/08, 25/08, 26/08) comme « prochaine
amélioration d'outillage possible » : `smoke.mjs` ne construit jamais un
second exemplaire d'un même bâtiment, donc ni la sélection par puce (fixée le
26/08) ni le bouton « déplacer » appliqué à une instance précise n'étaient
rejoués automatiquement — seule une vérification manuelle ad hoc, à refaire à
la main à chaque changement dans cette zone.

**Fait**

- `tools/game-check/smoke.mjs` : cinquième parcours, « deux tourelles +
  déplacer la seconde ». Sauvegarde avec `tourelle` (niveau 2) et
  `tourelle#2` (niveau 1) déjà posées à des positions bien séparées ;
  ouverture du panneau Construire, clic sur la puce n°2, vérification que
  `selectedBuilding` vaut bien `tourelle#2` (pas `tourelle`) ; clic sur
  « Déplacer ce bâtiment », vérification que `placingBuilding` vaut
  `tourelle#2` ; glissé-déposé sur un point valide, « Poser ici » ; puis
  vérification que la position de `tourelle#2` a changé, que celle de
  `tourelle` n'a pas bougé, et qu'aucun des deux niveaux n'a été altéré par le
  déplacement.
- Écarté un premier jeu de cibles de dépose copié tel quel du parcours n°4
  (`caméra tournée + pose`) : ce parcours pose un bâtiment neuf sur un village
  vide, le mien en a déjà deux — les mêmes coordonnées d'écran ne tombent pas
  forcément sur un point constructible. Voir « essayé sans succès ».

**Vérifié comment**

- `pnpm install` puis `pnpm run typecheck` (les 6 projets) : passe.
- `node tools/game-check/smoke.mjs` : 5/5, le nouveau parcours inclus.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé, cette séance ne touche à aucune mécanique de jeu.
- `node tools/game-check/shot.mjs --village --out /tmp/apres.png`, ouvert et
  comparé à la capture d'avant séance : identique — seul l'outil de test a
  changé, aucun fichier du jeu.
- `cd artifacts/character-studio && pnpm --silent run studio selftest` :
  5/5 — cette séance n'a pas touché `src/game/characters/`.

**Essayé sans succès, à ne pas refaire**

- *Réutiliser telles quelles les cibles de dépose du parcours n°4*
  (`[160,600], [270,600], [215,650], [130,550], [300,550]`) pour déplacer une
  tourelle dans un village qui en a déjà deux. Échec systématique — aucune
  cible valide trouvée. Diagnostiqué avec un script ad hoc qui balaie une
  grille de points d'écran (pas de 40 px, 60 à 370 en x, 400 à 750 en y) et
  logue lesquels donnent `pendingPlacement.valid === true` : la sélection de
  la puce et le passage en mode « déplacer » fonctionnaient très bien dès le
  premier essai (`selectedBuilding`/`placingBuilding` corrects) — c'est
  uniquement la zone de dépose qui différait, le village n'étant pas vide
  comme dans le parcours n°4. Retenir : **les cibles de dépose d'un parcours
  ne se copient pas d'un parcours à l'autre dès que la scène de départ
  change** (bâtiments déjà posés, décor différent) — rebalayer une grille avec
  un script jetable plutôt que deviner à l'œil.

**Reste ouvert**

- Toujours ouvert (voir `BACKLOG.md`) : équilibrage du combat au ressenti
  (vrai appareil requis), faire le tour de la planète (refonte moteur),
  deuxième planète (fonctionnalité neuve).
- Le parcours ajouté ne construit que deux exemplaires d'un seul bâtiment
  (tourelle). Les autres bâtiments à plusieurs exemplaires (mortier, cryo,
  tesla, hutte) partagent le même code de sélection dans `BuildSheet.tsx` et
  n'ont pas de raison de se comporter différemment, mais ce n'est pas prouvé
  par un test.

## 2026-08-26 — La 2e et la 3e tour d'un même type étaient injoignables depuis le panneau

**Choix de la tâche.** Toujours les trois mêmes cases non cochées en tête de
`BACKLOG.md` : « équilibrage du combat au ressenti » (vrai appareil requis,
12 séances de suite écartée depuis le 15/08), « faire le tour de la
planète » et « deuxième planète » (chantiers à part entière, notés comme
tels à chaque séance depuis le 22/08). Suivant la même consigne que le
25/08 : `pnpm install` (`node_modules` absent), rejeu — `smoke.mjs` (4/4),
`wave.mjs --check` (2/2), captures `--village`, `--arsenal`, `--wide`,
`--wave 9`, `--empty` — rien de visiblement cassé à l'écran. La branche
`claude/bold-brown-96vdd2` avait déjà été fusionnée dans `main` (la séance
du 25/08) ; redémarrée depuis `origin/main` avant de commencer, comme prévu
par la consigne pour ce cas.

**Fait**

- Trouvé en lisant `ui/BuildSheet.tsx`, à la suite de la même piste que le
  25/08 (les bâtiments à plusieurs exemplaires, ajoutés le 21/08 pour lever
  le cap d'une tourelle/hutte unique) : chaque ligne du panneau Construire
  calculait `firstPlacedId`, le **premier** exemplaire posé du type, et le
  bouton « Améliorer »/« Construire » de la ligne appelait toujours
  `selectBuilding(firstPlacedId)`. Avec deux ou trois tourelles construites,
  ce bouton ramenait systématiquement à la première : impossible d'ouvrir la
  fiche de la deuxième ou de la troisième depuis le panneau. Le seul chemin
  qui marchait était de taper directement le bâtiment dans la scène 3D
  (`scene/Buildings.tsx` sélectionne bien l'id exact de l'exemplaire tapé) —
  rien dans le panneau ne le suggérait.
- Confirmé avant de corriger avec un script Playwright ad hoc : sauvegarde à
  deux tourelles (`tourelle` niveau 2, `tourelle#2` niveau 1), ouverture du
  panneau, onglet Défense, clic sur « Améliorer » → `selectedBuilding` valait
  `tourelle`, jamais `tourelle#2`.
- `ui/BuildSheet.tsx` : remplacé `firstPlacedId` (un seul id) par `placedIds`
  (tous les exemplaires posés). Un seul exemplaire posé → bouton inchangé
  (« Améliorer »/« Construire », même libellé, même position). Plusieurs
  exemplaires posés → une puce numérotée par exemplaire (`①②③`, via
  `instanceNumber` déjà exporté par `gamedata.ts`), chacune sélectionnant son
  propre id et fermant le panneau ; le `title` de chaque puce précise le nom
  du bâtiment, son numéro et « améliorer » ou « construire » selon son
  niveau. La branche `!free && placedIds.length === 0` (le texte « Complet »)
  était déjà du code mort avant ce changement — impossible d'avoir zéro
  exemplaire posé et plus aucun de disponible en même temps — laissée telle
  quelle, migrée sans changer son comportement.

**Vérifié comment**

- `pnpm install` (nécessaire, `node_modules` absent) puis
  `pnpm run typecheck` (les 6 projets) : passe.
- Script Playwright ad hoc, après correctif, sauvegarde à **trois**
  tourelles (niveaux 2, 1, 0 — la troisième posée mais pas construite) :
  panneau ouvert, trois puces `1`/`2`/`3` sur la ligne Tourelle laser,
  `title` de la puce 3 confirmé (« Tourelle laser n°3 — construire »), clic
  sur la puce 2 → `selectedBuilding = 'tourelle#2'`, clic sur la puce 3 →
  `selectedBuilding = 'tourelle#3'`. Capture d'écran du panneau ouvert :
  trois puces lisibles sur la ligne Tourelle (3/3), les autres lignes à un
  seul exemplaire inchangées. Script jetable, non ajouté au dépôt.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé (aucun des deux scénarios ne pose de second exemplaire).
- `node tools/game-check/smoke.mjs` : 4/4 — le scénario « tous les panneaux »
  ouvre déjà ce panneau (avec un seul exemplaire par type), rien de cassé
  sur le chemin à un seul bouton.
- `node tools/game-check/shot.mjs --village --out /tmp/apres.png`, ouvert et
  comparé à la capture d'avant séance : identique — le scénario `--village`
  ne pose que des exemplaires uniques, donc jamais les nouvelles puces.
- `cd artifacts/character-studio && pnpm --silent run studio selftest` :
  5/5 — cette séance n'a pas touché `src/game/characters/`.

**Essayé sans succès, à ne pas refaire**

- Rien écarté : la piste (bâtiments à plusieurs exemplaires, zone encore peu
  couverte par l'outillage) venait directement du « reste ouvert » du 25/08
  et du 23/08, pas de fausse piste explorée sur le code lui-même.

**Reste ouvert**

- Le scénario « tous les panneaux » de `smoke.mjs` ne construit qu'un seul
  exemplaire par type de bâtiment (`tourelle: 3`, jamais `tourelle#2`) : il
  n'aurait pas attrapé ce bug. Comme le parcours « déplacer un bâtiment »
  déjà signalé le 25/08, ajouter un second exemplaire construit dans ce
  scénario (ou un cinquième parcours dédié) attraperait ce genre de
  régression automatiquement — prochaine amélioration d'outillage possible.
- Toujours ouvert (voir `BACKLOG.md`) : équilibrage du combat au ressenti
  (vrai appareil requis), faire le tour de la planète (refonte moteur),
  deuxième planète (fonctionnalité neuve).

## 2026-08-25 — L'anneau de portée pendant un déplacement mentait sur les tours améliorées

**Choix de la tâche.** Les trois cases non cochées de `BACKLOG.md` sont
toutes bloquées pour une séance normale : « équilibrage du combat au
ressenti » exige un vrai appareil (11 séances de suite écartée pour cette
raison depuis le 15/08), « faire le tour de la planète » et « deuxième
planète » sont explicitement notées comme des chantiers à part entière, pas
des tâches de séance. Suivant la consigne pour ce cas (jouer, trouver ce qui
cloche, l'ajouter au backlog, le traiter) : `pnpm install` (nécessaire,
`node_modules` absent), puis rejeu complet — `smoke.mjs` (4/4), `wave.mjs
--check` (2/2), captures `--village`, `--arsenal`, `--wave 9`, `--wide` —
rien de cassé à l'écran. Élargi la recherche à une lecture du code des zones
récemment stables (placement, déplacement de bâtiment) plutôt que de relire
une nouvelle fois le rendu, faute de piste visuelle.

**Fait**

- Trouvé en lisant `scene/Buildings.tsx` (`PlacementController`) : l'anneau
  vert/rouge qui prévisualise la portée d'une tour pendant sa pose lisait
  toujours `data.levels[0].turret.range` — la portée du **niveau 1**, quel
  que soit le niveau réel du bâtiment. Ça ne se voyait pas en construction
  neuve (le bâtiment est justement au niveau 1 à ce moment), mais le bouton
  « déplacer » (`BuildingPopup.tsx`) rappelle `startPlacing` sur un bâtiment
  **déjà construit et amélioré** : déplacer une tourelle laser de niveau 5
  affichait l'anneau du niveau 1 (portée 9,1) au lieu de sa vraie portée
  (12,0, +32 %). Le joueur choisit où reposer une tour améliorée en
  regardant un anneau qui ment sur ce qu'elle couvrira une fois reposée.
  `scene/Buildings.tsx` : `previewRange` lit maintenant le niveau courant du
  bâtiment (`buildingLevels[placingBuilding]`) via `turretStats(...)` si le
  bâtiment existe déjà (niveau > 0), et retombe sur `levels[0]` seulement
  pour une pose neuve (niveau 0, pas encore de stats).
- Vérifié que le filtre de collision entre bâtiments (`others`, même
  fichier) excluait déjà correctement le bâtiment en cours de déplacement de
  lui-même — ce n'était pas le bug, juste vérifié en passant en lisant le
  même bloc.

**Vérifié comment**

- Script Playwright ad hoc (`window.__villageStore`) : tourelle laser posée
  au niveau 5, `startPlacing('tourelle')`, capture d'écran avant/après
  correctif — l'anneau passe visiblement de la taille du niveau 1 à celle du
  niveau 5 (voir la capture, non gardée dans le dépôt). Confirmé aussi par
  lecture directe de `gamedata.ts` : tourelle niveau 1 → portée 9,1, niveau 5
  → 12,0.
- `pnpm run typecheck` (les 6 projets) : passe.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé (la portée affichée pendant la *pose* n'affecte pas la
  portée réelle utilisée en combat, qui passait déjà par `turretStats` au
  niveau courant ailleurs dans le fichier).
- `node tools/game-check/smoke.mjs` : 4/4, y compris le parcours « caméra
  tournée + pose » qui exerce `PlacementController`.
- `node tools/game-check/shot.mjs --village --out /tmp/apres.png`, ouvert et
  comparé à la capture d'avant séance : aucune différence, le correctif ne
  touche que l'anneau affiché pendant la pose, jamais rendu sur cette
  capture (aucun bâtiment en cours de déplacement).
- `cd artifacts/character-studio && pnpm --silent run studio selftest` :
  5/5 — cette séance n'a pas touché `src/game/characters/`.

**Essayé sans succès, à ne pas refaire**

- Rien écarté : le bug a été trouvé du premier coup en lisant le code du
  bouton « déplacer » (jamais couvert par `smoke.mjs`, déjà noté comme angle
  mort le 23/08), pas de fausse piste explorée.

**Reste ouvert**

- Le parcours « déplacer un bâtiment » n'est toujours pas dans
  `smoke.mjs` — il aurait attrapé ce bug automatiquement. Noté le 23/08 déjà,
  toujours pas fait : ajouter un cinquième scénario qui construit une tour à
  haut niveau, la déplace, et vérifie par exemple que `pendingPlacement`
  reste cohérent, serait la prochaine amélioration d'outillage si une séance
  s'y prête.
- Toujours ouvert (voir `BACKLOG.md`) : équilibrage du combat au ressenti
  (vrai appareil requis), faire le tour de la planète (refonte moteur),
  deuxième planète (fonctionnalité neuve).

## 2026-08-24 — Portées des tours recalibrées après l'agrandissement du plateau

**Choix de la tâche.** Toujours une seule case non cochée en tête de
`BACKLOG.md`, « équilibrage du combat au ressenti » — écartée pour la même
raison que les 9 séances précédentes depuis le 15/08 : elle exige un jugement
de ressenti/FPS sur un vrai appareil, explicitement hors de portée de cet
agent (le rendu logiciel de cette machine tourne à quelques images par
seconde). Les deux autres cases non cochées (« faire le tour de la
planète », « deuxième planète ») restent, comme noté à chaque séance depuis
le 22/08, une refonte moteur et une fonctionnalité neuve — pas une tâche de
séance normale.

Descendu au « reste ouvert » le plus récent (JOURNAL.md du 23/08) : « Portée
des tours et vitesse du héros pas recalibrées » depuis que `WORLD_RADIUS` est
passé de 14 à 16. C'est un point isolé, purement numérique, et directement
mesurable (contrairement au ressenti) — dans le même esprit que les
recalibrages du 20/08 et du 22/08.

**Fait**

- `gamedata.ts` : les portées des quatre tours (laser, mortier, cryo, tesla,
  tous niveaux) sont multipliées par 16/14 (≈ ×1,143), le ratio exact de
  l'agrandissement du plateau du 23/08. Objectif : leur rendre la même part
  du plateau qu'elles couvraient avant l'agrandissement, pas les buffer — un
  correctif d'un effet de bord non voulu, pas une décision d'équilibrage.
  Pour le cryo, `splash` (le rayon réel de la bulle de ralentissement,
  vérifié dans `Buildings.tsx` — c'est lui qui trace l'anneau au sol et fait
  le test de distance, `range` n'est pas utilisé pour ce mode) valait déjà
  exactement `range` avant ce changement ; les deux ont été montés ensemble
  pour rester égaux. Le texte d'effet du cryo (« Ralentit de X % dans un
  rayon de N ») mis à jour avec les nouveaux chiffres.
- **`HERO_RANGE` et `HERO_DPS` (`Hero.tsx`) volontairement pas touchés**,
  bien qu'ils souffrent du même effet de bord géométrique : ce sont
  exactement les deux constantes nommées dans la case « équilibrage du
  combat au ressenti » du backlog, réservées à un jugement sur un vrai
  appareil. Les toucher ici aurait anticipé cette case sans l'observation
  qu'elle demande. La vitesse de déplacement du héros (`SPEED` dans
  `Hero.tsx`) non plus, pour la même raison de prudence — la note du 23/08
  la groupait avec la portée des tours mais elle relève du ressenti de
  déplacement, pas d'une simple correction de couverture.

**Vérifié comment**

- `pnpm install` (nécessaire, `node_modules` absent au démarrage de la
  séance) puis `pnpm run typecheck` (les 6 projets) : passe.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé (les deux scénarios utilisent des positions et niveaux qui
  restent valides quelle que soit la portée).
- `node tools/game-check/smoke.mjs` : 4/4 parcours OK.
- `node tools/game-check/shot.mjs --village --out /tmp/apres.png` et
  `--arsenal`, ouverts : rien qui clippe ni ne se chevauche sur le plateau
  agrandi, les anneaux de portée des tours restent lisibles.
- `cd artifacts/character-studio && pnpm --silent run studio selftest` :
  5/5 — cette séance n'a pas touché `src/game/characters/`.
- Recherché (`grep`) les anciennes valeurs de portée en dur ailleurs dans le
  dépôt (tools, docs, autres artefacts) : aucune, seul `gamedata.ts` les
  portait.

**Essayé sans succès, à ne pas refaire**

- Rien écarté cette séance côté implémentation — la tâche était déjà bornée
  par le « reste ouvert » du 23/08, pas de fausse piste explorée.

**Reste ouvert**

- **`HERO_RANGE`, `HERO_DPS` et `SPEED` du héros** toujours pas recalibrés
  pour le plateau agrandi — délibérément, voir ci-dessus. Si Allonzo confirme
  sur un vrai appareil que le combat/déplacement se sent clairsemé, ce sont
  les trois constantes à revoir dans `Hero.tsx`, avec le même ratio (×16/14)
  comme point de départ si aucune autre mesure n'est disponible.
- Toujours ouvert (voir `BACKLOG.md`) : équilibrage du combat au ressenti
  (vrai appareil requis), faire le tour de la planète (refonte moteur),
  deuxième planète (fonctionnalité neuve).

## 2026-08-23 — Le plateau central s'agrandit

**Choix de la tâche.** Une seule case non cochée en tête de `BACKLOG.md`,
« équilibrage du combat au ressenti » — écartée pour la même raison que
toutes les séances depuis le 15/08 (9 fois de suite maintenant) : elle exige
un jugement de FPS/ressenti sur un vrai appareil, hors de portée de cet
agent, et ni `shot.mjs` ni `wave.mjs` ne mesurent ça. Avant de descendre à
« agrandir la zone jouable » (2e entrée ouverte, notée deux fois comme
« demande de reprendre ensemble caméra, vitesse du héros et portée des
tours, toute une séance »), j'ai rejoué le jeu en entier — `smoke.mjs`,
`wave.mjs --check`, captures village/wide/empty/arsenal/vague 9, audit du
kit de personnages, lecture des `useFrame` à la recherche d'allocations, et
un test de bout en bout du bouton « déplacer un bâtiment » (jamais couvert
par `smoke.mjs`) — sans rien trouver de cassé à corriger à la place. Les
deux autres entrées ouvertes (« faire le tour de la planète », « deuxième
planète ») sont explicitement hors périmètre : refonte de moteur ou
fonctionnalité neuve, pas une tâche de séance.

**Ce qui a changé la donne.** Plutôt que de prendre pour argent comptant la
note « il faut reprendre caméra + vitesse + portée ensemble », j'ai relu le
code : `scene/Camera.tsx` suit le héros à un décalage fixe (13 unités
derrière, damping independant de la cadence) — **elle ne dépend pas de
`WORLD_RADIUS`**, contrairement à ce que la note laissait supposer. Le
décor (`world.ts`, `buildScatter`) se répartit déjà entre `WORLD_RADIUS -
0.5` et le bord, donc il regénère sa disposition automatiquement à toute
taille. `PLATEAU_THETA` (la courbure visible au bord) se recalcule aussi
tout seul. Le seul vrai plafond dur est `PLANET_RADIUS` (26) et les
positions figées des cœurs/gisements de zone dans `zones.ts` (18 et 17,5) :
`WORLD_RADIUS` doit rester nettement en dessous pour ne pas les chevaucher.

**Fait**

- `world.ts` : `WORLD_RADIUS` porté de 14 à **16** (+31 % de surface au sol,
  (16/14)² ). Choisi pour garder une marge confortable (2 unités) sous les
  positions de cœur/gisement de zone les plus proches (18, 17,5), plutôt que
  pousser jusqu'à leur limite. Commentaires mis à jour (chute au bord :
  ≈ 5,5 unités, pente 38° au lieu de 33°).
- `zones.ts` : commentaire de tête mis à jour (14 → 16). Aucune constante
  de zone touchée — `ZONE_OUTER_RADIUS` (22) et les positions de secteur
  restent valides sans modification, elles étaient déjà calibrées avec une
  marge suffisante au-delà de 16.
- **Rien touché à la caméra, à la vitesse du héros ni à la portée des
  tours** — voir « reste ouvert ».
- `tools/game-check/smoke.mjs` : le scénario « caméra tournée + pose »
  utilisait un point d'écran fixe pour poser une tourelle. Le décor étant
  généré avec une graine fixe mais une plage de rayon dépendante de
  `WORLD_RADIUS`, agrandir le plateau redistribue toutes les positions de
  décor — ce point précis est tombé sur un rocher qui n'y était pas avant
  (confirmé via `checkPlacement` : `reason: 'decor'`, pas une régression de
  logique). Corrigé en essayant une poignée de cibles proches jusqu'à en
  trouver une valide, au lieu de dépendre d'un seul pixel qui marchait par
  chance — le scénario reste aussi strict (échoue si aucune des cibles ne
  fonctionne), juste plus robuste à un décor qui bouge.

**Vérifié comment**

- `pnpm run typecheck` (les 6 projets) : passe.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé (les scénarios utilisent les positions historiques de
  bâtiment, proches du centre, non affectées par le rayon du plateau).
- `node tools/game-check/smoke.mjs` : 4/4 parcours OK (le 4e a d'abord
  échoué avec le point d'écran fixe, corrigé — voir ci-dessus, puis revérifié
  au vert).
- `node tools/game-check/shot.mjs --village` et `--wide`, ouverts : le
  plateau est visiblement plus spacieux, plus de décor visible avant
  d'atteindre l'anneau du bord, courbure un peu plus marquée mais rien qui
  clippe ni qui se chevauche. Comparé aux captures d'avant changement.
- Un script Playwright ad hoc a confirmé que le bouton « déplacer un
  bâtiment » fonctionne toujours de bout en bout (position mise à jour,
  niveau conservé, aucune erreur console) — ce chemin n'est couvert par
  aucun des outils standard et n'avait pas été retesté depuis son ajout le
  17/08, malgré les changements de placement, de zones et de caméra depuis.
  Script jetable, non ajouté au dépôt.
- `cd artifacts/character-studio && pnpm --silent run studio selftest` : 5/5
  — cette séance n'a pas touché `src/game/characters/`.

**Essayé sans succès, à ne pas refaire**

- *Reproduire l'échec du 4e scénario de `smoke.mjs` en supposant une
  régression de logique de placement* — écarté après avoir demandé la
  raison exacte à `window.__villagePlacement.check(...)` :
  `{ valid: false, reason: 'decor' }`. Ce n'était pas un bug, juste un point
  d'écran fixe devenu malchanceux parce que la plage du décor dépend de
  `WORLD_RADIUS`. **Pour ce genre d'échec, toujours interroger
  `window.__villagePlacement.check` avec les coordonnées en cause avant de
  chercher plus loin — ça donne la raison exacte en un appel, au lieu de
  deviner.**
- Pas tenté d'agrandir jusqu'à la limite dure (`WORLD_RADIUS` proche de 18,
  où les positions de cœur de zone commencent) : gardé une marge de 2
  unités par prudence, sans mesure formelle de ce que cette marge doit
  valoir. Si Allonzo veut pousser plus loin, les cœurs de zone (`zones.ts`,
  `corePos`) et leurs gisements devront être redéplacés en même temps.

**Reste ouvert**

- **Portée des tours et vitesse du héros pas recalibrées.** Le plateau est
  16 % plus large en rayon (14 → 16) ; les tours et le héros gardent leur
  portée d'avant. Sur un plateau vide, ça laisse un peu plus de terrain hors
  de portée qu'avant. C'est délibérément laissé de côté — la note d'origine
  avait raison de vouloir prudence ici, seule la partie caméra était un faux
  problème. Si Allonzo trouve le jeu trop clairsemé sur le plateau agrandi,
  revoir `HERO_RANGE`/`gamedata.ts` (portées de tour) directement.
- Toujours ouvert (voir `BACKLOG.md`) : équilibrage du combat au ressenti
  (vrai appareil requis), faire le tour de la planète (refonte moteur),
  deuxième planète (fonctionnalité neuve).


## 2026-08-22 — Placement au doigt, textes du tutoriel désynchronisés

Nouveau retour de playtest d'Allonzo. Même cadre : pas de moteur, pas de
réorganisation des `.md`, pas de scripts d'agent, et **travail poussé par
lots** pour que rien ne soit perdu et que la routine de 2 h trouve un dépôt
propre.

### Le piège qui a mangé cinq poussées de suite

**`git push origin <branche>` pousse la branche locale, pas `HEAD`.** Évident
écrit comme ça, invisible en pratique — et il n'y a eu aucun message d'erreur,
nulle part.

Ce qui s'est passé : en resynchronisant en début de séance j'ai fait
`git checkout main` puis `git reset --hard origin/main`. Les cinq lots ont donc
été commités **sur `main` en local**, pendant que la branche
`claude/tower-defense-sprint-96lzf6` restait sur le commit de la veille. Chaque
`git push -u origin claude/…` poussait cette branche-là, inchangée. Le workflow
d'auto-fusion se déclenchait, refusionnait un commit déjà dans `main`,
concluait **« success »**, et supprimait la branche. Cinq fois. Le jeu déployé
n'a pas bougé d'un octet pendant deux heures de travail.

Trois choses trompent, et il faut les connaître :

1. `git log --oneline -1` juste après un commit montre bien le nouveau commit —
   mais c'est celui de la branche courante, qui n'est pas celle qu'on pousse.
2. `git push` répond `* [new branch]` avec un air de succès complet : la
   branche *est* créée, elle porte simplement le mauvais commit.
3. Le workflow rapporte `conclusion: success`. Il n'a rien fait de faux : on
   lui a demandé de fusionner un commit déjà fusionné.

**Le seul contrôle qui ne ment pas**, après chaque poussée :

```
git merge-base --is-ancestor "$(git rev-parse HEAD)" origin/main
```

Il faut qu'il finisse par répondre vrai. C'est lui qui a fini par lever le
lièvre — après avoir tourné dix minutes dans le vide, ce qui est précisément le
signal. Ne jamais conclure d'une poussée réussie ; conclure de ce test.

**Et la règle en amont :** rester sur la branche désignée. Pour se
resynchroniser sans la quitter :

```
git fetch origin main && git reset --hard origin/main   # depuis claude/…
```

plutôt que `git checkout main`. On travaille alors toujours sur la branche
qu'on poussera.

### Lot 1 — deux bugs de fond

**Le placement des bâtiments au doigt.** « Sur mon iPhone 13, quand ce n'est
pas des bâtiments de défense, la sensibilité de placement est un peu galère. »

Rien dans le code ne traitait les défenses différemment — la différence était
ailleurs. La pose se faisait au `pointerdown` : le bâtiment atterrissait au
premier contact, sans qu'on ait jamais vu le fantôme. Sur téléphone il n'y a
pas de survol avant le tap, et le pouce couvre à peu près un centimètre carré
d'écran, soit exactement l'anneau au sol. **Les tours semblaient plus faciles
parce que leur cercle de portée dépassait de la main** ; c'était le seul retour
visuel qui survivait au doigt.

Deux corrections : le geste passe en deux temps — on glisse pour viser, on
relâche, un bouton « Poser ici » confirme (et « Annuler » revient) — et le
fantôme gagne un mât vertical de trois unités surmonté d'un cristal, visible
au-dessus de la main quelle que soit la taille du bâtiment. Le point visé n'est
écrit dans le magasin qu'au relâchement : le suivi du doigt reste impératif,
une seule écriture par geste.

Joué dans un navigateur : glisser puis relâcher ne pose rien et publie le point
(−1,8 ; 4,0) marqué valide ; « Poser ici » fait passer le compte de bâtiments
de 0 à 1.

**Le tutoriel désignait une couleur qui n'existe plus.** Une carte disait
« touchez l'icône orange, tout en bas ». La rangée de pastilles avait été
remplacée par un bouton « Construire » lors de la refonte du panneau, et ce
bouton clignote en magenta depuis le sprint précédent : le joueur cherchait une
couleur absente, au milieu d'une carte elle-même magenta.

Le texte corrigé, mais surtout **une règle posée** : le tutoriel ne nomme plus
jamais une couleur, il désigne par le libellé exact et le coin de l'écran. Une
couleur se change en une ligne dans un thème, un libellé et une position non —
c'est ce qui rend le tutoriel insensible aux prochaines refontes. L'étape 2
passe de trois à cinq cartes, et suit maintenant le vrai parcours : Construire
→ onglet Production → Placer → viser → payer. La ligne de la hutte clignote
dans la feuille pendant cette étape, et la feuille s'ouvre directement sur
l'onglet où elle se trouve.

## 2026-08-22 — Coûts en boulons du début de partie rabotés

**Choix de la tâche.** Le backlog n'a qu'une seule entrée non cochée dans la
liste principale, « Régler l'équilibrage du combat au ressenti » — écartée
pour la même raison que toutes les séances depuis le 15/08 (15/08, 18/08,
19/08, 20/08, 21/08 × 2) : elle exige un jugement « au ressenti » sur un vrai
appareil, hors de portée de cet agent, et ni `shot.mjs` ni `wave.mjs` ne
mesurent le ressenti ni les performances. Descendu à la section « Reste
ouvert » du sprint du 21/08 : deux entrées, « agrandir la zone jouable » et
« revoir les coûts en boulons du début de partie ». La première est
explicitement documentée dans le journal du 21/08 comme demandant de
reprendre ensemble caméra, vitesse du héros et portée des tours — trop large
et trop risqué pour une séance normale. La seconde est un point isolé,
purement numérique (des coûts dans `gamedata.ts`) et directement mesurable en
conditions réelles, dans le même esprit que le buff de production du 20/08 :
choisie.

**Fait**

- `gamedata.ts` : le coût en boulons du **niveau 1** (le déblocage) de chaque
  bâtiment est rabaissé d'environ 40 %, arrondi. Rien d'autre ne bouge —
  niveaux 2 et plus, production passive, coûts en matière floue/énergie de
  rire — pour garder la pente qui ralentit ensuite (la demande d'Allonzo,
  « ultra-rapide au début puis progressif », modèle Clash of Clans). La hutte
  (50) n'a pas été touchée : c'est déjà le premier geste de la partie, payable
  avec les 50 boulons de départ.

  | bâtiment | avant | après |
  |---|---|---|
  | ferme | 150 | 90 |
  | bar | 250 | 150 |
  | antenne | 600 | 350 |
  | marché | 1000 | 600 |
  | tourelle laser | 300 | 180 |
  | mortier | 700 | 420 |
  | cryo | 900 | 540 |
  | tesla | 1200 | 720 |

- Vérifié qu'aucun autre fichier ne référence ces valeurs en dur (recherche
  `boulons: <ancienne valeur>` sur tout le dépôt, hors `node_modules`) : les
  seuls autres résultats sont des niveaux 2+ non concernés et une formule sans
  rapport dans `hero.ts`.

**Vérifié comment**

- `pnpm install` (nécessaire, `node_modules` absent au démarrage de la
  séance) puis `pnpm run typecheck` (les 6 projets) : passe.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé (le scénario `--tourelle` part avec des ressources déjà
  hautes, insensible au coût de niveau 1).
- `node tools/game-check/shot.mjs --village --out /tmp/apres.png`, ouvert :
  aucune régression sur les six bâtiments (changement de données pures, pas
  de rendu touché).
- **Le gain réel, mesuré en conditions réelles** (aucune des deux commandes
  standard ne mesure un temps d'attente) : script Playwright ad hoc
  réutilisant `openGame`/`makeSave`/`serveStatic` de `lib.mjs`, partie neuve
  (50 boulons, aucun bâtiment), hutte bâtie via `window.__villageStore`
  (exposé depuis le sprint du 21/08), puis lecture de `localStorage` toutes
  les 3 s. Le nouveau coût de la tourelle (180) est devenu payable à
  **t = 45,1 s**, contre ~75 s attendus pour l'ancien coût (300) à la même
  cadence de production (4 boulons/s) — l'écart mesuré colle exactement au
  calcul (300−180)/4 = 30 s de moins. Script jetable, non ajouté au dépôt.
- `cd artifacts/character-studio && pnpm --silent run studio selftest` : 5/5
  — cette séance n'a pas touché `src/game/characters/`.

**Essayé sans succès, à ne pas refaire**

- Rien écarté cette séance côté implémentation : la cause était déjà
  identifiée dans le backlog lui-même (« ce sont les coûts qui n'ont pas été
  retouchés »), pas de fausse piste sur le code.
- Envisagé de baisser aussi les coûts en matière floue/énergie de rire des
  tours de niveau 1, pour aller plus loin dans l'esprit de la demande. Écarté
  : la tâche du backlog dit explicitement « les coûts **en boulons** », et la
  matière floue/l'énergie de rire ont leur propre boucle (déblayage de décor,
  Ferme, Marché) déjà réglée lors du sprint du 21/08 — les retoucher ici
  aurait débordé du périmètre d'une seule tâche.

**Reste ouvert**

- Voir `BACKLOG.md` : équilibrage du combat (nécessite un vrai appareil), et
  agrandir la zone jouable (`WORLD_RADIUS` reste à 14 — demande de reprendre
  ensemble caméra, vitesse du héros et portée des tours, une séance à elle
  seule).
- Les coûts abaissés sont un premier chiffre raisonnable (~40 %, uniforme),
  pas calibré finement bâtiment par bâtiment : si Allonzo le trouve encore
  trop lent (ou trop rapide) une fois testé, resserrer `gamedata.ts`
  directement, c'est la seule source de vérité.

### Lot 2 — annexer un secteur change enfin quelque chose

« On les achète et y a rien à faire après. » C'était exact : un secteur annexé
n'apportait que du terrain constructible, ce qui ne se ressent pas.

Chaque zone porte maintenant **un effet permanent chiffré** et **son propre
gisement** :

| secteur | effet permanent | gisement |
|---|---|---|
| Plaines de Cendre | toutes les tours +20 % de dégâts | boulons, +30 / 6 s |
| Toundra de Givre | tous les monstres 12 % plus lents | matière floue, +3 / 16 s |
| Jungle de Spores | deux Chasseurs spatiaux de plus | matière floue, +5 / 13 s |
| Dunes Dorées | butin de vague +30 % | énergie de rire, +3 / 20 s |

Un seul effet par zone, dicible en une ligne sur la fiche — et la fiche
l'annonce **avant** l'achat, avec le gisement. Les deux ressources rares
reviennent par là : les gisements du plateau ont été volontairement ralentis au
sprint précédent, les secteurs sont la nouvelle voie d'approvisionnement. Ça
donne aussi une raison d'aller marcher là-bas, ce qui manquait complètement.

Tout passe par une seule fonction, `zoneEffects(unlocked)`, lue par les tours,
les monstres, le calcul de butin et les chasseurs. Sans secteur annexé, tous
les multiplicateurs valent 1 : une partie neuve et les outils de vérification
se comportent exactement comme avant.

**La deuxième planète.** Le panneau disait « à venir — annexez les quatre
secteurs et l'empire s'étendra plus loin », ce qui se lisait comme une
fonctionnalité verrouillée qu'on cherche ensuite à débloquer. Reformulé sans
ambiguïté : « pas encore là — elle n'existe pas encore dans le jeu, c'est la
prochaine étape prévue ». Mieux vaut une promesse datée qu'une fausse serrure.

Vérifié dans un navigateur : la fiche des Cendres annonce bien « +20 % de
dégâts » et son gisement de boulons ; les quatre secteurs s'annexent ; le héros
trouve un gisement sur place.


### Lot 3 — l'entrée en combat s'annonce, et l'écran se dévoile par paliers

**L'annonce de vague** (`ui/WaveIntro.tsx`). Le passage en combat ne se voyait
qu'à un changement de panneau en bas à droite : on lançait une vague sans le
remarquer, et les monstres tombaient sur un joueur encore en train de bâtir.
Deux lames rouges balaient l'écran en sens inverse, « ATTAQUE — VAGUE 7 » et la
composition annoncée, une seconde et demie. Ça ne bloque rien
(`pointer-events-none`) : on peut déjà courir se placer pendant que ça défile,
ce qui est précisément le bon réflexe. Le déclencheur est le passage de
`waveActive` à vrai, pas le clic du bouton — une vague lancée autrement
s'annonce pareil.

**L'interface se dévoile au fil des niveaux** (`hudTiers.ts`). « Pendant les
vagues c'est un peu le bordel, on ne comprend pas ce qui se passe ; il faudrait
une solution progressive. » Tout arrivait dès la première vague : chiffres de
dégâts, enchaînements, flèches de menace, bandeaux de niveau, gains de
ressources. Chacun aide isolément ; les cinq ensemble sur un écran de téléphone
se neutralisent.

Ils s'allument maintenant l'un après l'autre — chiffres de dégâts au niveau 3,
flèches de menace au 4, compteur d'enchaînement au 6. Les deux premières vagues
ne montrent que l'objectif, l'état du noyau et le nombre de monstres restants.
Le déblocage est annoncé **dans la carte de montée de niveau**, au moment même
où il tombe : pas une notification de plus à absorber.

Et une redondance supprimée : l'enchaînement s'affichait à la fois en gros
au-dessus du cadavre et dans le HUD. Deux fois la même information, au moment
où l'écran en a le moins besoin. Seul le compteur du HUD reste.


### Lot 4 — les personnages ont enfin un portrait

« Sur certains aperçus de bâtiment on pourrait avoir des aperçus des
personnages plus détaillés, un peu à la Clash of Clans. » Les fiches ne
montraient qu'une icône SVG plate, alors que tout le jeu est bâti autour de ses
personnages et qu'on ne les voyait jamais de près.

`ui/CharacterPortrait.tsx` rend un `ToonHumanoid` dans un petit canevas, en
rotation lente — une figurine. La fiche d'un bâtiment montre son occupant (le
Bar montre un Chasseur spatial : c'est lui qu'il recrute), et la fiche du
commandant montre le héros.

**Un second contexte WebGL, avec une règle.** Les navigateurs mobiles n'en
tolèrent qu'une poignée. Il n'y en a donc jamais qu'un à la fois, monté avec la
fiche et démonté avec elle — vérifié dans un navigateur : 2 canevas fiche
ouverte, 1 après fermeture. Une galerie de portraits côte à côte ferait sauter
la limite ; ne pas généraliser sans y penser.

**Deux corrections de cadrage, trouvées à l'écran.** Le rig est construit les
pieds à l'origine : un cadrage centré sur zéro met le personnage dans la moitié
basse et lui coupe la tête. Et les `CharacterDef` portent des échelles de 0,56
(Fileur) à 1,05 (Colosse), pensées pour la scène — telles quelles, un portrait
sur deux sortait minuscule. Le portrait normalise donc l'échelle : leur taille
relative se lit dans le jeu, pas dans une vignette de 84 pixels.

Au passage, la table « quel villageois habite quel bâtiment » a quitté
`scene/Villagers.tsx` pour `gamedata.ts` : l'interface en a besoin autant que
la scène, et il n'y a pas de raison qu'elle importe un module de scène pour
lire une correspondance.


### Lot 5 — le bord du monde est expliqué, la face cachée existe

« On voit encore les limites de la sphère : quand on a tous les territoires, on
ne peut pas en faire le tour quand même. »

**Ce qui n'a pas été fait, et pourquoi.** Faire réellement le tour demande de
déplacer le héros en coordonnées sphériques. Tout le jeu raisonne en (x, z)
plat — mouvement, portées, ciblage des tours, validation de placement,
`enemyPositions` — et au-delà de l'équateur la projection cesse d'être
bijective : deux points de la sphère tombent sur le même (x, z). Ce n'est pas
de l'habillage, c'est le moteur, et c'est explicitement hors du cadre posé par
Allonzo. Noté dans `BACKLOG.md` pour ce que ça vaut.

**Ce qui était traitable.** La limite était un mur invisible au milieu d'un
terrain qui continuait : on s'arrêtait sans savoir pourquoi. Elle est
maintenant expliquée par le décor — une faille circulaire sombre, une crête de
soixante-quatre éclats de roche déchiquetés, et un voile de tempête en rotation
lente. On s'arrête parce qu'on voit pourquoi.

Et la face opposée n'est plus une coque de roche uniforme : calotte polaire,
mers gelées, cratères et massifs, répartis de façon déterministe sur toute la
calotte sud. De loin, la planète a l'air entière, et la zone jouable ressemble
à une région d'un monde plutôt qu'à un disque découpé. Tout est décoratif —
aucune collision, la limite reste celle de `maxRadiusAt`.

Deux refs mortes retirées au passage dans `PlacementController` (`validRef`,
`hasPointRef`) : elles étaient écrites et plus jamais lues depuis que la
validité passe par `pendingPlacement`.


### Lot 6 — la revue de bugs demandée, et un outil pour la rejouer

« Le jeu mérite une review de bugs et de petits réglages d'optimisation. »

**Un vrai bug trouvé, dans mon propre code du jour.** `zoneEffects(unlocked)`
rendait un objet neuf à chaque appel, et elle est appelée **par monstre et par
tour, à chaque image** : c'est elle qui décide de la vitesse des uns et des
dégâts des autres. Une vingtaine de monstres et une poignée de tours, ça fait
près de deux mille allocations par seconde en pleine vague — exactement ce que
proscrit `.agents/memory/r3f-game-perf.md`, introduit par le lot 2 quelques
heures plus tôt. `unlockedZones` étant une référence stable dans le magasin,
une comparaison d'identité suffit à mettre le résultat en cache ; il l'est
désormais, ainsi que `unlockedZoneNodes`, appelée à chaque mouvement du doigt
pendant une pose.

Balayage systématique des fichiers touchés dans la journée à la recherche de
`new THREE.*`, `.map()` et `.filter()` à l'intérieur d'un `useFrame` : plus
rien après ce correctif.

**Et un outil pour que la revue soit rejouable** : `tools/game-check/smoke.mjs`.
`wave.mjs --check` protège le cœur du jeu, `shot.mjs` montre une image — mais
ni l'un ni l'autre n'ouvre un panneau, ne tourne la caméra, ne pose un bâtiment
ni ne déclenche un pouvoir. La moitié du jeu n'était jamais exécutée entre deux
séances. Le script joue quatre parcours dans un vrai navigateur et sort en 1 à
la première erreur console :

```
node tools/game-check/smoke.mjs
OK    partie neuve + tutoriel
OK    tous les panneaux
OK    vague 12 + zones + pouvoirs
OK    caméra tournée + pose
```

Les parcours désignent les boutons par leur libellé. C'est fragile par
construction, et c'est l'intérêt : renommer « Poser ici » sans y penser fait
échouer le test plutôt que casser le jeu en silence.

Note : `tools/game-check/README.md` ne mentionne pas ce nouvel outil, ni les
options `--arsenal` et `--wave` ajoutées la veille. La consigne d'Allonzo est
de ne pas toucher aux fichiers `.md` hors journal et backlog, donc la
documentation vit dans l'en-tête de chaque script. À reprendre le jour où la
consigne se lève.


---

## 2026-08-21 (sprint 2) — Freeze de vague, son, cristal lisible, tuto en magenta

Second sprint ouvert par Allonzo sur son forfait, à partir d'un retour de
playtest. Mêmes garde-fous : pas de moteur, pas de réorganisation des `.md`,
pas de scripts d'agent. **Travail poussé par lots** — chaque lot vérifié et
fusionné dès qu'il tient debout, pour que rien ne soit perdu si la séance
s'arrête en route.

### Lot 1 — technique et lisibilité

**Le gel de début de vague, mesuré et corrigé.** Cause principale trouvée :
chaque monstre portait une `pointLight`. Three.js **recompile tous les
matériaux de la scène dès que le nombre de lumières change** — vingt monstres
qui apparaissent, c'est vingt recompilations complètes du village, du sol et de
la planète dans la même image. Remplacées par un disque additif au sol : même
lueur, zéro lumière. Deux autres coûts retirés au passage : les barres de vie
passaient par un `<Html>` de drei (un nœud DOM et un portail React par monstre
blessé, montés et démontés en plein combat) — ce sont maintenant deux quads
posés au sol ; et le montage des monstres est étalé (six d'un coup, puis quatre
toutes les 120 ms), ce qui répartit la création des rigs sur plusieurs images.
Le seuil de six laisse les vagues 1 et 2 passer en une fois, donc le scénario
de `wave.mjs --check` est inchangé.

Mesuré avec une sonde `requestAnimationFrame`, même machine, même sauvegarde,
vague 11 (23 monstres), rendu logiciel :

| | pire image au repos | pire image au lancement |
|---|---|---|
| avant | 673 ms | **2184 ms** |
| après | 737 ms | **719 ms** |

Le pic a disparu : le lancement coûte désormais exactement une image normale.

**Le son.** Il n'était pas cassé — sonde en place, contexte `running`,
oscillateurs bien créés. Il était **trop faible et trop rare** : volume général
à 0.32, et rien entre deux tirs. Volume porté à 0.62 avec tous les effets
relevés en proportion, et surtout une nappe musicale continue synthétisée qui
bascule entre calme et combat. Le déverrouillage était branché `{ once: true }`
sur un seul geste : si celui-là tombait au mauvais moment, le jeu restait muet
toute la session sans rien pour le dire. Il réessaie maintenant à chaque geste,
en capture. Réactiver le son joue deux notes de confirmation.

**Le didacticiel passe au magenta** (`ui/tutorialTheme.ts`). Il était ambre,
comme le bouton de vague, la barre d'XP, la carte de montée de niveau et le
fanion de niveau maximum : un clignotement de plus dans cette teinte ne disait
plus « regardez ici ». Le magenta n'est utilisé par aucune ressource, aucun
bâtiment, aucun monstre — tout ce qui clignote en magenta appartient au
tutoriel.

**Le cristal s'explique.** « On ne comprend pas pourquoi l'anneau diminue,
pourquoi il devient rouge ou bleu, ni s'il se régénère. » Trois causes, trois
corrections : l'anneau porte son nom et ses chiffres au-dessus de lui ; il suit
le code vert → ambre → rouge au lieu du cyan-puis-rouge (le cyan est l'identité
du cristal, pas sa santé, et « plein » paraissait « allumé ») ; et hors combat
l'étiquette rappelle « réparé avant chaque vague », avec une pulsation verte au
moment où il repasse à 100 %.

**Nerf de la hutte** sur ses deux derniers niveaux seulement (14 → 11 et
24 → 16 boulons/seconde, niveau 5 renchéri de 2000 à 2600). Trois huttes de
niveau 5 rapportaient 72 boulons/seconde, de quoi payer une tourelle toutes les
quatre secondes. Les niveaux 1 à 3 ne bougent pas : c'est le début de partie,
et le buff du 20/08 répondait à un vrai problème.

### Lot 5 — la grille de placement s'assouplit, mesures à l'appui

Dernier point bien défini du backlog, demandé deux fois : « le placement des
bâtiments est trop rigide, revoir la taille des colliders ».

Le placement imposait un écart fixe de **3,4 unités entre deux centres**, quel
que soit le gabarit : une antenne — un mât de 0,5 de rayon — réservait autant
de terrain qu'un marché de 2,2 de large. Chaque bâtiment porte maintenant son
`footprint` dans `gamedata.ts`, mesuré sur sa géométrie (1,1 pour l'antenne,
1,6 pour la hutte et le marché), et deux bâtiments se gênent si la distance de
leurs centres est sous **la somme de leurs deux rayons**.

Le socle octogonal coloré est dessiné à ce rayon exactement, et il est sorti du
groupe mis à l'échelle : **l'anneau qu'on voit au sol est l'encombrement réel**.
Avant, il avait un rayon fixe qui grandissait avec le niveau et ne
correspondait à rien de vérifiable.

**Mesuré, pas supposé.** `window.__villagePlacement` expose les règles pour
que les outils puissent les compter. Plateau échantillonné au quart d'unité
avec les six bâtiments du scénario `--village` posés, emplacements valides :

| bâtiment | rayon | valides | vs ancienne règle |
|---|---|---|---|
| antenne | 1,10 | 1787 | **+192 %** |
| tourelle / cryo | 1,15 | 1677 | +174 % |
| tesla | 1,20 | 1571 | +157 % |
| mortier | 1,25 | 1452 | +137 % |
| ferme | 1,35 | 1231 | +101 % |
| bar | 1,45 | 1025 | +67 % |
| hutte / marché | 1,60 | 779 | +27 % |
| *(ancienne règle, écart fixe 3,4)* | — | *612* | — |

**Le premier essai était un échange, pas un assouplissement.** En appliquant le
gabarit entier au décor (`o.r + footprint`), l'antenne gagnait +92 % mais la
hutte **perdait 45 %** : l'ancienne marge fixe de 1,2 unité autour du décor
était calibrée pour le plus large des bâtiments. D'où `DECOR_CLEARANCE = 0.75`,
choisi pour que `1.6 × 0.75 = 1.2` — la hutte et le marché gardent exactement
le dégagement qu'ils avaient, et tout ce qui est plus étroit en gagne. La
condition était que personne ne perde de place.

**Attention en relisant une mesure** : l'émulation de l'« ancienne règle » doit
être recalibrée quand la formule change. Après l'ajout de `DECOR_CLEARANCE`, ma
ligne de référence est passée de 596 à 1150 emplacements sans que la règle
d'avant ait bougé d'un pouce — la comparaison ne voulait plus rien dire. Les
bons paramètres de l'émulation sont `footprint = 1.6` et voisins à `1.8`.

### Un piège de la boucle d'auto-fusion, découvert en poussant

**Ne pas repousser sur la même branche tant que la fusion précédente n'a pas
fini.** Deux poussées rapprochées se font la course : `auto-merge.yml`
sérialise les exécutions (`concurrency: auto-merge`), mais la première termine
en supprimant la branche — or, entre-temps, la branche a avancé. Elle fusionne
donc le commit qu'elle avait lu au départ, puis efface une référence qui
pointait déjà plus loin ; la seconde exécution ne trouve plus rien à fetcher, et
le commit intermédiaire disparaît du dépôt distant sans qu'aucune étape
n'échoue visiblement.

Vu en vrai ce soir : un commit de journal poussé quinze secondes après un
commit de code n'est jamais arrivé dans `main`, alors que la poussée avait
réussi et que la branche avait bien été créée.

**Le réflexe :** après un `git push`, vérifier que le commit est bien dans
`origin/main` (`git merge-base --is-ancestor <sha> origin/main`) avant d'en
pousser un autre. Une séance de routine ne pousse qu'une fois, elle n'est donc
pas concernée — mais un sprint à plusieurs lots l'est.

### Un bug visuel trouvé sur la dernière capture

Les arcs de la Bobine Tesla et le rayon des Chasseurs spatiaux étaient tracés
dans le mauvais repère. L'arc est un enfant du groupe du bâtiment, lui-même
incliné par la courbure de la planète **et** agrandi par `BUILDING_SCALE` : un
écart calculé en coordonnées du monde et posé tel quel dans ce repère pointe à
côté et s'étire du facteur d'échelle. Au centre de la carte, où l'inclinaison
est presque nulle, ça passait inaperçu ; à huit unités du noyau, l'arc devenait
un trait blanc vertical en travers de l'écran.

`worldToLocal` sur le parent règle les deux cas. Le rayon du héros, lui, le
faisait déjà — c'est sa méthode qu'il fallait recopier.

**À retenir :** dès qu'on tend une géométrie entre deux points dans cette
scène, la cible doit passer par `worldToLocal` du parent. Rien n'est en repère
monde ici, tout est incliné par la planète.

### Lot 4 — le héros s'améliore, et frappe fort

« Ajouter la possibilité d'améliorer notre bonhomme et potentiellement lui
donner des super-pouvoirs. » Tout l'investissement allait jusqu'ici dans des
bâtiments ; le personnage qu'on pilote était le même à la vague 1 et à la
vague 20.

**Trois pistes chiffrées** (`hero.ts`) : Puissance (+18 dégâts/sec par cran,
5 crans), Portée (+0,9 unité, 4 crans), Vitesse (+0,55 unité/sec, 4 crans).
Coûts exponentiels, matière floue et énergie de rire à partir du deuxième cran
— c'est un puits de ressources rares de plus, en plus des tours et du noyau.

**Deux pouvoirs actifs** qui s'ouvrent au niveau de commandant, pas à l'argent :
l'Onde de choc (niveau 4, 220 dégâts et une poussée de 2,6 unités dans un rayon
de 6,5, recharge 22 s) et la Surcharge (niveau 9, dégâts doublés pendant huit
secondes, recharge 40 s). Les boutons n'apparaissent qu'une fois le pouvoir
ouvert — pas de bouton grisé sans explication ; le niveau requis est écrit dans
la fiche du commandant.

La fiche s'ouvre en touchant **l'écusson de niveau** en haut à gauche. C'est
déjà là qu'on regarde pour savoir où on en est, et ça évite un cinquième onglet
dans une feuille de construction qui n'a plus de place sur 390 pixels.

Recharges et durées vivent dans `heroPowers.ts`, hors React et hors Zustand :
ce sont des dates comparées à chaque image. Le HUD les échantillonne dix fois
par seconde — la jauge paraît continue sans re-rendre l'interface à chaque
image. L'horloge est `performance.now()` et non celle de three, sinon la jauge
du bouton et l'effet dans la scène se décaleraient.

Joué dans un navigateur : une amélioration achetée (`{}` → `puissance: 1`), et
l'Onde de choc déclenchée en pleine vague fait tomber le total des points de
vie ennemis de 2801 à 2281.

### Lot 3 — les zones deviennent des secteurs à annexer

« Au lieu d'avoir un effet pas fini, transforme les zones grisées en zones
déblocables. » C'est fait, et c'est le plus gros morceau du sprint.

`zones.ts` découpe la couronne `WORLD_RADIUS → 22` en **quatre secteurs d'un
quart de tour**, chacun avec son biome : Plaines de Cendre (obsidienne sur
coulée refroidie), Toundra de Givre (pics de glace), Jungle de Spores
(champignons bioluminescents), Dunes Dorées (sable de verre et quartz).
Verrouillé, un secteur est gris mat et porte un cadenas — « pas encore à vous »
plutôt que « pas fini ». Annexé, il prend sa palette, son décor propre, et
devient jouable **et constructible**.

Une seule fonction arbitre tout : `maxRadiusAt(x, z, unlocked)`. Le héros s'y
heurte, `checkPlacement` s'en sert, et elle rend `WORLD_RADIUS` partout tant
que rien n'est annexé — donc une partie sans zone se comporte exactement comme
avant, y compris pour les outils de vérification. Vérifié dans un navigateur :
les quatre secteurs s'annexent, et le héros marche jusqu'à r = 22 dans un
secteur annexé contre 14 ailleurs.

Chaque zone porte déjà un `corePos`, l'emplacement de son futur cœur à
défendre — la donnée est là, le combat n'a encore qu'un cœur. Et un onglet
**Empire** dans la feuille de construction montre les secteurs possédés, ceux
qui restent, et annonce la deuxième planète : « annexez les quatre secteurs de
la Racine, et l'empire s'étendra plus loin ». C'est le point d'entrée tout
trouvé pour la suite.

**La conversion d'angle, à ne pas refaire de tête.** `zones.ts` décrit les
secteurs en `atan2(z, x)` ; la `SphereGeometry` de three paramètre par `phi`,
avec `x = −r·sinθ·cos φ`, d'où `phi = π − angle`, `phiStart = π − to` et
`phiLength = to − from`. Un seul endroit du projet fait cette conversion, dans
`ZoneSector` — la refaire ailleurs à l'envers donne des secteurs en miroir,
qui compilent et se placent silencieusement du mauvais côté.

### Lot 2 — déblayage du décor et rotation de la vue

**Le décor devient déblayable.** « Plein de petits éléments de décor gênants
qui rendent le placement des bâtiments flou. » Plutôt que de retirer le décor —
il fait la vie de la planète — le joueur fait sa place : une touche sur un
arbre, un rocher, un buisson, une géode ou un champignon ouvre un panneau, et
un bouton le déblaie contre une petite récompense (6 à 18 boulons, plus de la
matière floue pour les géodes). Une touche ne suffit pas à détruire : le geste
est irréversible et le joystick renvoie les touches brèves au canevas, donc un
doigt qui glisse près d'un rocher raserait la moitié de la planète.

Chaque élément de `SCATTER` porte désormais un `id` stable, `checkPlacement`
reçoit `clearedDecor` et ignore ce qui a été déblayé, et la liste est
persistée. Vérifié dans un vrai navigateur : `rock-0` déblayé, 500 → 518
boulons, l'élément disparaît du rendu et de la validation de placement.

**La vue tourne autour du héros** (`cameraControl.ts`, `ui/CameraControls.tsx`).
Deux flèches et une boussole à gauche de l'écran, plus les flèches du clavier ;
tenir une flèche fait tourner en continu, et la boussole indique de combien on
s'est écarté de l'axe. Pas un geste à deux doigts : le joystick dynamique
capture le pointeur dès le premier contact et les deux se déclencheraient
ensemble.

Deux points qui comptent : l'angle vit hors de React et de Zustand (il change à
chaque image tant qu'un bouton est tenu), et **la direction du joystick est
tournée du même angle** dans `Hero.tsx` — sans ça, pousser vers le haut de
l'écran enverrait le héros de travers dès qu'on a tourné. À `yaw = 0` la
rotation est l'identité : le cadrage et les commandes d'origine sont
exactement conservés, et les outils de vérification voient la même scène.

## 2026-08-21 (soir) — Sprint : planète 3D, bestiaire, arsenal, progression, UI

**Séance exceptionnelle.** Allonzo a ouvert un sprint sur un surplus de crédits
et fourni un compte-rendu d'évaluation complet (onboarding, rétention, gameplay,
économie, environnement) avec pour consigne d'en traiter le maximum d'un coup —
au lieu de la règle habituelle « une tâche par séance ». Deux garde-fous posés
par lui : ne pas toucher aux mécaniques fondamentales du moteur ni à la boucle
de base, et ne rien réorganiser du système de journaux ni de la routine de 2 h.
Cette entrée et les cases cochées dans `BACKLOG.md` sont donc le seul contact
avec le système de journaux — écrire ici fait partie de la routine, pas de sa
réorganisation. `AGENTS.md`, `.agents/ROUTINE.md`, `.agents/memory/` et les
workflows GitHub n'ont pas été touchés.

### Ce qui a été fait

**La carte est devenue une planète.** `world.ts` gagne `surfaceY`,
`surfacePos`, `surfaceRotation` et `applySurfaceRotation` : le disque plat est
rendu comme la calotte d'une sphère de rayon 26 (`PLANET_RADIUS`), qui plonge
de quatre unités au bord du plateau. **Le jeu continue de raisonner en (x, z)
plat** — déplacements, portées, placement, ciblage gardent exactement les mêmes
maths qu'avant ; la sphère n'intervient qu'au rendu. C'est ce qui permet de
tenir la consigne « ne pas toucher au cœur » tout en changeant l'envergure de
la carte. `Ground.tsx` est refait : une seule sphère, verte au sommet et
rocheuse ailleurs (même rayon, donc aucune couture visible), halo
atmosphérique additif, géante gazeuse annelée et trois lunes au loin, géodes et
champignons géants ajoutés au décor déterministe.

**Bestiaire** (`src/game/enemies.ts`, nouveau). Sept profils : Grognard (le
monstre d'origine, référence d'équilibrage), Fileur (rapide et fragile),
Colosse (tank lent), Écumeur (vole — les tours au sol ne le touchent pas),
Bombeur (dégâts au noyau presque doublés), Spectre (intouchable une seconde sur
trois), Chaman (soigne ses voisins). Chacun ne change **qu'une** chose au
comportement de base : c'est ce qui les rend reconnaissables et contrables.
Composition de vague déterministe, annoncée avant le lancement par un radar
dans le HUD. **Les vagues 1 et 2 restent 100 % Grognards** — c'est le scénario
de `wave.mjs --check` et le moment où le joueur apprend les commandes.

**Arsenal** (`gamedata.ts`). Trois tours de plus : Mortier à plasma (obus qui
voyagent vraiment et explosent en zone), Cryo-diffuseur (ralentit sa bulle,
volants compris, ne tue presque rien), Bobine Tesla (plusieurs cibles à la
fois, seule tour qui abat les volants). Et le cap d'un exemplaire par bâtiment
est levé : les exemplaires supplémentaires prennent un identifiant dérivé
(`tourelle#2`), **le premier gardant l'identifiant nu, donc aucune sauvegarde
existante n'a besoin de migration** et `makeSave` des outils continue de
marcher tel quel. Une seule règle : passer par `buildingData(id)` au lieu de
`BUILDINGS[id]`.

**Évolution visuelle par niveau.** Chaque bâtiment grandit de 5 % par niveau,
porte une couronne de jetons lumineux (un par niveau) et gagne des anneaux de
socle aux rangs 3 et 5 ; par-dessus, chacun a ses propres pièces (cheminée puis
annexe puis fanion pour la hutte, canons supplémentaires pour la tourelle,
paraboles pour l'antenne, bobines pour le tesla…).

**Progression et game feel.** Niveau de commandant avec courbe d'XP, titres et
récompenses (`progress.ts`), enchaînements de mises à mort, chiffres de dégâts
flottants, gerbes d'éclats, secousse de caméra, et des sons **entièrement
synthétisés par WebAudio** — aucun fichier audio ajouté au dépôt, dans le même
esprit que la 3D sans texture. Tous les effets vivent dans des pools de module
(`effects.ts`), hors React et hors Zustand, comme l'impose
`.agents/memory/r3f-game-perf.md`.

**Économie.** Les gisements rares sont nettement ralentis (matière floue 4 → 2
toutes les 14 s, énergie de rire 3 → 1 toutes les 24 s ; les boulons ne bougent
pas, la boucle de base doit rester généreuse). Nouveaux puits : les trois tours
coûtent lourd en matière floue et en énergie de rire, et le noyau se renforce
en trois rangs — chaque rang accorde un monstre de tolérance de plus. Monter
les **points de vie** du noyau n'aurait rien changé : `coreBreachDamage` est
proportionnelle, donc doubler les pv double aussi les dégâts par monstre.

**À quoi servent les bâtiments.** Chacun porte un rôle et une phrase qui le dit,
affichée partout où il apparaît. Le Bar recrute à nouveau des Chasseurs
spatiaux (`scene/Hunters.tsx`) — un par niveau, ils patrouillent autour de lui
et vont au-devant des monstres, avec une laisse pour ne pas suivre une cible à
l'autre bout de la planète. L'Antenne allonge la portée et les dégâts du héros.
Le Marché majore le butin de chaque vague.

**Interface.** Tutoriel redécoupé en **treize cartes d'une phrase** au lieu de
cinq pavés, avec un fil d'avancement. La rangée de pastilles de construction
(qui ne tenait plus à neuf bâtiments) est remplacée par une feuille groupée par
rôle, où chaque entrée dit ce qu'elle fait, ce qu'elle coûte et combien on peut
en poser. Un objectif courant est toujours affiché (`objectives.ts`). Barre
d'XP, radar de vague, compteur d'enchaînement, bouton de coupure du son.

**Flèches de menace** (`ui/ThreatMarkers.tsx`, ajouté après la première
fusion). La caméra suit le héros et l'écran d'un téléphone cadre à peine la
moitié du plateau : la moitié d'une vague approchait hors champ, et on
découvrait l'attaque au bruit du noyau qui encaisse. Chaque monstre hors cadre
pousse maintenant une flèche sur le bord de l'écran, à la couleur de son
profil, avec sa distance au cristal — six au plus, les plus proches du cristal,
au-delà le bord devient une frise illisible. Les monstres poussent aussi une
gerbe à leur couleur au moment où ils apparaissent : c'est le seul instant où
le joueur peut encore choisir de quel côté aller.

### Six bugs trouvés en chemin

1. **Le panneau de vague ne s'affichait jamais pendant un combat.**
   `AnimatePresence mode="wait"` attendait la fin de sortie du bouton « Lancer
   la vague », qui ne se signalait pas : le bouton restait figé à sa place, avec
   son libellé d'avant la vague, et le panneau (monstres restants, pv du noyau)
   n'apparaissait pas. Corrigé en retirant `mode="wait"`. Le même code existait
   avant cette séance ; je n'ai **pas** pu prouver qu'il était déjà cassé (voir
   les impasses plus bas), donc ne pas noter ça comme une régression du sprint.
2. **Pendant une pose, toucher un bâtiment existant ouvrait sa fiche au lieu de
   poser.** Le capteur de pose est la surface de la planète, donc *sous* les
   bâtiments. Ça cassait aussi le déplacement, qui passe par le même mode :
   impossible de déplacer un bâtiment vers un emplacement voisin d'un autre.
   Corrigé en retirant le gestionnaire de touche des bâtiments pendant une pose
   — R3F ne lance de rayon que sur les objets qui en portent un.
3. **Le suivi de caméra était compté par image, pas par seconde** (`lerp(cible,
   0.05)`). À 60 images/s la caméra rattrape le héros en une seconde ; à 5
   images/s il lui faut douze secondes et le héros sort du cadre. Sur la cible
   du jeu — des téléphones — c'est exactement là que ça casse. `damp()` dans
   `scene/utils.ts` rend le même comportement à toute cadence ; appliqué aussi
   au lissage du héros, des villageois et des chasseurs.
4. **Le ralentissement du cryo ne redescendait jamais.** La tour posait
   `st.slow = Math.max(st.slow, …)` sans jamais remettre à zéro à
   l'expiration : un monstre sorti d'un cryo de rang 3 pour entrer dans un
   rang 1 restait gelé à 55 % au lieu de 35 %, pour toute la vague.
5. **« Complet » s'affichait alors qu'il restait à bâtir.** Poser les trois
   tourelles sans en construire aucune fermait la seule porte d'accès à leur
   fiche depuis la feuille de construction : un exemplaire posé mais pas
   encore bâti n'était compté nulle part.
6. **La carte de montée de niveau prenait tout l'écran en plein combat.** Les
   niveaux se gagnent surtout en tuant : la fanfare tombait pendant une vague,
   avalait les touches quatre secondes et faisait perdre. Elle se réduit à un
   bandeau tant qu'une vague est en cours.

### Vérifié

```
pnpm run typecheck                                   6 projets, aucune erreur
node tools/game-check/wave.mjs --check               les deux scénarios OK
cd artifacts/character-studio && studio selftest      5/5, 20 personnages
studio audit (kit)          0 quasi-doublon, registres 100 %, 0 avertissement
```

Captures ouvertes et regardées à chaque étape (village, arsenal, vague 9 et 11
en plein combat, tutoriel, feuille de construction, pose d'un deuxième
exemplaire, marche jusqu'au bord du plateau). Le placement d'un `tourelle#2` a
été joué de bout en bout dans un vrai navigateur : bouton « Placer » → mode de
pose → touche au sol → l'exemplaire apparaît dans `buildingPositions`.

`tools/game-check/shot.mjs` gagne deux scénarios pour ça : `--arsenal` (les
quatre tours, des exemplaires multiples, tout à haut niveau) et `--wave <n>`
(lance la vague n et capture en plein combat — le Spectre n'apparaît qu'à la
huitième, l'atteindre en jouant prendrait un quart d'heure de rendu logiciel).
`--village` n'est pas touché : c'est la référence des comparaisons.

Le magasin est désormais exposé sous `window.__villageStore`, sans quoi
`--wave` serait impossible : la sauvegarde ne porte que quatre champs.

### Essayé sans succès — ne pas refaire

- **Un anneau planétaire autour de la planète jouable.** Posé à plat dans le
  plan équatorial, il passe entièrement *sous* l'horizon et ne se voit pas.
  Redressé pour barrer le ciel, sa moitié proche passe entre la caméra et le
  village et repeint toute la carte en violet. Un anneau de ce diamètre a
  forcément un côté proche : **aucune inclinaison ne sauve les deux**. Remplacé
  par une géante gazeuse annelée très loin derrière, qui donne la même lecture
  sans jamais croiser la zone de jeu.
- **Des lunes sur orbites calculées.** Elles passent sous l'horizon la moitié
  du temps : le décor le plus visible du jeu était absent une capture sur deux.
  Posées à des points fixes du ciel lointain.
- **Placer les corps célestes en hauteur** (y positif). Ils sortent du champ.
  Depuis 14 unités au-dessus d'une sphère de rayon 26, l'horizon tombe à 49°
  sous l'horizontale et la caméra ne cadre qu'une bande de 30° juste au-dessus
  de lui : tout ce qui est plus haut que la caméra est hors cadre. Les corps du
  ciel doivent être **très loin et très bas** (y ≈ −20 à −35, z ≈ −50 à −90).
- **`useGameStore(nextObjective)` comme sélecteur.** `nextObjective` fabrique
  un objet neuf à chaque appel : le magasin croit que l'état change à chaque
  rendu et la boucle ne s'arrête jamais (React #185, écran d'erreur du jeu).
  S'abonner aux champs qui comptent et recalculer dans un `useMemo`.
- **Écrire « Repoussez la vague » dans l'objectif courant.** `wave.mjs` lit le
  texte de la page et conclut à une victoire dès qu'il y trouve « repouss » :
  le test annonçait une victoire à la seconde où la vague commençait. Le mot
  est réservé à la carte de victoire. **Vérifier ça avant d'ajouter du texte
  d'interface**, la même chose vaut pour « défaite ».
- **Reconstruire le dépôt à `HEAD` dans un worktree** pour savoir si le bug
  `mode="wait"` existait déjà. Le build du worktree rend une page blanche (le
  JS se charge, rien ne s'affiche, aucune erreur console au-delà de deux 404
  sur `/favicon.svg`). Pas creusé — hors sujet ce soir. Retenir que
  `pnpm --filter @workspace/3d-game run build` lancé à la main ne donne pas le
  même résultat que `tools/game-check/build.mjs`, qui pose `BASE_PATH` :
  **toujours passer par les outils pour construire ce qu'on va vérifier.**

### Ce que le compte-rendu d'Allonzo demandait et qui reste ouvert

- **Agrandir la zone jouable.** `WORLD_RADIUS` reste à 14. La planète change
  l'envergure *visuelle*, pas la surface de jeu. Agrandir vraiment veut dire
  reprendre la caméra, la vitesse du héros et la portée des tours ensemble —
  une séance entière.
- **Assouplir la grille de placement.** `BUILDING_MIN_GAP` (3.4) et les rayons
  de blocage du décor n'ont pas bougé.
- **Courbe de progression « quinze premières minutes ultra-rapides ».** Le jeu
  n'a aucun timer de construction, donc la moitié de la demande est déjà
  satisfaite ; les premiers niveaux de commandant tombent en moins d'une vague.
  Mais les coûts en boulons n'ont pas été revus.

### Où sont les nouveautés

| Fichier | Quoi |
|---|---|
| `src/game/enemies.ts` | Le bestiaire : profils, composition de vague, radar |
| `src/game/progress.ts` | Courbe d'XP, titres, récompenses de niveau |
| `src/game/objectives.ts` | L'objectif courant, une échelle de conditions |
| `src/game/effects.ts` | Pools d'éclats, chiffres flottants, secousse, combo |
| `src/game/sfx.ts` | Les sons, synthétisés — aucun fichier audio |
| `src/game/scene/Hunters.tsx` | Les Chasseurs spatiaux du Bar |
| `src/game/scene/CombatEffects.tsx` | Rend les éclats, publie la projection 3D→écran |
| `src/game/ui/BuildSheet.tsx` | La feuille de construction par rôle |
| `src/game/ui/{XpBar,WaveRadar,ComboMeter,LevelUp,Popups}.tsx` | Le HUD |

Les apparences des monstres et des chasseurs sont dans
`src/game/characters/defs.ts` (`enemyDefs`, `hunterDefs`), pas dans
`enemies.ts` : c'est ce qui permet au studio de personnages de les afficher et
de les retoucher. Le lien entre les deux moitiés est l'`id`. Le studio a été
mis à jour pour les inclure dans son kit.

---

## 2026-08-21 — Spike de la vague 3 lissé

**Choix de la tâche.** Le backlog n'a toujours qu'une seule entrée à case non
cochée, « équilibrage du combat » — écartée pour la même raison que les
séances précédentes (15/08, 18/08, 19/08, 20/08) : jugement « au ressenti »
sur un vrai appareil, hors de portée de cet agent. Le reste vient du bloc
FEEDBACK d'Allonzo du 15/08. Choisi le point §4 « Nerf de la difficulté
(Spike à la vague 3) » : c'est le plus précis et vérifiable des points
encore ouverts (contrairement à la grille de placement, la levée du cap
d'instance ou la courbe de pacing, qui demandent une conception plus large).
Lecture de `startWave` (`store.ts`) : `enemyCount = nextWave === 1 ? 3 :
nextWave === 2 ? 5 : 5 + nextWave * 2` — deux cas spéciaux pour les vagues 1
et 2, puis bascule sur une autre formule à partir de la vague 3, produisant
un bond de 5 à 11 monstres (+120 %) contre +2 pour toutes les autres
transitions. C'est exactement le « mur infranchissable » décrit dans le
FEEDBACK, et une formule pure sans dépendance de rendu — bien cadré pour une
séance.

**Fait**

- `store.ts` (`startWave`) : remplacé la formule à deux cas spéciaux par une
  seule formule linéaire, `enemyCount = 1 + nextWave * 2`. Elle retombe
  exactement sur les mêmes valeurs pour les vagues 1 et 2 (3 et 5, aucun
  changement de comportement en début de partie) et continue la même
  progression sans à-coup ensuite : 3, 5, 7, 9, 11… au lieu de 3, 5, 11, 13,
  15…
- `gamedata.ts` : mis à jour l'exemple de la vague 3 dans le commentaire de
  `coreBreachDamage` (11 → 7 monstres, 17 → 25 dgt par monstre) pour qu'il
  reste exact.
- Pas touché aux PV par monstre (`100 + nextWave * 20`, dans `startWave`) :
  cette formule est déjà linéaire, sans le même défaut.

**Vérifié comment**

- `pnpm install` (nécessaire, `node_modules` absent au démarrage de la
  séance) puis `pnpm run typecheck` (les 6 projets) : passe.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé.
- **Le nombre d'ennemis réel par vague, hors de portée des deux commandes
  standard** (aucune des deux ne rejoue plusieurs vagues d'affilée) : script
  Playwright ad hoc réutilisant `openGame`/`makeSave`/`serveStatic` de
  `lib.mjs`, avec une tourelle niveau 5. Ajout temporaire d'un
  `console.log('[wave-check] nextWave=… enemyCount=…')` dans `startWave`,
  capturé via `page.on('console')`, puis retiré avant ce commit. Vagues 1 et
  2 lancées et gagnées, vague 3 lancée : comptes observés **3, 5, 7** (au
  lieu de 3, 5, 11 avant ce changement) — confirme la formule en conditions
  réelles, pas seulement sur le papier. La vague 3 elle-même a ensuite été
  perdue avec cette tourelle (dégâts fixes à 50/s, cible unique, aucun
  scaling par niveau dans `gamedata.ts`) : attendu, hors du périmètre de
  cette tâche — c'est justement ce que couvre « équilibrage du combat »,
  laissée de côté plus haut.
- `node tools/game-check/shot.mjs --village --out /tmp/apres.png`, ouvert :
  aucune régression sur les six bâtiments (changement de formule pure, pas de
  rendu touché).
- `cd artifacts/character-studio && pnpm --silent run studio selftest` : 5/5
  — cette séance n'a pas touché `src/game/characters/`.

**Essayé sans succès, à ne pas refaire**

- *Détecter victoire/défaite dans le script de test en cherchant `/repouss/i`
  ou `/défaite/i` n'importe où sur la page, tout de suite après avoir cliqué
  « Lancer la vague »* — première version du script : le toast d'issue de la
  vague précédente reste affiché jusqu'à 7 s (auto-fermeture dans
  `WaveOutcome.tsx`) ou jusqu'à un clic dessus. En cliquant sur « Lancer la
  vague » dès la fin d'une vague puis en vérifiant immédiatement, le texte du
  **toast précédent** (encore visible) déclenchait une fausse détection de
  victoire, masquant que la vague suivante avait en fait été perdue. Corrigé
  en (1) attendant que le texte de vague/défaite disparaisse de la page avant
  de recliquer, et (2) en ciblant la victoire par numéro de vague précis
  (`Vague ${n} repoussée`, lu depuis le `console.log` de debug) plutôt qu'un
  motif générique. **Pour un test qui enchaîne plusieurs vagues, ne jamais
  vérifier l'issue tout de suite après avoir relancé : le toast précédent
  ment.**

**Reste ouvert**

- Voir `BACKLOG.md` : équilibrage du combat (nécessite un vrai appareil), et
  le reste du bloc FEEDBACK d'Allonzo du 15/08 — agrandissement de la carte,
  souplesse du placement, feedback visuel constructible/bloqué, levée du cap
  d'instance sur Hutte/Tourelle, spawn "Chasseurs spatiaux" du Bar
  (conception complète, pas une régression), courbe de pacing exponentielle.
- Le lissage de la vague 3 ne suffit pas à la rendre gagnable avec une seule
  tourelle (dégâts fixes 50/s, cible unique) — observé pendant la
  vérification ci-dessus. C'est un symptôme d'équilibrage combat au sens
  large (portée/dégâts du héros et de la tourelle), déjà identifié dans le
  backlog comme nécessitant un jugement sur un vrai appareil, pas une
  régression introduite par ce changement.

---

## 2026-08-20 — Production de Boulons de la Hutte doublée

**Choix de la tâche.** Le backlog n'a toujours qu'une seule entrée à case
non cochée, « équilibrage du combat » — écartée pour la même raison que les
séances du 15/08, 18/08 et 19/08 : elle exige un jugement « au ressenti » sur
un vrai appareil, hors de portée de cet agent. Le reste vient du bloc
FEEDBACK d'Allonzo du 15/08. Avant de choisir, exploré en détail le point
§2 « Correction de régression (Missing Scripts) : restaurer la logique du
bâtiment Bar (Spawner), Chasseurs spatiaux » qui se présentait comme le plus
proche d'un bug ponctuel (comme le Wave Manager du 19/08). Vérifié par
lecture du code (`gamedata.ts`, `Buildings.tsx`, `Villagers.tsx`,
`BuildingPopup.tsx`) et par l'historique git (`git log --all -S"Hunter"`,
`-S"Chasseur"`, `-S"Spawner"` sur `artifacts/3d-game/src`, tout confondu,
zéro résultat) : **ce n'est pas une régression**. Aucune trace, dans le code
actuel ni dans un seul commit passé, d'un système de spawn de "Chasseurs
spatiaux" par le Bar. Le Bar ne fait aujourd'hui que ce que les cinq autres
bâtiments font (faire apparaître un villageois décoratif à la construction,
`Villagers.tsx`). "Restaurer" est trompeur : il n'y a rien à restaurer, ce
serait concevoir de zéro un nouveau type d'entité combattante avec IA et
intégration au wave manager — hors de portée d'une seule séance. Écarté au
profit du point le plus précis et vérifiable du bloc §3 : « Buff du Tick Rate
de la ressource de base (Boulons) », qui pointe vers des constantes
numériques isolées et directement mesurables.

**Fait**

- `GameCanvas.tsx` (`PassiveTicker`) confirmé comme le seul point d'entrée de
  la production passive : toutes les 1000 ms, il additionne
  `BUILDINGS[id].levels[level-1].passive` pour chaque bâtiment construit et
  appelle `tickPassive`. Une seule source de vérité pour les valeurs
  (`gamedata.ts`), pas de duplication ailleurs dans le code (vérifié par
  recherche des littéraux `boulons: 2/3/4/7/12`).
- Doublé la production passive de Boulons de la Hutte à chaque niveau dans
  `gamedata.ts` : 2→4, 3→6, 4→8, 7→14, 12→24 par seconde. Coûts de
  construction/amélioration inchangés — seule la récolte passive est
  concernée, comme demandé (« La récolte est beaucoup trop lente, même avec
  une Hutte améliorée »). Les autres bâtiments (Ferme, Marché) et la récolte
  manuelle sur les nœuds de ressources (`ResourceNodes.tsx`) n'ont pas été
  touchés — la demande porte spécifiquement sur les Boulons.

**Vérifié comment**

- `pnpm install` (nécessaire, `node_modules` absent au démarrage de la
  séance) puis `pnpm run typecheck` (les 6 projets) : passe.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé, cette séance n'a pas touché au combat.
- `node tools/game-check/shot.mjs --village --out /tmp/apres.png`, ouvert :
  aucune régression sur les six bâtiments (changement de données pures, pas
  de rendu).
- **Le taux réel de production, hors de portée des deux commandes standard**
  (aucune des deux ne mesure l'écoulement des ressources dans le temps) :
  script Playwright ad hoc réutilisant `openGame`/`makeSave`/`serveStatic` de
  `lib.mjs`, sauvegarde avec Hutte niveau 1 et ressources à 0, lu le
  `localStorage` à 6 s puis 11 s après ouverture. Delta observé : 20 Boulons
  sur 5 s, soit 4/s — la nouvelle valeur exacte du niveau 1, contre 2/s
  attendu avant ce changement. Confirme que le doublement est bien
  fonctionnel, pas seulement une donnée modifiée sans effet.
- `cd artifacts/character-studio && pnpm --silent run studio selftest` : 5/5
  — cette séance n'a pas touché `src/game/characters/`.

**Essayé sans succès, à ne pas refaire**

- *Traiter la restauration du Bar comme une régression à corriger* — écarté
  avant toute modification de code, sur preuve négative (recherche git
  complète, aucune trace du terme "Hunter"/"Chasseur"/"Spawner" dans tout
  l'historique). **Avant de traiter un point du FEEDBACK comme une
  régression ("a perdu", "restaurer"), vérifier d'abord dans l'historique
  git que la fonctionnalité a réellement existé — le mot du FEEDBACK ne
  suffit pas comme preuve.**

**Reste ouvert**

- Voir `BACKLOG.md` : équilibrage du combat (nécessite un vrai appareil), et
  le reste du bloc FEEDBACK d'Allonzo du 15/08 — agrandissement de la carte,
  souplesse du placement, feedback visuel constructible/bloqué, levée du cap
  d'instance sur Hutte/Tourelle (pas un simple flag : `buildingLevels`/
  `buildingPositions` sont des `Record<string, ...>` indexés par id de
  bâtiment dans `store.ts` — lever le cap demande de refactoriser ce modèle
  en collections indexées par instance à travers `store.ts`, `Buildings.tsx`,
  `Villagers.tsx`, `BuildingPopup.tsx` et `world.ts`), spawn "Chasseurs
  spatiaux" du Bar (conception complète, pas une régression — voir
  ci-dessus), courbe de pacing exponentielle, et le nerf de la vague 3.
- Le doublement du taux de Boulons est un premier chiffre raisonnable, pas
  calibré finement : si Allonzo le trouve encore trop lent (ou trop rapide)
  une fois testé sur appareil, resserrer `gamedata.ts` directement, c'est la
  seule source de vérité.

---

## 2026-08-19 — Une défaite ne devait plus faire avancer l'index de vague

**Choix de la tâche.** Le backlog n'a qu'une entrée non cochée avec une case
à cocher, « équilibrage du combat » — écartée pour la même raison que le
15/08 et le 18/08 : elle exige un jugement « au ressenti » sur un vrai
appareil, hors de portée de cet agent, et aucun des deux outils
(`shot.mjs`/`wave.mjs`) ne mesure le ressenti ni les performances. Le reste
du backlog est le bloc FEEDBACK d'Allonzo du 15/08, non structuré en cases
mais explicitement « à faire ». Choisi le point le plus précis et le plus
vérifiable qu'il contient (§4, Wave Manager) : « le joueur ne doit pas
pouvoir passer à la vague suivante s'il perd ». C'est un vrai bug, pas un
réglage de ressenti, et directement testable avec le magasin et une capture
console — contrairement aux autres points du bloc (grid, instanciation
multiple, pacing économique) qui demandent un jugement de conception plus
large qu'une seule séance ne devrait pas trancher d'un coup.

**Fait**

- Confirmé en lisant `store.ts` : `startWave` calculait toujours
  `nextWave = state.waveNumber + 1`, y compris juste après une défaite (où
  `waveNumber` reste à la vague perdue, `damageCore` ne le touchant pas).
  Résultat : relancer une vague après une défaite faisait sauter directement
  à la vague suivante, plus difficile, au lieu de recommencer celle qui
  venait d'être perdue — exactement le bug décrit dans le FEEDBACK.
- Ajout d'un champ `waveFailed: boolean` au magasin (`GameState`,
  `initialGameState`). Mis à `true` dans la branche défaite de `damageCore`
  (à côté de `lastWaveOutcome: { type: 'defeat', ... }`), remis à `false` au
  début de chaque `startWave` réussi. `startWave` calcule maintenant
  `nextWave = state.waveFailed ? state.waveNumber : state.waveNumber + 1` :
  une défaite fait recommencer la même vague, une victoire fait avancer
  d'une.
- Pas touché à l'UI : le bouton « Lancer la vague » sert aussi bien au
  premier lancement qu'à la relance après défaite, pas besoin d'un libellé
  « Retry » séparé pour que le comportement soit correct (juste signalé dans
  le backlog comme piste facultative, pas fait cette séance).

**Vérifié comment**

- `pnpm run typecheck` (les 6 projets, après `pnpm install` — le
  `node_modules` racine n'existait pas au démarrage de la séance, comme à
  chaque séance jusqu'ici) : passe.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé, ces deux scénarios ne couvrent qu'une seule vague chacun
  et ne testent pas la relance après défaite.
- **La relance après défaite elle-même**, hors de ce que couvrent les deux
  commandes standard : script Playwright ad hoc réutilisant
  `openGame`/`makeSave`/`serveStatic` de `lib.mjs`. Partie sans tourelle,
  vague 1 lancée, défaite observée dans le texte de la page, toast fermé
  d'un clic, vague relancée. Texte HUD lu après la relance :
  **« WAVE 1 »** (majuscules dues au `text-transform` CSS du composant) —
  pas « WAVE 2 ». Confirme que l'index reste bloqué sur la vague perdue tant
  qu'elle n'est pas remportée.
- `node tools/game-check/shot.mjs --village --out /tmp/apres.png`, ouvert :
  aucune régression sur les six bâtiments (cette séance n'a touché ni au
  rendu ni au placement).
- `cd artifacts/character-studio && pnpm --silent run studio selftest` : 5/5
  — cette séance n'a pas touché `src/game/characters/`.

**Essayé sans succès, à ne pas refaire**

- Rien écarté cette séance : la cause était visible dès la lecture de
  `startWave`/`damageCore` (l'index n'était jamais retenu après une
  défaite), pas de fausse piste.

**Reste ouvert**

- Voir `BACKLOG.md` : équilibrage du combat (nécessite un vrai appareil), et
  le reste du bloc FEEDBACK d'Allonzo du 15/08 — agrandissement de la carte,
  souplesse du placement, feedback visuel constructible/bloqué, levée du cap
  d'instance sur Hutte/Tourelle, restauration du spawner du Bar
  (« Chasseurs spatiaux »), buff du tick de récolte, courbe de pacing
  exponentielle, et le nerf de la vague 3. Chacun mériterait sa propre
  séance : ce sont des changements de conception, pas des corrections de bug
  isolées comme celle d'aujourd'hui.
- Le bouton de lancement de vague ne distingue toujours pas visuellement un
  premier lancement d'une relance après défaite (même libellé « Lancer la
  vague »). Pas gênant pour la mécanique — corrigée cette séance — mais une
  séance future pourrait ajouter un libellé « Réessayer » si Allonzo le
  trouve plus clair.

---

## 2026-08-18 — Animation de mort des monstres

**Choix de la tâche.** La première entrée non cochée du backlog
(« équilibrage du combat ») exige explicitement un jugement « au ressenti »
sur un vrai appareil — hors de portée de cet agent, et `shot.mjs`/`wave.mjs`
ne mesurent ni le ressenti ni les performances (voir leur README). La
retoucher sans pouvoir la juger aurait reproduit exactement l'écueil que le
backlog signale déjà pour elle. Prise de la tâche suivante à la place :
l'animation de mort des monstres.

**Fait**

- Cause confirmée en lisant `Enemies.tsx` : `EnemyNode` a bien un mécanisme
  d'écrasement à la mort (`isDead`/`deathScale`/`deathSquash`, deux
  `useFrame` dédiés) — mais `damageEnemy` (`store.ts`) filtrait l'ennemi hors
  de `state.enemies` dès que ses pv touchaient 0, dans le même `set()`. Le
  composant se démontait donc avant que son propre `useFrame` d'animation
  n'ait eu une chance de tourner : le mécanisme existait, il n'était jamais
  atteint.
- `damageEnemy` (`store.ts`) ne filtre plus les ennemis à 0 pv hors du
  tableau : ils y restent, `EnemyNode` détecte `hp <= 0`, joue l'animation,
  puis se retire lui-même via `removeEnemy` (mécanisme déjà en place, jamais
  déclenché). Le calcul de `waveKills`/`waveActive` a été adapté pour ne plus
  dépendre du filtrage (`justKilled` détecté par transition individuelle,
  `waveActive = enemies.some(e => e.hp > 0)`) — sinon un cadavre qui traîne
  plusieurs frames aurait fait recompter un kill à chaque nouveau coup porté
  à un *autre* ennemi.
- `Hero.tsx` : la boucle de ciblage du héros ne sautait pas les ennemis à 0
  pv (`Buildings.tsx`/tourelle le faisait déjà, `if (enemy.hp <= 0) continue`
  — signe que ce cas était anticipé côté tourelle mais oublié côté héros).
  Sans ce saut, le héros aurait pu rester braqué sur un cadavre en train de
  s'écraser pendant qu'un monstre vivant approchait sans être inquiété.
  Ajouté le même garde-fou.

**Vérifié comment**

- `pnpm run typecheck` (les 6 projets, après `pnpm install` — le
  `node_modules` racine n'existait pas au démarrage de la séance) : passe.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé.
- `node tools/game-check/shot.mjs --village --out /tmp/apres-final.png`,
  ouvert : aucune régression sur les six bâtiments.
- **L'animation elle-même, observée indirectement** (le rendu logiciel est
  trop lent pour distinguer un écrasement de quelques frames à l'œil sur une
  simple capture) : deux `console.log` temporaires ajoutés dans
  `Enemies.tsx` — un au moment où `isDead` passe à vrai, un quand
  `deathScale` atteint 0 et que `removeEnemy` est enfin appelé — puis retirés
  avant ce commit. Script Playwright ad hoc (tourelle niveau 2, vague 1)
  capturant ces deux lignes via `page.on('console')` : les deux événements
  sont apparus séparés dans le temps pour chaque monstre tué (jusqu'à 5,3 s
  d'écart pour le premier, sous le rendu logiciel ralenti), preuve que le
  cadavre reste désormais dans le magasin le temps que l'animation tourne,
  au lieu de disparaître au même tick que le coup fatal.
- `cd artifacts/character-studio && pnpm --silent run studio selftest` : 5/5
  — cette séance n'a pas touché `src/game/characters/`.

**Essayé sans succès, à ne pas refaire**

- Rien écarté cette séance : le bug était bien identifié dès la lecture du
  code (mécanisme d'animation déjà écrit mais jamais atteint), pas de fausse
  piste.

**Reste ouvert**

- Voir `BACKLOG.md` : équilibrage du combat (nécessite un vrai appareil,
  hors de portée d'un agent), et le bloc FEEDBACK d'Allonzo du 15/08 (grid,
  instanciation multiple, pacing, vagues).
- La barre de vie flottante (`Html` dans `Enemies.tsx`) reste affichée à 0 %
  pendant l'écrasement (elle ne se cache que quand `hpPercent === 1`). Pas
  gênant à l'usage — une barre vide au-dessus d'un cadavre qui rétrécit reste
  lisible — mais une séance future pourrait la masquer explicitement dès
  `hp <= 0` si Allonzo la trouve distrayante.

---

## 2026-08-17 (bis) — Panneau de construction en français

**Constat de départ.** La branche `claude/bold-brown-hdelot` de la séance
précédente était déjà fusionnée dans `main` (identique à `origin/main`,
`ca56496`) : PR mergée par `auto-merge.yml`, comme prévu. Redémarrée depuis
`origin/main` avant de commencer, même nom de branche.

**Fait**

- Traduit tout le texte anglais de `BuildingPopup.tsx` (le seul fichier UI qui
  en contenait — vérifié par recherche sur tout `ui/`) : « Level » →
  « Niveau », « Current Production » → « Production actuelle », « Next Level
  Cost » → « Coût du niveau suivant », « New Yield: » → « Nouveau
  rendement : », « Build »/« Upgrade »/« Not enough resources » →
  « Construire »/« Améliorer »/« Ressources insuffisantes », « Maximum Level
  Reached » → « Niveau maximum atteint », la ligne de la tourelle et la
  mention de cadence de tir.
- Le niveau 0 affichait « — » dans la case production : `currentLevelData`
  est `null` avant construction, il n'y a rien à afficher. Corrigé en
  affichant le rendement de `nextLevelData` (celui du niveau 1) à la place,
  avec un intitulé qui change en conséquence : « Production actuelle » une
  fois construit, « Production une fois construit » avant.

**Vérifié comment**

- `pnpm run typecheck` (les 6 projets, après `pnpm install` — le
  `node_modules` racine n'existait pas au démarrage de la séance) : passe.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé, cette séance n'a pas touché au combat.
- `node tools/game-check/shot.mjs --village --out /tmp/apres.png`, ouvert :
  aucune régression sur les six bâtiments (le panneau ne s'ouvre pas depuis
  cette vue, donc pas de texte à y lire).
- **Popup ouvert et regardé**, hors des deux commandes standard (aucune des
  deux n'ouvre de panneau) : script Playwright ad hoc réutilisant
  `openGame`/`makeSave` de `lib.mjs`, sauvegarde avec la hutte au niveau 0 et
  la tourelle au niveau 2, clic sur les puces correspondantes. Capture de la
  hutte (niveau 0) : « Niveau 0 / 5 », « PRODUCTION UNE FOIS CONSTRUIT »,
  « +2 /sec », « COÛT DU NIVEAU SUIVANT », « NOUVEAU RENDEMENT : », bouton
  « CONSTRUIRE » — plus de « — ». Capture de la tourelle (niveau 2) :
  « PRODUCTION ACTUELLE », « Tire un rayon infligeant 50 dgt/sec », bouton
  « AMÉLIORER ». Aucun texte anglais restant sur les deux captures.
- `cd artifacts/character-studio && pnpm --silent run studio selftest` : 5/5
  — cette séance n'a pas touché `src/game/characters/`.

**Essayé sans succès, à ne pas refaire**

- Rien écarté cette séance : la tâche était un remplacement de texte direct,
  pas de fausse piste.

**Reste ouvert**

- Voir `BACKLOG.md` : équilibrage du combat, animation de mort des monstres,
  et le bloc FEEDBACK d'Allonzo du 15/08 (grid, instanciation multiple,
  pacing, vagues).
- **Observation, hors périmètre de cette tâche** : sur les deux captures du
  popup, une étiquette orange « Construire » (label 3D flottant au-dessus des
  bâtiments non construits, `Buildings.tsx` ligne ~196) déborde par-dessus le
  texte du panneau — problème de superposition/z-index entre le DOM 3D et le
  popup HTML, préexistant, sans lien avec la traduction. À regarder si
  Allonzo le juge gênant.

---

## 2026-08-17 — Déplacer un bâtiment déjà posé

**Constat de départ.** Comme la séance précédente, la copie locale de
`claude/bold-brown-e1q9lx` contenait déjà 10 commits **jamais poussés** — pas
de branche distante (`git ls-remote origin` ne la listait pas), et aucune PR
ouverte à son nom. `main` distant était toujours figé sur « Système de
reprise » (5b87e05) : ni le socle octogonal de la veille, ni `auto-merge.yml`
lui-même n'étaient jamais arrivés jusque-là. Ce push les livre enfin, avec le
travail de cette séance par-dessus.

**Fait**

- Bouton « déplacer » (icône flèches à 4 branches, nouvelle `MoveIcon` dans
  `ui/icons.tsx`) ajouté dans l'en-tête de `BuildingPopup.tsx`, à côté du
  bouton de fermeture. Appelle `startPlacing(selectedBuilding)`.
- Aucune autre modification nécessaire : le mode de placement
  (`PlacementController` dans `scene/Buildings.tsx`) excluait déjà le
  bâtiment en cours de placement de la liste des collisions
  (`.filter(([id]) => id !== placingBuilding)`), et `placeBuilding` ne touche
  pas `buildingLevels` — la mécanique de « déplacement » existait déjà
  dans le magasin, il manquait seulement l'affordance UI pour la déclencher
  sur un bâtiment déjà construit. Tap sur le sol → nouvelle position, niveau
  et production inchangés, panneau réouvert automatiquement sur le nouvel
  emplacement.

**Vérifié comment**

- `pnpm run typecheck` (les 6 projets) : passe.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé, cette séance n'a pas touché au combat.
- `node tools/game-check/shot.mjs --village --out /tmp/apres.png`, ouvert :
  aucune régression visuelle sur les six bâtiments à leurs positions fixes.
- **Test bout-en-bout du déplacement**, hors des deux commandes standard
  (celles-ci ne couvrent ni les popups ni les interactions de pointeur) :
  script Playwright ad hoc ouvrant le jeu avec la sauvegarde `--village`,
  cliquant la puce Hutte, puis le bouton déplacer, puis un point du sol —
  calculé à l'avance en rejouant en Node la même géométrie que
  `checkPlacement`/`buildScatter` (seed identique) et projeté à l'écran avec
  la caméra de `Camera.tsx` (`three.js` côté Node), pour taper un point
  garanti valide sans deviner à l'aveugle. Résultat lu directement dans le
  `localStorage` après coup : position de la hutte passée de `[-4,0,-3]` à
  `[-2.45,0,-8.74]` (le point calculé), niveau et popup rouverte inchangés.
  Capture d'écran du popup avant/après : même « Hutte, Level 2/5 ».
- `cd artifacts/character-studio && pnpm --silent run studio selftest` : 5/5
  — cette séance n'a pas touché `src/game/characters/`.

**Essayé sans succès, à ne pas refaire**

- *Cliquer un point du sol au hasard (ou à vue sur une capture d'écran) pour
  tester le déplacement* — deux premiers essais ont visé des points en
  réalité invalides (trop près d'un autre bâtiment ou de la lisière), donc le
  clic était silencieusement ignoré par `checkPlacement` : `placingBuilding`
  restait actif, la position ne changeait pas, et rien dans la console ne le
  signalait (comportement voulu du jeu, pas un bug). Le sol est une bande
  étroite entre `CORE_CLEAR_RADIUS` (4) et `WORLD_RADIUS - EDGE_MARGIN` (13),
  truffée d'arbres/rochers/buissons dispersés par seed — deviner un point
  valide à l'œil sur une capture n'est pas fiable. **Pour un test qui doit
  taper un point précis, calculer la validité en rejouant la géométrie du
  monde plutôt que de deviner.**

**Reste ouvert**

- Voir `BACKLOG.md` : panneau de construction en anglais, équilibrage du
  combat, animation de mort des monstres, et le bloc FEEDBACK d'Allonzo du
  15/08 (grid, instanciation multiple, pacing, vagues).
- Le bouton déplacer n'a pas de confirmation ni d'annonce distincte du
  placement initial (même bannière « Touchez le sol pour placer »). Pas gênant
  à l'usage, mais une séance future pourrait distinguer le libellé
  (« déplacer » vs « placer ») si Allonzo le juge utile.

---

## 2026-08-16 — Socle octogonal sous chaque bâtiment, et neuf commits orphelins récupérés

**Constat de départ.** La séance a démarré sur une copie locale de la branche
`claude/bold-brown-sxjf6j` qui contenait déjà 9 commits (toute la séance du
15/08 : lisibilité des bâtiments, mise en place de `auto-merge.yml`, et l'ajout
par Allonzo du bloc FEEDBACK dans `BACKLOG.md`) **jamais poussés** — la branche
distante n'existait pas (`git fetch` : `couldn't find remote ref`). `main`
était donc resté figé sur « Système de reprise » (5b87e05) : ni les corrections
de bâtiments, ni le workflow d'auto-fusion lui-même n'y étaient jamais arrivés.
Ce push (avec le travail de cette séance ajouté par-dessus) les livre enfin —
c'est justement `auto-merge.yml`, présent dans cette branche, qui va se
déclencher sur son propre push et fusionner tout ça dans `main`.

**Fait**

- Socle octogonal coloré ajouté sous les six bâtiments, dans `BuildingWrapper`
  (`artifacts/3d-game/src/game/scene/Buildings.tsx`) plutôt que bâtiment par
  bâtiment : un `ringGeometry` à 8 segments (rayon 1.05–1.3, dépasse du toit le
  plus large — celui de la hutte à 1.15), `meshBasicMaterial` non éclairé donc
  insensible au bloom et aux `pointLight` voisines. Il rejoint le groupe animé
  par le ressort d'apparition, donc apparaît avec le bâtiment.
- La tourelle avait déjà son propre socle (cylindre teinté, plus petit,
  plaqué sous le pod) : les deux coexistent sans conflit, l'anneau générique
  vient juste ajouter le même repère visuel que les cinq autres.

**Vérifié comment**

- `pnpm run typecheck` (les 6 projets) : passe.
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé, cette séance n'a pas touché au combat.
- `node tools/game-check/shot.mjs --village`, ouvert avant/après : les six
  bâtiments (hutte, ferme, bar, antenne, marché, tourelle) portent chacun un
  anneau coloré identifiable à leur base, visible depuis la caméra du jeu.
- `cd artifacts/character-studio && pnpm --silent run studio selftest` : 5/5 —
  cette séance n'a pas touché `src/game/characters/`.

**Essayé sans succès, à ne pas refaire**

- Rien écarté cette séance : la tâche était bien cadrée par le backlog (motif,
  fichier, rayon de référence), pas de fausse piste à signaler.

**Reste ouvert**

- Voir `BACKLOG.md` : panneau de construction en anglais, déplacement de
  bâtiment, équilibrage du combat, animation de mort des monstres, et le bloc
  FEEDBACK d'Allonzo du 15/08 (grid, instanciation multiple, pacing, vagues).

---

## 2026-08-15 (bis) — Réparation de la boucle de routine

**Le problème constaté.** Cinq séances de routine avaient tourné, toutes sur le
même item n°1 du backlog (bâtiments), chacune sur sa branche `claude/...`. Une
seule (celle de ce matin) avait été fusionnée dans `main` ; les quatre autres
étaient restées ouvertes. Cause : `ROUTINE.md` disait « commite sur `main` et
pousse », **ce qui est impossible** — l'environnement impose une branche à
part. L'agent poussait donc sa branche sans que rien ne la fusionne ; `main` ne
bougeait pas, et chaque séance repartait du même point et refaisait le même
travail.

**Corrigé.** Un workflow `auto-merge.yml` fusionne désormais toute PR
`claude/* → main` dès que typecheck et build passent, puis supprime la branche.
`ROUTINE.md` dit maintenant d'**ouvrir une PR**, pas de pousser sur `main`, et
insiste : le backlog coché et l'entrée de journal doivent être dans la PR,
sinon `main` ne les voit pas.

**Comparaison des cinq branches avant nettoyage** (via `shot.mjs --village`,
regardées) : `main` était la meilleure base (bug du blanc corrigé, toit hutte,
socle tourelle). La seule idée à sauver venait de `b1x6ih` — un socle octogonal
coloré sous *chaque* bâtiment, lisible même quand le toit crame. Portée dans le
backlog plutôt que fusionnée (conflits garantis, toutes touchent `Buildings.tsx`
depuis le même point). Les 5 branches supprimées, la PR #1 fermée.

**À ne pas refaire.** Ne jamais écrire dans une consigne de routine « pousse sur
`main` » : l'environnement l'interdit. Le seul chemin vers `main` est une PR
auto-fusionnée.

---

## 2026-08-15 — Bâtiments lisibles vus de dessus

**Fait**

- **Bug trouvé, pas seulement esthétique** : trois bâtiments sur six (ferme,
  marché, et le panneau « Construire » de la hutte) affichaient une plaque
  d'un blanc uni là où leur couleur aurait dû être — visible d'un coup d'œil
  sur `shot.mjs --village` une fois zoomé. Cause : `<RoundedBox>` de drei est
  lui-même un mesh complet ; imbriqué dans un `<mesh>` parent (comme
  `<mesh><RoundedBox .../><meshToonMaterial .../></mesh>`), le
  `meshToonMaterial` voisin s'accroche au *parent* (qui n'a pas de géométrie
  et ne s'affiche donc pas) et `RoundedBox` garde son matériau par défaut —
  blanc, plein cadre sous le bloom. Six occurrences dans `Buildings.tsx`,
  toutes corrigées : position/ombres portées directement par `<RoundedBox>`,
  matériau en enfant direct.
- **Toit de la hutte refait.** L'ancien profil `latheGeometry` (pointe →
  évasement → repli sous l'auvent) donnait un anneau creux vu de dessus : le
  repli a des normales tournées vers le bas, invisibles d'en haut, laissant
  voir les décorations et la base *à travers* le trou apparent. Remplacé par
  un `coneGeometry` plein (normales vers le haut sur toute la pente) + un
  anneau plat à la base en guise de faîtage. Silhouette de toit net, lisible,
  depuis la caméra du jeu.
- **Tourelle** : le pod ivoire et le canon (qui vit entièrement caché à
  l'intérieur du pod — sa propre sphère de 0.3 est plus petite que le pod de
  0.6, donc jamais visible) ne portaient aucune couleur identifiable vue de
  dessus, juste une bille pâle. Ajout d'un socle cylindrique plus large que le
  pod, coloré `props.color` : la tourelle a maintenant une identité visuelle
  stable quelle que soit la rotation du canon.
- Bar, ferme (dôme), antenne (roquette) n'ont pas été retouchés au-delà du bug
  RoundedBox : leur silhouette se lisait déjà correctement de dessus une fois
  colorée pour de vrai.

**Vérifié comment**

- `pnpm run typecheck` (les 6 projets).
- `node tools/game-check/wave.mjs --check` : défaite sans tourelle, victoire
  avec — inchangé, cette séance n'a touché ni au combat ni aux vagues.
- `node tools/game-check/shot.mjs --village`, ouvert et zoomé (crop + resize
  via un script Python ponctuel) : comparé avant/après pixel par pixel sur les
  zones blanches (`(255,255,255)` exact avant, couleurs correctes après) et à
  l'œil sur la silhouette de chaque bâtiment.
- `cd artifacts/character-studio && pnpm --silent run studio selftest` : 5/5,
  bien que cette séance n'ait pas touché `src/game/characters/`.

**Essayé sans succès, à ne pas refaire**

- *« Le blanc vient des `pointLight` d'accent trop proches des surfaces »* —
  plausible au premier regard (les lampes de ferme et marché sont à ~0.2-0.3
  unité des socles) et cohérent avec le fait qu'une séance précédente avait dû
  diviser par 3 l'intensité de la lampe du monticule de construction pour la
  même raison. J'ai divisé les intensités par ~3 (ferme 0.25→0.09, marché
  0.28→0.1), rebuild, recapture : **aucun changement de pixel, au poil près**.
  Ce n'était pas la lumière. La vraie cause était le bug `RoundedBox`/`mesh`
  ci-dessus — les intensités réduites sont restées dans le code, elles ne
  nuisent pas, mais ne sont pas ce qui a résolu le problème. **Avant de
  soupçonner l'éclairage sur une surface qui paraît blanche, vérifier d'abord
  que le matériau attendu est bien celui qui s'affiche** (composant qui
  s'auto-attache un enfant, prop mal nommée, etc.) — un delta de pixels avant/
  après est le test rapide qui tranche.

**Reste ouvert**

- La ferme est correcte mais son socle brun reste en grande partie caché sous
  la coupole vue de dessus — pas un bug, juste peu de choses à distinguer une
  fois qu'on la regarde d'en haut. Pas retouché : le socle **affiche** sa
  bonne couleur maintenant, c'était le seul problème réel.
- Le marché a toujours ses cageots à fruits sous forme de petites sphères
  posées dessus (pas d'éclat particulier vu de dessus) ; lisible mais pourrait
  être plus détaillé si une séance future veut pousser plus loin.
- Le bar et l'antenne n'ont pas été retouchés : leur lecture depuis la caméra
  du jeu était déjà correcte une fois zoomé sur la capture — pas de raison d'y
  toucher sans un problème concret observé.

---

## 2026-08-09 — Reprise du dépôt, jouabilité, lisibilité

**Fait**

- Le jeu et le studio de personnages réunis dans ce dépôt, historiques
  préservés. Le studio lit les personnages du jeu à la source, sans copie.
- Jeu publié sur GitHub Pages à chaque push, studio à côté sous `/studio/`.
  Installable depuis le navigateur du téléphone (manifeste web).
- **Les vagues étaient ingagnables par l'adversaire** : un monstre atteignant
  le noyau déclenchait la victoire, et 10 dégâts sur 100 rendaient les deux
  premières vagues mathématiquement sûres. Dégâts désormais proportionnels à la
  taille de la vague ; le héros peut attaquer, ce qu'il ne pouvait pas du tout.
- **Les bâtiments disparaissaient définitivement** sous 3,3 images/s :
  intégrateur de ressort divergent, échelle à `NaN`, mesh plus jamais dessiné.
  Pas de temps borné.
- Bâtiments agrandis d'un tiers, lampes ponctuelles divisées par trois — elles
  saturaient sous le bloom et effaçaient la forme qu'elles éclairaient.
- Population liée à la construction : un villageois au départ, un de plus par
  bâtiment bâti. Ils étaient huit avant la moindre hutte.
- Tutoriel réécrit pour dire *pourquoi*, pas seulement quoi.

**Vérifié comment**

- `node tools/game-check/wave.mjs --check` : passif sans tourelle → défaite,
  avec tourelle → victoire. C'est ce test qui a révélé le bug de victoire.
- `node tools/game-check/shot.mjs --village` : c'est en regardant l'image que
  les bâtiments invisibles, puis les lampes saturées, ont été trouvés.
- `pnpm run typecheck`, build du jeu et du studio, `studio selftest`.

**Essayé sans succès, à ne pas refaire**

- *« Le ressort des bâtiments diverge à cause d'un à-coup isolé »* — faux. Un
  pic unique, même de 5 s, se rattrape. C'est un ralentissement **soutenu**
  sous 3,3 images/s qui casse. Vérifié par simulation.
- *« Le héros ne tire pas »* — conclusion tirée de zéro barre de vie observée.
  C'était un artefact d'échantillonnage : à 1-2 images/s tout le combat tient
  en quatre images. Une sonde temporaire a montré 5 tirs et un monstre tué.
  **Ne jamais conclure d'une absence d'observation dans ce rendu lent.**
- *« La source de GitHub Pages était le problème »* — faux, et ça a coûté un
  aller-retour à Allonzo. Le message exact était lisible sur la page publique
  du run : `Branch "main" is not allowed to deploy to github-pages due to
  environment protection rules`. **Aller chercher le message avant de
  supposer.**

**Reste ouvert**

Voir `BACKLOG.md`. Le plus gros : les bâtiments sont dessinés de profil pour
une caméra qui les regarde de dessus.

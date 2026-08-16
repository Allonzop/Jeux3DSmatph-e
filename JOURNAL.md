# Journal des séances

Une entrée par séance, la plus récente en haut. L'agent écrit ici ; Allonzo n'a
rien à y faire.

Le but est qu'un agent qui reprend le projet sache en une lecture ce qui a été
tenté, ce qui a marché, et surtout **ce qui a été essayé sans succès** — pour
ne pas le refaire.

Format : ce qui a été fait, comment ça a été vérifié, ce qui reste ouvert.

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

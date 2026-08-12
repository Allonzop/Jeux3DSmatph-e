# Journal des séances

Une entrée par séance, la plus récente en haut. L'agent écrit ici ; Allonzo n'a
rien à y faire.

Le but est qu'un agent qui reprend le projet sache en une lecture ce qui a été
tenté, ce qui a marché, et surtout **ce qui a été essayé sans succès** — pour
ne pas le refaire.

Format : ce qui a été fait, comment ça a été vérifié, ce qui reste ouvert.

---

## 2026-08-12 — Bâtiments redessinés pour la vue de dessus

**Fait**

- `hutte` : le toit lathe à 32 segments, au profil recourbé vers l'intérieur,
  se lisait comme un anneau flou vu d'en haut. Remplacé par un cône à 7
  facettes (`coneGeometry`) — les arêtes entre pans sont visibles depuis la
  caméra plongeante — plus un petit faîtage sombre (icosaèdre) qui referme
  l'apex.
- `ferme` : dôme (verrière) réduit de 24×24 à 8×5 segments pour un aspect à
  panneaux facettés, cohérent avec le style bas-poly déjà utilisé pour les
  rochers/arbres (`icosahedronGeometry`) ailleurs dans la scène. Croix
  d'armature épaissie et assombrie (4 poutres au lieu de 2, plus foncées).
- `bar` : l'auvent festonné était plaqué sur la façade avant, en demi-tubes
  *verticaux* de hauteur 1.6 à peine inclinés — vu de dessus on ne voyait que
  leurs calottes rondes empilées, d'où le "rectangle blanc à rayures" observé
  en jeu. Remplacé par un parasol : cône à facettes posé sur le tonneau,
  bordé d'un anneau de bosses crème pour un bord festonné, anneau néon rendu
  à plat (halo) au lieu de face verticale.
- `marché` : même défaut que le bar — auvent en demi-cylindres verticaux,
  invisible d'en haut. Remplacé par un toit de tente à facettes porté par 4
  pieds visibles aux coins, bordé de rayures sombres/couleur alternées.
- Contraste mur/toit : le tonneau du bar utilisait `props.color` à la fois
  pour le corps et pour le nouveau parasol — les deux se fondaient en un seul
  blob rond vu de dessus. Corps repeint en bois neutre (`#8a6343`) ; c'est le
  contraste entre le mur et le toit, pas la couleur en elle-même, qui separe
  les deux formes d'en haut.
- `antenne` et `tourelle` laissés tels quels : la première se lit déjà comme
  une tour (la hauteur suffit sous cette caméra qui n'est pas verticale pure),
  la seconde comme un poste circulaire avec canon visible. Pas de silhouette
  ambiguë trouvée sur ces deux-là.

**Vérifié comment**

- `node tools/game-check/shot.mjs --village --wide` puis `--village` (cadre
  téléphone), avant/après comparés côte à côte. Zoomé chaque bâtiment avec un
  script `jimp-compact` ponctuel (déjà présent en dépendance transitive,
  aucun paquet ajouté) pour juger les détails à l'échelle où ils se voient
  vraiment en jeu.
- `pnpm run typecheck`, `node tools/game-check/wave.mjs --check` (passif →
  défaite, tourelle → victoire, inchangé), `studio selftest` (5/5, aucun
  fichier de `src/game/characters/` touché mais lancé par principe).
- `node tools/game-check/shot.mjs --empty` pour vérifier que l'état niveau 0
  (monticule + pancarte, code commun à tous les bâtiments) n'a pas régressé.

**Essayé sans succès, à ne pas refaire**

- *`flatShading` sur `meshToonMaterial` pour un rendu bas-poly plus net* —
  `AGENTS.md` l'interdisait déjà (« types TS incompatibles ») et le
  typecheck l'a confirmé : `Property 'flatShading' does not exist on type
  ...MeshToonMaterial...`. Retiré partout. Le facettage reste lisible sans
  ça : la géométrie à peu de segments donne une silhouette à arêtes droites
  vue du dessus, et le gradient toon fait le reste — `flatShading` n'était
  pas nécessaire au résultat, juste une tentation à ignorer la prochaine
  fois.
- *Espérer qu'une couleur plus contrastée corrige le blanchiment sous le
  bloom* — pas essayé pour de vrai, mais observé sur le socle brun (`#7a5c47`)
  de la ferme : il apparaît blanc/crème en jeu malgré son code couleur,
  probablement parce que sa luminance dépasse le seuil de bloom
  (`luminanceThreshold=0.45`) une fois éclairé. Ce n'est pas un artefact de ce
  travail — le socle n'a pas été touché — mais ça veut dire qu'une bonne part
  des surfaces plates et bien éclairées de ce jeu blanchiront quel que soit
  leur `color`, indépendamment de leur teinte réelle. Pour rendre une couleur
  lisible d'en haut, mieux vaut jouer sur la géométrie (arêtes, silhouette)
  et les accents sombres (rayures, armatures) que sur la teinte plate seule —
  c'est l'un et l'autre qui ont marché ici, la couleur plate seule non.

**Reste ouvert**

- Le socle de la ferme part en blanc sous le bloom (voir ci-dessus) — un
  futur ticket pourrait revoir `luminanceThreshold`/`intensity` du `Bloom`
  dans `GameCanvas.tsx`, mais c'est un réglage global qui touche tous les
  bâtiments et la scène entière, pas une correction locale.
- `antenne` et `tourelle` n'ont pas été retouchés : à re-regarder si Allonzo
  les trouve encore peu lisibles une fois le jeu vu sur un vrai téléphone.

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

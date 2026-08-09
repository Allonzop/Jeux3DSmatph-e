# Rapport final — limitations du kit rencontrées

> **Document historique.** Il décrit la construction du studio à l'époque où
> celui-ci vivait dans un dépôt séparé et embarquait `src/kit/`, copie figée du
> système de personnages du jeu. Depuis la réunion des deux projets dans ce
> dépôt, cette copie n'existe plus : le studio lit
> `artifacts/3d-game/src/game/characters/` à la source. Les limitations
> décrites ci-dessous restent valables — elles portent sur le code du kit
> lui-même, pas sur la façon dont le studio y accède. Lire `src/kit/` comme
> « le système de personnages du jeu ».

Conformément au PRD §2, aucun fichier de `src/kit/` n'a été modifié. Vérifié
deux fois — contre le zip livré, puis contre les sources du jeu elles-mêmes :

```
$ diff -r <zip livré>/characters src/kit
$ diff -r Game-Visual-Revamp/artifacts/3d-game/src/game/characters src/kit
$ git status --short src/kit      # aucune sortie
```

Les deux sont identiques au bit près : `src/kit/` est bien la copie conforme de
`src/game/characters/`, et les `KIT_VERSION` concordent (1.0.1 des deux côtés).
Les versions épinglées correspondent aussi à celles du jeu (`three` ^0.185,
`@react-three/fiber` ^9.6, `@react-three/drei` ^10.7).

Voici ce qui a gêné, et comment le studio s'en est arrangé de son côté.

---

## 1. `blinkOffset` est calculé mais jamais utilisé — tous les personnages clignent ensemble

**Le plus visible des points ci-dessous, et le seul qui ressemble à un bug.**

`ToonHumanoid.tsx` tire deux valeurs déterministes du seed :

```ts
const seeded = useMemo(() => {
  const rnd = mulberry32(r.seed);
  return {
    timeOffset: rnd() * 100,              // utilisé plus bas
    blinkOffset: rnd() * p.blinkInterval, // jamais lu
  };
}, [r.seed, p.blinkInterval]);
```

`timeOffset` désynchronise bien les cycles de marche, mais `blinkOffset` n'est
lu nulle part : `blinkTimer` part de `0` pour toutes les instances. Deux
personnages de même `personality` montés en même temps clignent donc en parfait
synchronisme — et `blinkInterval` ne dépend que de la personnalité.

En jeu, les personnages apparaissent progressivement, l'effet est discret. Dans
la grille du studio, où trente vignettes se montent d'un coup, trente paires
d'yeux se ferment exactement ensemble. C'est très perceptible et ça donne à tort
l'impression que les personnages sont « le même modèle recoloré ».

**Contournement :** aucun de propre. Le décalage devrait être ajouté à
l'initialisation de `blinkTimer`, à l'intérieur du rig ; rien dans l'API
publique ne permet de l'injecter depuis l'appelant. Le studio vit avec.

**Correctif suggéré côté jeu** (une ligne, dans `ToonHumanoid.tsx`) :

```ts
const blinkTimer = useRef(0);
// devient :
const blinkTimer = useRef(seeded.blinkOffset);
```

---

## 2. `BODY_DIMS` est privé — impossible de connaître la taille d'un personnage

`ToonHumanoid` « ne gère ni position ni rotation : c'est à l'appelant de placer
le groupe parent » (PRD §3). Mais la table `BODY_DIMS` qui donne les dimensions
de chaque `bodyType` n'est pas exportée, et il n'existe aucun accesseur du genre
`getCharacterHeight(def)`. L'appelant doit donc placer un personnage dont il
ignore la taille.

Le problème est réel : entre `scale` 0.5 et 1.5, `bodyType` `stocky` et `tall`,
et un `headwear` qui dépasse ou non, la hauteur varie du simple au triple, et le
point bas passe de −0.43 à −0.75 unité.

**Contournement :** `src/studio/three/CharacterView.tsx` mesure la boîte
englobante réelle du rig (`THREE.Box3.setFromObject`) après montage, puis décale
le groupe parent pour poser les pieds sur `y = 0` et renvoie la hauteur, qui sert
à cadrer la caméra.

Recopier une table `BODY_DIMS` côté studio aurait été plus simple, mais elle
aurait divergé silencieusement à la première mise à jour du kit. La mesure à
l'exécution suit le kit sans rien savoir de lui.

Une subtilité que cela impose : la mesure doit se faire sur une pose au repos,
sinon le rebond de la marche la fausse. `CharacterView` remonte donc le rig
(via `key`) quand la *silhouette* change — `bodyType`, `scale`, `headScale`,
`limbThickness`, accessoires — ce qui garantit que `useFrame` n'a pas encore
tourné au moment de mesurer. Les changements de couleur, de visage ou d'humeur
ne remontent rien.

---

## 3. `BodyType`, `EyeShape` et `MouthShape` ne sont pas énumérables à l'exécution

Le PRD §3 demande que les menus déroulants soient dérivés du kit plutôt
qu'écrits en dur. C'est possible pour :

- les quatre registres d'accessoires — ce sont des objets ;
- `personality` — `PERSONALITIES` est un `Record`.

Ce ne l'est pas pour `bodyType`, `eyeShape` et `mouth` : ce sont des types purs.
Les tables correspondantes (`BODY_DIMS`, `EYE_SCALES`) sont privées à
`ToonHumanoid.tsx`, et les formes de bouche sont écrites en JSX en dur.

**Contournement :** ce sont les trois seules listes que le studio énonce
lui-même, dans `src/studio/defaults.ts`. Pour qu'elles ne puissent pas dériver
en silence, elles passent par un `Record<Union, true>` :

```ts
const keysOf = <T extends string>(map: Record<T, true>) => Object.keys(map) as T[];
export const BODY_TYPES = keysOf<BodyType>({ slim: true, round: true, stocky: true, tall: true });
```

`Record<BodyType, true>` **exige** une clé par membre de l'union : si le kit
ajoute une variante, `pnpm run typecheck` échoue ici tant qu'elle n'est pas
ajoutée, au lieu de la laisser manquer discrètement dans le menu.

**Correctif suggéré côté jeu :** exporter `BODY_DIMS` et `EYE_SCALES`, ou de
simples tableaux `BODY_TYPES` / `EYE_SHAPES` / `MOUTH_SHAPES` depuis `types.ts`.
Les menus du studio s'y brancheraient comme sur les registres.

---

## 4. Les caches de matériaux ne sont jamais vidés

`shared.ts` met en cache un matériau par chaîne de couleur, sans éviction :

```ts
const toonMatCache = new Map<string, THREE.MeshToonMaterial>();
```

Le jeu a une quinzaine de personnages aux couleurs fixes : le cache plafonne à
quelques dizaines d'entrées. Un studio où l'on fait glisser un sélecteur de
couleur en crée une par valeur intermédiaire traversée, définitivement.

L'effet est modéré — la couleur est un *uniform*, elle ne provoque pas de
recompilation de shader, seuls des objets JS s'accumulent — mais il est
sans borne sur une longue session.

**Contournement :** `ColorField` (`src/studio/components/controls.tsx`) limite
les émissions à environ quinze par seconde, avec émission de la valeur finale au
relâchement. Le glissement reste fluide à l'œil et le cache croît de façon
bornée.

Même remarque pour `sharedGeom`, dont les clés de membres incluent
`limbThickness.toFixed(2)` : le pas des curseurs est fixé à `0.05` plutôt que
`0.01`, ce qui divise par cinq le nombre de géométries créées, pour une
précision qui reste bien au-delà du perceptible.

---

## 5. Le kit s'arrête au personnage : pas d'éclairage ni de post-traitement

**Résolu depuis, grâce aux sources du jeu (`Game-Visual-Revamp.zip`).** Cette
section documente ce qui manquait et ce que l'accès au jeu a corrigé — c'est la
limitation qui avait le plus d'impact.

Le PRD §4.2 demande un « éclairage cohérent avec celui du jeu » pour que « les
couleurs ne mentent pas ». Le kit contient le rig et le dégradé toon, mais rien
de la scène. Le studio a d'abord tourné sur une approximation neutre, et elle
était fausse sur deux points majeurs.

### 5a. Les lumières du jeu sont colorées

`GameCanvas.tsx` :

```jsx
<color attach="background" args={['#0d1117']} />
<ambientLight intensity={0.45} color="#b8c4ff" />                       {/* ambiante FROIDE */}
<directionalLight position={[10,20,10]} intensity={1.4} color="#fff2dd" {/* clé CHAUDE */}
                  castShadow shadow-mapSize={[1024,1024]} />
<pointLight position={[0,5,0]} intensity={0.3} color="#ffebc8" />
```

| | Approximation initiale | Jeu (réel) |
|---|---|---|
| Ambiante | 0.75, blanche | **0.45, `#b8c4ff` (bleutée)** |
| Clé | 2.2, blanche, `[3,6,4]` | **1.4, `#fff2dd` (chaude), `[10,20,10]`** |
| Troisième source | directionnelle 0.35 blanche | **pointLight 0.3 `#ffebc8`** |
| Fond | `#2a2d34` | **`#0d1117`** |

Une paire ambiante froide / clé chaude déplace *toutes* les teintes : c'était
exactement le « les couleurs mentent » que le PRD cherche à éviter. Les valeurs
sont désormais recopiées à l'identique dans `LIGHTING` (`three/Stage.tsx`).

### 5b. Le champ `glow` était illisible sans bloom

Plus grave, et invisible tant qu'on n'a pas le jeu : `GameCanvas.tsx` monte un
`<EffectComposer>` avec `Bloom luminanceThreshold={0.45} mipmapBlur
intensity={1.6}` et une `Vignette`. Or `glowMat` (`shared.ts`) produit un
matériau émissif dont **tout l'effet visuel vient du bloom**. Sans lui, régler
`glow` dans le studio revenait à régler à l'aveugle : on ne voyait qu'un aplat
de couleur, jamais le halo.

Le studio embarque donc `@react-three/postprocessing` aux mêmes réglages, dans
l'éditeur et la vue comparative, avec un interrupteur `bloom` — le bloom mange
du détail, on veut parfois juger une silhouette sans lui.

Rétrospectivement, la contrainte du PRD §5 « pas de `disableNormalPass` sur
`<EffectComposer>` » n'avait de sens que si le studio devait en monter un. La
note interne du jeu (`.agents/memory/r3f-game-perf.md`) le confirme : c'est un
piège que leurs sous-agents réintroduisent régulièrement. Le studio ne
l'utilise pas.

### 5c. Ce que le bloom ne peut pas reproduire

Le bloom et la vignette sont des effets **écran** : leur force apparente dépend
de la taille du sujet à l'image, pas de sa taille en unités monde.

`scene/Camera.tsx` place la caméra à `héros + (0, 14, 10)`, soit ≈ 17,2 unités,
avec le fov par défaut de R3F (75°) — le `<Canvas>` du jeu ne passe pas de
`camera`. La hauteur de monde visible est donc ≈ 26,4 unités, et un personnage
d'1,5 unité n'occupe que **~6 % de la hauteur de l'écran**. Dans l'éditeur du
studio il en occupe ~70 %, soit douze fois plus : à réglages *identiques*, un
halo discret en jeu devient énorme.

**Contournement :** un bouton « taille jeu » recule la caméra jusqu'à la
distance où le sujet occupe la même part d'écran qu'en jeu. Il sert autant à
juger le bloom qu'à répondre à une question de conception que le studio ne
posait pas avant : *cette silhouette se lit-elle à la taille où le joueur la
verra ?* À cette échelle le visage disparaît, seule la silhouette compte.

### 5d. Pas de post-traitement dans la grille

`<View>` peint chaque vignette au ciseau dans un canvas partagé, tandis
qu'`<EffectComposer>` reprend la boucle de rendu pour la cible entière : les
deux ne composent pas. La grille reste donc sans bloom. C'est un compromis
assumé — la grille sert à juger la variété des silhouettes, le rendu final se
juge dans l'éditeur.

**Correctif suggéré côté jeu :** exporter les constantes d'éclairage et de
post-traitement depuis le kit (un `SCENE_LIGHTING` / `SCENE_POST`), pour que le
studio les suive automatiquement au lieu d'en tenir une copie.

---

## 6. Observation hors studio : les personnages semblent enfoncés dans le sol

Ce point ne concerne pas le kit ni le studio, mais il est apparu en lisant les
sources du jeu et vaut d'être vérifié.

`ToonHumanoid` ne place pas le personnage — c'est l'appelant qui le fait
(PRD §3). Or côté jeu, les appelants le posent à `y = 0` sans compensation :

- `scene/Hero.tsx` : `<group ref={groupRef} position={[0, 0, 0]}>`, et
  `store.ts` initialise `heroPos: [0, 0, 0]`.
- `scene/Villagers.tsx` : `spawnFor()` renvoie `[x, 0, z]`.

Mais l'origine du rig est au *centre du corps*, pas aux pieds. En déroulant
`ToonHumanoid.tsx` pour le héros (`bodyType: 'round'`, `scale: 1`) :

```
groupe jambe      y = legY                    = -0.20
maille jambe      y += -legL × 0.75           = -0.32
bas de la capsule y -= legL/2 + legR          = -0.48
maille pied       y = -0.32 + (-legL × 0.75)  = -0.44
bas du pied       y -= footR × 0.8            = -0.52
```

Et `scene/Ground.tsx` place le plateau dans un groupe à `y = -0.5`, avec un
profil de lathe dont la face supérieure est à `+0.5` : **la surface au sol est
donc à `y = 0`**.

Si ce calcul est juste, le héros est enfoncé d'environ 0,52 unité — à peu près
un tiers de sa hauteur totale (~1,5), ce qui masquerait jambes et pieds. Et la
profondeur varie selon la morphologie : de −0,29 pour l'imp (`stocky`, scale
0,68) à −0,56 pour le villageois 4 (`tall`, scale 0,75). Les personnages ne
s'enfonceraient donc pas tous pareil.

Un indice va dans ce sens : `Hero.tsx` fait naître la poussière de pas à
`pos.y = -0.4`, soit nettement sous la surface du sol — une valeur choisie pour
retomber au niveau des pieds réels.

**À confirmer de votre côté** : c'est déduit du code, pas observé. J'ai voulu
lancer le build de production inclus dans le zip pour trancher, mais le
lancement d'un serveur local a été refusé dans cet environnement. Un coup d'œil
à votre jeu qui tourne suffira.

**Si c'est confirmé**, le correctif est celui que le studio applique déjà dans
`three/CharacterView.tsx` : mesurer la boîte englobante du rig et décaler le
groupe parent de `-box.min.y`. Une quinzaine de lignes, réutilisables telles
quelles côté jeu — c'est d'ailleurs pourquoi le studio ne recopie pas de table
`BODY_DIMS` (voir §2).

---

## 7. Points mineurs

- **Couleurs en dur hors palette.** Les sourcils (`#3d2b1f`), les bouches
  (`#aa6655`, `#7a3b3b`), les mains (`#ffffff`), les pieds (`#555555`), les
  cornes (`#f5f0e6`) et le dôme du casque (`#aaddff`) ne suivent pas la palette
  du personnage. Sur un personnage sombre, les mains blanches ressortent
  beaucoup. Ce n'est pas un bug — c'est un choix de style assumé du rig — mais
  cela veut dire que `primary` ne teinte pas *tout* le corps, et c'est visible
  au premier essai. Aucun contournement possible sans toucher au kit.
- **Clé de registre inconnue avalée en silence.** `headwearRegistry[clé]` rend
  `undefined`, que le JSX ignore : un `def` important un accessoire inexistant
  s'affiche sans erreur, simplement sans l'accessoire. Le studio valide donc les
  clés à l'import et affiche un avertissement nommant le champ fautif, plutôt
  que de laisser passer.
- **Style d'import React ancien.** Les fichiers `.tsx` du kit font
  `import React from 'react'` alors que la transformation JSX moderne ne l'exige
  plus, ce qui est incompatible avec `noUnusedLocals`. Plutôt que de retirer ces
  lignes, le kit est compilé comme un projet TypeScript séparé
  (`tsconfig.kit.json`) qui désactive cette seule règle ; le code du studio reste
  vérifié strictement. `pnpm run typecheck` construit les deux via `tsc -b`.

---

## Ce qui a bien fonctionné

À signaler aussi, parce que cela a directement porté le studio :

- `resolveDef` est exactement le bon point d'entrée. Toutes les valeurs par
  défaut du studio en sont dérivées — aucune n'est recopiée — ce qui rend la
  réduction des `def` à leurs champs non-défaut exacte par construction.
- Les registres typés rendent les menus d'accessoires entièrement automatiques :
  ajouter une coiffe au kit la fait apparaître dans le studio, et dans le
  générateur aléatoire, sans une ligne de code.
- Le partage des géométries et matériaux par `shared.ts` est ce qui permet
  d'afficher trente personnages dans une seule grille : les appels de dessin
  suivent le nombre de vignettes *visibles*, pas la taille de la bibliothèque
  (mesuré : ~15 appels par personnage affiché, 60 appels/frame avec 4 vignettes
  visibles sur 34 en bibliothèque).

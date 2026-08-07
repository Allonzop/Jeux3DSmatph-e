# Rapport final — limitations du kit rencontrées

Conformément au PRD §2, aucun fichier de `src/kit/` n'a été modifié. Vérifié :

```
$ diff -r <zip livré>/characters src/kit
$ git status --short src/kit      # aucune sortie
```

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
ajoute une variante, `npm run typecheck` échoue ici tant qu'elle n'est pas
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

## 5. Le kit s'arrête au personnage : pas d'éclairage de référence

Le PRD §4.2 demande un « éclairage cohérent avec celui du jeu » pour que « les
couleurs ne mentent pas ». Le kit contient le rig et le dégradé toon, mais rien
de la scène : ni intensités, ni positions de lumières.

**Contournement :** `src/studio/three/Stage.tsx` regroupe toutes les valeurs
d'éclairage dans une constante `LIGHTING` unique et commentée, plutôt que de les
éparpiller dans le JSX. C'est une approximation (ambiante douce + directionnelle
+ une seconde source très faible) : si le rendu du studio et celui du jeu
divergent en couleur, **c'est le premier endroit à corriger**, et un seul endroit.

**Correctif suggéré côté jeu :** exporter les constantes d'éclairage de la scène
dans le kit, ou y ajouter un composant `<CharacterPreviewLights />` que le studio
monterait tel quel.

---

## 6. Points mineurs

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
  vérifié strictement. `npm run typecheck` construit les deux via `tsc -b`.

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

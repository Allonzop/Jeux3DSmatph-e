# Regarder le jeu tourner

Ces outils rendent le jeu dans un vrai navigateur, sans écran. Ils existent
parce qu'un agent n'a pas d'yeux sur le jeu : sans eux, on modifie du code 3D
en espérant.

Chaque bug sérieux trouvé jusqu'ici l'a été avec l'un d'eux.

```bash
node tools/game-check/shot.mjs --village        # une image du village bâti
node tools/game-check/wave.mjs --check          # joue une vague, vérifie l'issue
```

Le build est fait automatiquement s'il est plus vieux que les sources.

## `shot.mjs` — voir

```bash
node tools/game-check/shot.mjs                       # partie courante, cadre téléphone
node tools/game-check/shot.mjs --village             # les six bâtiments construits
node tools/game-check/shot.mjs --empty               # partie neuve, tutoriel actif
node tools/game-check/shot.mjs --wide --out /tmp/x.png
```

`--wait <ms>` allonge l'attente avant la capture. Le défaut est 30 s, et ce
n'est pas de la prudence excessive : le rendu logiciel tourne à quelques images
par seconde, et l'apparition des bâtiments borne son pas de temps, donc elle
s'étire d'autant. Une capture trop tôt montre des bâtiments à moitié sortis de
terre — ça ressemble à un bug, ça n'en est pas un.

**Ouvrez l'image.** Une tâche visuelle qu'on n'a pas regardée n'est pas finie.

## `wave.mjs` — jouer

```bash
node tools/game-check/wave.mjs --check      # les deux scénarios, sort en 1 si l'un ment
node tools/game-check/wave.mjs              # sans tourelle
node tools/game-check/wave.mjs --tourelle   # avec
```

`--check` vérifie deux propriétés qui définissent le jeu :

| scénario | attendu |
|---|---|
| joueur passif, sans tourelle | **défaite** |
| tourelle construite | **victoire** |

La première a longtemps été fausse — on gagnait sans rien faire. Si elle
retombe, le jeu n'a plus d'enjeu. Lancez cette commande après toute
modification des vagues, du noyau, des monstres ou du héros.

## Ce qu'ils ne disent pas

Ils ne jugent pas si c'est beau, ni si c'est agréable à jouer. Ils rendent une
image et constatent une issue — le reste demande des yeux.

Ils ne mesurent pas non plus les performances : SwiftShader rastérise sur
processeur, quelques images par seconde ici ne présument rien d'un vrai
appareil.

## Notes techniques

**Chromium logiciel.** Sans `--use-angle=swiftshader
--enable-unsafe-swiftshader`, three.js échoue sur « Error creating WebGL
context ». La recette est dans `lib.mjs`.

**Playwright n'est pas une dépendance du dépôt.** Il est déjà présent dans les
environnements Claude Code, et l'ajouter imposerait le téléchargement d'un
navigateur à chaque installation. `lib.mjs` le cherche à plusieurs endroits.

**Le réseau externe est neutralisé.** Le jeu demande une police à Google
Fonts ; l'échec produisait une erreur console dont le message ne contient pas
l'URL, donc indistinguable d'une vraie erreur du jeu. Les requêtes externes
reçoivent une réponse vide.

**La sauvegarde est injectée avant le démarrage** (`addInitScript`). L'écrire
après le chargement ne marche pas : le magasin a déjà lu le localStorage.

**On teste le build, pas le serveur de développement** — c'est ce que le joueur
reçoit, et c'est le seul moyen d'attraper ce que seule la production casse.

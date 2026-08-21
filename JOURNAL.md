# Journal des séances

Une entrée par séance, la plus récente en haut. L'agent écrit ici ; Allonzo n'a
rien à y faire.

Le but est qu'un agent qui reprend le projet sache en une lecture ce qui a été
tenté, ce qui a marché, et surtout **ce qui a été essayé sans succès** — pour
ne pas le refaire.

Format : ce qui a été fait, comment ça a été vérifié, ce qui reste ouvert.

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

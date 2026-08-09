---
name: Captures d'écran WebGL en headless
description: La limitation venait de l'outil de capture de Replit, pas du rendu headless — Chromium + SwiftShader rend les scènes R3F correctement, recette vérifiée
---

# Corrigé — la limitation n'était pas celle qu'on croyait

Cette note disait auparavant : « le navigateur headless échoue avec
`THREE.WebGLRenderer: Error creating WebGL context`, ne pas réessayer les
captures pour les scènes 3D, demander à l'utilisateur de confirmer les
visuels. »

**C'était vrai du bac à sable Replit, pas du rendu headless en général.** Le
projet ayant quitté Replit pour Claude Code, la conclusion ne tient plus — et
la garder ferait renoncer un agent avant d'essayer.

## Ce qui marche

Chromium avec le rastériseur logiciel SwiftShader rend les scènes R3F du
projet, ombres et post-traitement compris :

```js
const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',   // indispensable sur Chromium récent
    '--no-sandbox',
  ],
});
```

Vérifié sur le rig `ToonHumanoid` avec l'éclairage et le bloom réels du jeu :
grille de 34 personnages animés, bloom sur les matériaux émissifs, ombres
portées, `EffectComposer`. Aucune erreur de contexte WebGL.

## Ce que ça coûte

SwiftShader rastérise sur CPU : le coût est dominé par le remplissage de
pixels, pas par les appels de dessin. Compter quelques images par seconde en
plein écran avec beaucoup de sujets. Sans importance pour une capture, mais ne
pas en tirer de conclusion sur les performances réelles — un vrai GPU n'a
aucun rapport.

## Limite honnête

C'est le *rig de personnages* qui a été vérifié, pas la scène complète du jeu
(sol en lathe, bâtiments, ennemis, étoiles). Le reste devrait suivre, mais
n'a pas été testé.

## Pourquoi c'est utile

Ça ouvre la boucle génération → rendu → observation : un agent produit des
`CharacterDef`, les rend en PNG, **regarde le résultat**, et itère. C'est le
seul moyen de juger l'esthétique, que l'analyse chiffrée du studio
(`studio audit`) ne peut pas remplacer — elle mesure des écarts entre données,
elle ne dit pas si un personnage est réussi.

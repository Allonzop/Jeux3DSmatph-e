# Character Studio

Outil local de création de personnages pour le jeu React Three Fiber. Il compose
des `CharacterDef`, les rend animés en direct avec le rig du jeu, en accumule une
bibliothèque, et exporte un lot JSON à destination de l'agent qui les intègre.

Le studio **n'est pas le jeu** : il ne s'y connecte pas, n'écrit rien dans son
dépôt, et ne contient aucune logique de gameplay.

---

## Installation et lancement

```bash
npm install
npm run dev      # http://localhost:5173
```

Aucun accès réseau n'est nécessaire à l'exécution : une fois les dépendances
installées, le studio fonctionne hors ligne.

```bash
npm run typecheck   # vérification TypeScript des deux projets
npm run build       # build de production dans dist/
```

---

## Le flux de travail

1. **Composer** — ouvrir un personnage, régler les curseurs et les menus ; le
   rendu suit à chaque changement. « Surprends-moi » propose une silhouette
   cohérente à laquelle on n'aurait pas pensé.
2. **Constituer la bibliothèque** — nommer, taguer, dupliquer ; la grille
   d'accueil rend tous les personnages animés côte à côte, c'est là qu'on juge
   la variété d'ensemble. La vue comparative sert à arbitrer entre 2 et 4
   variantes.
3. **Exporter le lot** — « exporter le lot » télécharge `characters-export.json`
   et affiche la note à transmettre à l'agent.

La bibliothèque est sauvegardée dans `localStorage` à chaque modification.
Le bouton « sauvegarder .json » en fait une copie de sécurité sur disque, que
l'on peut ensuite glisser-déposer sur la fenêtre pour la recharger.

---

## Mettre à jour le kit quand le jeu évolue

`src/kit/` est une copie conforme de `src/game/characters/` du jeu. **Aucun de
ses fichiers ne doit être modifié depuis le studio** : c'est cette identité qui
garantit que l'aperçu correspond au rendu en jeu.

Quand le système de personnages change côté jeu :

1. Côté **jeu**, incrémenter `KIT_VERSION` dans
   `src/game/characters/KIT_VERSION.ts` (semver : incrémenter à chaque
   changement du rig `ToonHumanoid`, des types `CharacterDef` / `PERSONALITIES`,
   ou des registres de pièces).
2. Recopier le dossier entier par-dessus celui du studio :

   ```bash
   rm -rf src/kit
   cp -r ../<jeu>/src/game/characters src/kit
   ```

3. Vérifier que les deux `KIT_VERSION` sont **identiques** — c'est ce que
   l'export inscrit dans `kitVersion`, et ce qui permet à l'agent de détecter un
   lot conçu avec une version différente de celle du jeu.
4. `npm run typecheck`.

Si le kit a gagné une valeur de `bodyType`, `eyeShape` ou `mouth`, le typecheck
échouera dans `src/studio/defaults.ts` — c'est voulu, voir `RAPPORT.md`. Les
accessoires, eux, apparaissent tout seuls : leurs menus sont dérivés des
registres.

---

## Structure

```
src/
  kit/                      le système de personnages du jeu — NE PAS MODIFIER
  studio/
    defaults.ts             valeurs par défaut dérivées du kit, réduction des defs
    store.ts                bibliothèque + persistance localStorage
    generate.ts             « Surprends-moi » : palettes harmonisées, archétypes
    exchange.ts             import / export / presse-papier
    three/
      CharacterView.tsx     ToonHumanoid posé au sol, mesuré à l'exécution
      Stage.tsx             éclairage, vitesse de lecture, sol, rotation
    components/             bibliothèque, éditeur, comparaison, contrôles
```

Deux projets TypeScript séparés (`tsconfig.kit.json`, `tsconfig.studio.json`) :
le code du studio est vérifié strictement, le kit sous ses propres règles, sans
qu'on ait à le retoucher. `npm run typecheck` construit les deux.

---

## Fidélité au rendu du jeu

L'éclairage et le post-traitement du studio sont recopiés à l'identique de
`GameCanvas.tsx` du jeu, et regroupés dans les constantes `LIGHTING` et `POST`
de `src/studio/three/Stage.tsx` — **si le jeu change son rendu, c'est là, et
nulle part ailleurs, qu'il faut le répercuter.**

Trois boutons de la barre de l'éditeur servent à juger cette fidélité :

- **`bloom`** — le bloom et la vignette du jeu. À laisser allumé pour régler le
  champ `glow` : c'est le bloom qui rend les parties émissives visibles, sans
  lui on règle à l'aveugle. À éteindre pour juger une silhouette au détail près.
- **`taille jeu`** — recule à la distance où le personnage occupe la même part
  d'écran qu'en jeu (~6 % de la hauteur). Le bloom étant un effet écran, sa
  force apparente dépend de cette taille ; c'est aussi le seul moyen de voir si
  une silhouette se lit à l'échelle où le joueur la verra.
- **`recadrer`** — revient au cadrage d'édition.

La grille de la bibliothèque n'a pas de post-traitement : `<View>` et
`<EffectComposer>` ne composent pas (détail dans `RAPPORT.md`).

---

## Format d'export

```json
{
  "kitVersion": "1.0.1",
  "exportedAt": "2026-08-07T10:00:00.000Z",
  "characters": [
    {
      "name": "Villageois champignon",
      "tags": ["villageois"],
      "def": { "id": "v9", "seed": 909, "primary": "#57cc99", "headwear": "mushroom" }
    }
  ]
}
```

- `kitVersion` est lu depuis `src/kit/KIT_VERSION.ts`, jamais écrit en dur.
- Les `def` ne contiennent **que les champs qui diffèrent du défaut** (comparaison
  via `resolveDef`), dans l'ordre canonique de `defs.ts`. Ils sont collables tels
  quels côté jeu.

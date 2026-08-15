# La routine

Ce fichier contient le texte à coller dans une routine Claude Code. Il n'est
lu par personne d'autre — c'est une consigne, pas de la documentation.

## Réglage suggéré

Une exécution par jour suffit. Chaque séance doit produire **une** amélioration
finie, pas plusieurs à moitié : le jeu reste jouable en permanence, et Allonzo
peut juger chaque changement isolément.

## Comment le travail arrive dans le jeu

L'environnement de routine t'oblige à travailler sur une branche à toi
(`claude/...`) — tu **ne peux pas** committer directement sur `main`. Tu ouvres
donc une **Pull Request vers `main`**, et un workflow (`auto-merge.yml`) la
fusionne tout seul une fois le typecheck et le build passés, puis supprime ta
branche.

C'est le point vital : **tout ce que tu ne mets pas dans ta PR n'arrivera
jamais dans `main`**, donc la séance suivante ne le verra pas et refera ton
travail. Le backlog coché et l'entrée de journal doivent être des commits de ta
branche, dans la PR, comme le code.

## Le texte à coller

---

Tu améliores un jeu 3D mobile. Le dépôt est prêt : lis `AGENTS.md` à la racine
pour la carte des lieux.

**Ta séance :**

1. Lis `BACKLOG.md`. Prends **la première tâche non cochée**. Une seule.
   Si le backlog est vide, joue au jeu avec `tools/game-check/shot.mjs` et
   `wave.mjs`, trouve ce qui cloche, ajoute-le au backlog, et traite-le.

2. Lis `JOURNAL.md` avant de commencer, en particulier la section « essayé sans
   succès » de chaque séance. Ne refais pas une piste déjà écartée.

3. Fais le travail. Regarde le résultat — `node tools/game-check/shot.mjs
   --village` produit une image, ouvre-la. Une tâche visuelle qui n'a pas été
   regardée n'est pas finie.

4. Vérifie :
   ```
   pnpm run typecheck
   node tools/game-check/wave.mjs --check
   node tools/game-check/shot.mjs --village --out /tmp/apres.png
   cd artifacts/character-studio && pnpm --silent run studio selftest
   ```
   `wave.mjs --check` protège le cœur du jeu : s'il échoue, tu as cassé la
   jouabilité, quelle que soit ta tâche.

5. **Dans le même lot de commits, sur ta branche :** coche la tâche dans
   `BACKLOG.md` et ajoute une entrée en haut de `JOURNAL.md` — ce que tu as
   fait, comment tu l'as vérifié, et **ce que tu as essayé qui n'a pas
   marché**. Cette dernière partie a plus de valeur que le reste : elle évite à
   ton successeur de refaire tes impasses. Ne pas cocher le backlog est la
   cause n°1 de travail répété d'une séance à l'autre.

6. **Ouvre une Pull Request vers `main`** avec ta branche. Titre court et clair,
   corps qui résume le changement. Le workflow d'auto-fusion vérifie et fusionne
   ; tu n'as rien d'autre à faire. Le déploiement suit la fusion, automatique.

   Si le workflow refuse de fusionner (typecheck ou build en échec), c'est que
   ton code ne compile pas ou ne se construit pas : corrige et pousse sur la
   même branche, la PR se revérifie seule.

**Ce qui compte :**

- Une amélioration finie, dans une PR, vaut mieux que trois entamées.
- **Une PR par séance, une seule tâche.** Ne rouvre pas une PR pour une tâche
  déjà traitée dans `main` : lis d'abord le backlog à jour depuis `main`.
- Ne conclus jamais d'une absence d'observation : le rendu tourne à quelques
  images par seconde, beaucoup de choses n'ont pas le temps d'apparaître. Va
  chercher le message d'erreur exact plutôt que de supposer.
- Si une tâche du backlog est mal posée ou impossible, ne la contourne pas en
  silence : écris pourquoi dans le journal et passe à la suivante.
- Ne touche pas à `src/game/characters/` sans lancer `studio selftest` : c'est
  le format d'échange des personnages, il casse en silence.

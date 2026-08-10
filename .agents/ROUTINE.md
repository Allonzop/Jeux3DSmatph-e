# La routine

Ce fichier contient le texte à coller dans une routine Claude Code. Il n'est
lu par personne d'autre — c'est une consigne, pas de la documentation.

## Réglage suggéré

Une exécution par jour suffit. Chaque séance doit produire **une** amélioration
finie et poussée, pas plusieurs à moitié : le jeu reste jouable en permanence,
et Allonzo peut juger chaque changement isolément.

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

5. Commite sur `main` et pousse. Le déploiement est automatique.

6. Coche la tâche dans `BACKLOG.md` et ajoute une entrée en haut de
   `JOURNAL.md` : ce que tu as fait, comment tu l'as vérifié, et **ce que tu as
   essayé qui n'a pas marché**. Cette dernière partie a plus de valeur que le
   reste — elle évite à ton successeur de refaire tes impasses.

**Ce qui compte :**

- Une amélioration finie et poussée vaut mieux que trois entamées.
- Ne conclus jamais d'une absence d'observation : le rendu tourne à quelques
  images par seconde, beaucoup de choses n'ont pas le temps d'apparaître. Va
  chercher le message d'erreur exact plutôt que de supposer.
- Si une tâche du backlog est mal posée ou impossible, ne la contourne pas en
  silence : écris pourquoi dans le journal et passe à la suivante.
- Ne touche pas à `src/game/characters/` sans lancer `studio selftest` : c'est
  le format d'échange des personnages, il casse en silence.

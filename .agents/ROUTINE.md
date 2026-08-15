# La routine

Ce fichier contient le texte à coller dans une routine Claude Code. Il n'est
lu par personne d'autre — c'est une consigne, pas de la documentation.

## Réglage suggéré

Une exécution par jour suffit. Chaque séance doit produire **une** amélioration
finie, pas plusieurs à moitié : le jeu reste jouable en permanence, et Allonzo
peut juger chaque changement isolément.

## Comment le travail arrive dans le jeu

L'environnement de routine t'oblige à travailler sur une branche à toi
(`claude/...`) — tu **ne peux pas** committer directement sur `main`, et tu
**n'as pas besoin d'ouvrir de Pull Request**. Tu pousses ta branche, et un
workflow (`auto-merge.yml`) la fusionne tout seul dans `main` dès que le
typecheck et le build passent, puis supprime ta branche. Ton travail s'arrête
au push.

C'est le point vital : **tout ce que tu ne commites pas sur ta branche
n'arrivera jamais dans `main`**, donc la séance suivante ne le verra pas et
refera ton travail. Le backlog coché et l'entrée de journal doivent être des
commits de ta branche, au même titre que le code.

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

6. **Commite sur ta branche `claude/*` et pousse.** N'ouvre pas de PR : le
   workflow d'auto-fusion vérifie (typecheck + build) et fusionne dans `main`
   tout seul, puis déclenche le déploiement. Ton travail s'arrête au push.

   Si la fusion échoue (typecheck ou build en échec), ta branche reste sans être
   fusionnée : corrige et re-pousse sur la même branche, ça se revérifie seul.

**Ce qui compte :**

- Une amélioration finie et poussée vaut mieux que trois entamées.
- **Une tâche par séance.** Lis d'abord le backlog à jour depuis `main` : ne
  refais pas une tâche déjà cochée.
- Ne conclus jamais d'une absence d'observation : le rendu tourne à quelques
  images par seconde, beaucoup de choses n'ont pas le temps d'apparaître. Va
  chercher le message d'erreur exact plutôt que de supposer.
- Si une tâche du backlog est mal posée ou impossible, ne la contourne pas en
  silence : écris pourquoi dans le journal et passe à la suivante.
- Ne touche pas à `src/game/characters/` sans lancer `studio selftest` : c'est
  le format d'échange des personnages, il casse en silence.

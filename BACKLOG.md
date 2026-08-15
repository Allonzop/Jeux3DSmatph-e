# Ce qu'il y a à faire

**C'est ici qu'Allonzo écrit.** Ce fichier est la seule entrée du projet : ce
qui n'y est pas ne sera pas fait.

Écrivez comme vous parlez, en français, sans vous soucier de la forme. « les
bâtiments sont moches » est une entrée parfaitement valable — l'agent ira
regarder et trouvera quoi faire. Pas besoin de savoir quel fichier est en
cause : c'est son travail.

Pour ajouter quelque chose depuis GitHub : ouvrir ce fichier, le crayon en haut
à droite, écrire, « Commit changes ». Rien d'autre à faire.

---

## À faire

Par ordre d'importance — l'agent prend celle du haut.

- [x] **Redessiner les bâtiments pour la vue de dessus.** Ils ont été dessinés
      de profil : portes, tabourets, cageots sont sur les façades, invisibles
      depuis la caméra qui les regarde d'en haut. Il leur faut des toits, des
      arêtes, une silhouette lisible à la verticale. C'est le plus gros
      chantier restant, et le plus visible. *(2026-08-15 : toit de la hutte
      refait, socle coloré ajouté à la tourelle, et surtout un bug qui rendait
      trois bâtiments sur six blancs et illisibles vu de dessus. Voir
      JOURNAL.md — il reste des tours d'amélioration possibles, notée en fin
      d'entrée.)*

- [ ] **Pouvoir déplacer un bâtiment déjà posé.** Une fois l'emplacement
      choisi, il est définitif — on ne peut plus que construire dessus. Il
      faudrait une action « déplacer » dans le panneau du bâtiment.

- [ ] **Le panneau de construction est en anglais.** `CURRENT PRODUCTION`,
      `NEXT LEVEL COST`, `NEW YIELD`, `BUILD`, `Level 0 / 4` — tout le reste du
      jeu est en français. Et au niveau 0 il affiche « — » au lieu de ce que le
      bâtiment rapporterait une fois construit, ce qui est justement
      l'information qui aide à décider.

- [ ] **Régler l'équilibrage du combat au ressenti.** Portée et dégâts du héros
      (`HERO_RANGE`, `HERO_DPS` dans `Hero.tsx`) sont un premier jet posé sans
      pouvoir juger : le rendu logiciel tourne à quelques images par seconde. À
      reprendre sur un vrai appareil.

- [ ] **Les monstres n'ont pas d'animation de mort.** `damageEnemy` les retire
      du magasin dès que leurs points de vie tombent à zéro, ce qui démonte le
      composant avant que son animation d'écrasement ait pu jouer.

## Fait

Voir `JOURNAL.md` — l'agent y consigne chaque séance.

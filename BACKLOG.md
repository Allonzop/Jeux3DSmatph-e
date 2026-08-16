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

- [x] **Un socle octogonal coloré sous chaque bâtiment.** *(2026-08-16 :
      anneau `ringGeometry` à 8 segments ajouté dans `BuildingWrapper`,
      généralisé aux six bâtiments. Voir JOURNAL.md.)*

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

Là c'est moi (Allonzo) qui écrit à la main j'ai fait une petit session de documentation pour répertorier les défauts du jeux. Mais en gros ça fait partie des tâches à faire.
### [FEEDBACK & REWORK] Équilibrage, Système de Construction et Game Loop, écrit le 15/08


🛠️ 1. Système de Construction & Level Design (Grid / Placement)
Agrandissement de la Map : Les dimensions actuelles de la carte (bounds) sont trop restrictives.
Action : Augmenter la taille globale de la zone jouable (playable_area).
Flexibilité du Grid Placement : Le placement des bâtiments est trop rigide.
Action : Revoir la taille des colliders des bâtiments ou subdiviser la taille des cellules de la grille pour permettre un placement plus fin et modulable.
Clarté de l'UX/UI sur la map : La lisibilité entre les éléments interactifs et le décor statique (props) est confuse. Il est difficile de savoir où l'on peut construire.
Action : Ajouter un feedback visuel clair (ex: shader de surbrillance/outline sur les objets interactifs). Implémenter un calque (layer/overlay) vert/rouge lors du drag & drop d'un bâtiment pour indiquer clairement les zones constructibles vs bloquées.

🏗️ 2. Gestion des Bâtiments (Instanciation & Régressions)
Levée de la limite d'instanciation : Actuellement, le joueur est bloqué à une seule instance par type de bâtiment (Hutte, Tourelle).
Action : Supprimer le cap global (max_instances = 1) sur ces bâtiments de base. Permettre la construction de multiples Tourelles et Huttes, en gérant le coût incrémental si nécessaire.
Correction de régression (Missing Scripts) : Certains bâtiments ont perdu leurs comportements/mécaniques spécifiques lors des dernières itérations.
Action : Restaurer la logique du bâtiment "Bar" (Spawner). Il doit à nouveau pouvoir générer/gérer les entités "Chasseurs spatiaux" (Space Hunters).

⚖️ 3. Game Economy & Pacing (Ressources & Progression)
Buff du Tick Rate de la ressource de base (Boulons) : La récolte est beaucoup trop lente, même avec une Hutte améliorée.
Action : Réduire le time_between_ticks ou augmenter le yield_amount de base pour la génération de boulons. La boucle économique de base doit être plus généreuse.
Refonte de la Time Curve (Pacing) : Le jeu manque de satisfaction immédiate. Le joueur attend trop longtemps au début.
Action : Implémenter une courbe de progression exponentielle pour les timers de construction/amélioration. Les 15 premières minutes de jeu doivent être ultra-rapides (timers très courts ou instantanés, beaucoup d'actions possibles) pour accrocher le joueur, avant de ralentir progressivement (comme le modèle de Clash of Clans).

⚔️ 4. Gestion et Équilibrage des Vagues (Wave Manager)
Logique de progression des vagues (Condition de victoire) : Le joueur ne doit pas pouvoir passer à la vague suivante s'il perd.
Action : Ajouter une logique de validation stricte dans le WaveManager. Bloquer l'incrémentation de l'index de la vague (wave_index) en cas de défaite. Si le joueur perd contre une vague spécifique, il doit rester sur cette même vague et la recommencer (bouton Retry) jusqu'à ce qu'il réussisse à la battre.
Nerf de la difficulté (Spike à la vague 3) : La troisième vague agit comme un mur infranchissable (softlock de progression).
Action : Revoir le fichier de configuration du WaveSpawner pour la Vague 3. Réduire les HP, les dégâts ou le nombre d'ennemis spawnés pour lisser la courbe de difficulté entre la Vague 2 et la Vague 4.
Instructions pour l'Agent IA : Merci d'analyser ces points, de proposer les modifications de code correspondantes (notamment sur les scripts de BuilderController, EconomyManager, WaveManager et les Prefabs associés) et d'ouvrir les Pull Requests nécessaires par feature.

## Fait

Voir `JOURNAL.md` — l'agent y consigne chaque séance.

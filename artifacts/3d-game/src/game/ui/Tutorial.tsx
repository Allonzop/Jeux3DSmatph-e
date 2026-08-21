import React, { useEffect, useState } from 'react';
import { useGameStore, TUTORIAL_DONE } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { sfx } from '../sfx';

/**
 * Le tutoriel, en petites bouchees.
 *
 * L'ancienne version tenait en cinq cartes, mais chacune etait un pave de
 * trois a quatre lignes : « les textes actuels sont de trop gros pavés », dit
 * le retour d'evaluation, « le joueur passe les dialogues sans lire ».
 *
 * Meme contenu, redecoupe en **treize cartes d'une phrase**. La regle qu'on
 * s'impose : un titre de trois mots, une phrase de dix mots au plus, une seule
 * idee. Ce qui ne rentre pas devient la carte suivante.
 *
 * Le decoupage est purement d'affichage. Le magasin garde ses cinq etapes
 * (`tutorialStep`) et ses quatre evenements declencheurs : les sauvegardes en
 * cours de tutoriel restent valides, et `TutorialHighlight` continue de
 * pointer la bonne cible. Les sous-cartes sont un etat local, remis a zero des
 * que l'etape du magasin change.
 */

type Card = {
  title: string;
  text: string;
  /** true = la carte attend l'action du joueur ; sinon un bouton « Suivant ». */
  waits?: boolean;
};

const CARDS: Card[][] = [
  // Etape 0 — se deplacer
  [
    { title: 'Bienvenue !', text: 'Vous commandez ce village spatial.' },
    { title: 'Le cristal', text: 'Ce gros cristal au centre, c’est votre vie.' },
    { title: 'S’il tombe…', text: 'Vous perdez la vague. Protégez-le.' },
    { title: 'À vous', text: 'Glissez le pouce sur l’écran pour marcher.', waits: true },
  ],
  // Etape 1 — recolter
  [
    { title: 'Les boulons', text: 'C’est la monnaie. Tout se paie avec.' },
    { title: 'Où en trouver', text: 'Dans les cristaux gris, là-bas.' },
    { title: 'Récoltez', text: 'Marchez dessus : ça se ramasse tout seul.', waits: true },
  ],
  // Etape 2 — batir
  [
    { title: 'La hutte', text: 'Elle fabrique des boulons pendant que vous jouez.' },
    { title: 'Choisissez-la', text: 'Touchez l’icône orange, tout en bas.' },
    { title: 'Posez-la', text: 'Touchez le sol vert, puis « Construire ».', waits: true },
  ],
  // Etape 3 — la vague
  [
    { title: 'Les monstres', text: 'Ils foncent droit sur le cristal.' },
    { title: 'Vous tirez seul', text: 'Approchez-vous : le héros vise le plus proche.' },
    { title: 'La règle', text: 'Plus de la moitié passe = cristal détruit.' },
    { title: 'Lancez !', text: 'Bouton orange, en bas à droite.', waits: true },
  ],
  // Etape 4 — c'est fini
  [
    { title: 'Bravo !', text: 'Le village est à vous, commandant.' },
    { title: 'La suite', text: 'Touchez un bâtiment pour voir ce qu’il fait.' },
  ],
];

export function Tutorial() {
  const step = useGameStore(state => state.tutorialStep);
  const skipTutorial = useGameStore(state => state.skipTutorial);
  const advanceTutorial = useGameStore(state => state.advanceTutorial);
  const [card, setCard] = useState(0);

  // Chaque etape du magasin repart de sa premiere carte.
  useEffect(() => { setCard(0); }, [step]);

  const cards = CARDS[step];

  // La derniere etape n'attend aucune action : elle defile puis se ferme.
  useEffect(() => {
    if (step !== TUTORIAL_DONE - 1 || !cards) return undefined;
    const t = setTimeout(() => {
      if (card < cards.length - 1) setCard((c) => c + 1);
      else advanceTutorial();
    }, 3200);
    return () => clearTimeout(t);
  }, [step, card, cards, advanceTutorial]);

  if (step >= TUTORIAL_DONE || !cards) return null;
  const def = cards[card];
  if (!def) return null;

  const isLastStep = step === TUTORIAL_DONE - 1;
  const next = () => {
    sfx.tap();
    if (card < cards.length - 1) setCard(card + 1);
  };

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2 w-[min(21rem,88vw)]"
      style={{ top: 'calc(6.4rem + var(--safe-top))' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${step}-${card}`}
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.18 }}
          className="w-full bg-[#1a1f35f2] backdrop-blur-md border border-amber-300/40 rounded-2xl px-4 py-3 shadow-[0_0_24px_rgba(245,158,11,0.28)]"
        >
          {/* Fil d'avancement : une barre par etape, remplie jusqu'a la courante.
              Le joueur voit combien il en reste — c'est ce qui evite le
              sentiment de tunnel sans fin qui pousse a tout passer. */}
          <div className="flex gap-1 mb-2">
            {CARDS.map((group, i) => (
              <div key={i} className="flex-1 h-[3px] rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-amber-300 rounded-full transition-all duration-300"
                  style={{
                    width: i < step ? '100%' : i === step ? `${((card + 1) / group.length) * 100}%` : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="text-amber-300 font-black uppercase tracking-wider text-[clamp(0.78rem,3.4vw,0.92rem)]">
            {def.title}
          </div>
          <p className="text-white text-[clamp(0.82rem,3.6vw,0.95rem)] leading-snug mt-0.5">
            {def.text}
          </p>

          {!def.waits && !isLastStep && (
            <button
              onClick={next}
              className="pointer-events-auto mt-2.5 w-full bg-amber-400 text-black font-black uppercase tracking-wider text-xs py-2 rounded-xl active:scale-[0.98] transition-transform shadow-[0_3px_0_#b45309]"
            >
              Suivant
            </button>
          )}
          {def.waits && (
            <div className="mt-2 flex items-center gap-1.5 text-amber-200/70 text-[0.68rem] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
              À vous de jouer
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {!isLastStep && (
        <button
          onClick={() => { sfx.tap(); skipTutorial(); }}
          className="pointer-events-auto text-white/45 hover:text-white text-[0.65rem] uppercase tracking-wider font-bold px-3 py-1 rounded-lg bg-black/40 border border-white/10"
        >
          Passer le tutoriel
        </button>
      )}
    </div>
  );
}

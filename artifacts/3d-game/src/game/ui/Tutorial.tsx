import React, { useEffect } from 'react';
import { useGameStore, TUTORIAL_DONE } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

type StepDef = { title: string; text: string };

const STEPS: StepDef[] = [
  { title: 'Bienvenue !', text: 'Glissez votre pouce sur l\u2019écran pour déplacer votre héros avec le joystick.' },
  { title: 'Récoltez !', text: 'Approchez-vous des boulons brillants (gris) pour les récolter automatiquement.' },
  { title: 'Construisez !', text: 'Touchez l\u2019icône de la Hutte en bas, choisissez un emplacement au sol, puis payez 50 boulons.' },
  { title: 'Défendez !', text: 'Lancez une vague, puis allez au contact : votre héros tire tout seul sur le monstre le plus proche. Chaque monstre qui atteint le cristal l\u2019entame \u2014 en laisser passer plus de la moiti\u00e9 le d\u00e9truit.' },
  { title: 'Tutoriel terminé !', text: 'Votre village est entre vos mains. Bonne chance, commandant !' },
];

export function Tutorial() {
  const step = useGameStore(state => state.tutorialStep);
  const skipTutorial = useGameStore(state => state.skipTutorial);
  const advanceTutorial = useGameStore(state => state.advanceTutorial);

  // The final "well done" card auto-dismisses.
  useEffect(() => {
    if (step === TUTORIAL_DONE - 1) {
      const t = setTimeout(() => advanceTutorial(), 4000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [step, advanceTutorial]);

  if (step >= TUTORIAL_DONE) return null;
  const def = STEPS[step];
  if (!def) return null;
  const isLast = step === TUTORIAL_DONE - 1;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-1.5 w-[min(22rem,88vw)]"
        style={{ top: 'calc(4.5rem + var(--safe-top))' }}
      >
        <div className="w-full bg-[#1a1f35e6] backdrop-blur-md border border-amber-300/30 rounded-2xl px-4 py-3 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-amber-300 font-bold uppercase tracking-wider text-[clamp(0.7rem,3vw,0.8rem)]">
              {def.title}
            </span>
            {!isLast && (
              <span className="text-white/40 text-[0.65rem] font-mono shrink-0">
                {step + 1}/4
              </span>
            )}
          </div>
          <p className="text-white/90 text-[clamp(0.75rem,3.2vw,0.875rem)] leading-snug mt-1">
            {def.text}
          </p>
        </div>
        {!isLast && (
          <button
            onClick={skipTutorial}
            className="pointer-events-auto text-white/50 hover:text-white text-xs uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg bg-black/40 border border-white/10"
          >
            Passer le tutoriel
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

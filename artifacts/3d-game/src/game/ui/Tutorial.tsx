import React, { useEffect } from 'react';
import { useGameStore, TUTORIAL_DONE } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

type StepDef = { title: string; text: string };

// Le tutoriel disait quoi faire, jamais pourquoi. On construisait une hutte
// sans savoir ce qu'elle apportait, et on lancait une vague sans savoir ce
// qu'on risquait. Chaque etape enonce desormais son enjeu.
const STEPS: StepDef[] = [
  {
    title: 'Bienvenue, commandant !',
    text: 'Ce cristal au centre est le c\u0153ur de votre village \u2014 s\u2019il tombe, vous perdez. Glissez votre pouce n\u2019importe o\u00f9 sur l\u2019\u00e9cran pour d\u00e9placer votre h\u00e9ros.',
  },
  {
    title: 'R\u00e9coltez des boulons',
    text: 'Approchez-vous des cristaux gris : la r\u00e9colte est automatique. Les boulons paient tout ce que vous b\u00e2tissez \u2014 c\u2019est votre seule monnaie au d\u00e9part.',
  },
  {
    title: 'B\u00e2tissez votre premi\u00e8re hutte',
    text: 'La hutte produit des boulons toute seule, en continu, m\u00eame quand vous ne jouez pas. C\u2019est ce qui vous \u00e9vite de tout r\u00e9colter \u00e0 la main \u2014 et un villageois vient s\u2019y installer. Touchez son ic\u00f4ne en bas, choisissez un emplacement, puis payez.',
  },
  {
    title: 'D\u00e9fendez le cristal',
    text: 'Les monstres foncent droit sur le cristal. Votre h\u00e9ros tire tout seul sur le plus proche : allez au-devant d\u2019eux plut\u00f4t que d\u2019attendre. En laisser passer plus de la moiti\u00e9 d\u00e9truit le cristal et vous co\u00fbte des ressources.',
  },
  {
    title: 'Le village est \u00e0 vous',
    text: 'Chaque b\u00e2timent produit une ressource et fait venir un habitant ; la tourelle, elle, tire sur les monstres. Plus vous b\u00e2tissez, plus les vagues rapportent. Bonne chance !',
  },
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

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { comboAt } from '../effects';

/**
 * Le compteur d'enchainement.
 *
 * Le compteur lui-meme vit hors de React (`effects.ts`), ecrit par la boucle de
 * combat. Ce composant l'echantillonne dix fois par seconde : assez pour que le
 * chiffre paraisse instantane, assez peu pour ne pas re-rendre l'interface a
 * chaque image.
 *
 * L'horloge de la boucle 3D est celle de `THREE.Clock`, qui demarre au montage
 * du canvas — d'ou le compteur de temps local plutot que `performance.now()`.
 */
export function ComboMeter() {
  const [count, setCount] = useState(0);
  const elapsed = useRef(0);

  useEffect(() => {
    const started = performance.now();
    const id = setInterval(() => {
      elapsed.current = (performance.now() - started) / 1000;
      setCount(comboAt(elapsed.current));
    }, 100);
    return () => clearInterval(id);
  }, []);

  const visible = count >= 2;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="combo"
          initial={{ opacity: 0, scale: 0.6, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.7 }}
          className="pointer-events-none flex flex-col items-end pr-0.5 max-w-full"
        >
          <motion.span
            key={count}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 12 }}
            className="font-black leading-none whitespace-nowrap drop-shadow-[0_0_16px_rgba(255,210,76,0.85)]"
            style={{
              // Plafond baisse a 2.2rem : a 3rem, le compteur et son libelle
              // depassaient du cadre sur un ecran large et se coupaient net.
              fontSize: `clamp(1.4rem, ${4 + Math.min(count, 10) * 0.3}vw, 2.2rem)`,
              color: count >= 8 ? '#ff7b00' : count >= 5 ? '#ffd24c' : '#ffffff',
            }}
          >
            ×{count}
          </motion.span>
          <span className="text-amber-200/80 text-[0.58rem] font-black uppercase tracking-[0.15em] whitespace-nowrap">
            enchaînement
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

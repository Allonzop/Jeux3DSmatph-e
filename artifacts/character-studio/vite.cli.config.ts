import { defineConfig } from 'vite';

/**
 * Build de la surface sans interface.
 *
 * Node ne sait pas exécuter les `.ts` du studio directement : le kit importe
 * ses modules sans extension (`from './types'`), ce que la résolution ESM de
 * Node refuse — et le kit ne doit pas être modifié (PRD §2). On passe donc par
 * Vite, déjà présent, pour produire un unique `.mjs`. Aucune dépendance
 * supplémentaire.
 */
export default defineConfig({
  build: {
    ssr: true,
    target: 'node20',
    outDir: 'dist-cli',
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: 'src/cli/studio.ts',
      output: { entryFileNames: 'studio.mjs', format: 'es' },
    },
  },
});

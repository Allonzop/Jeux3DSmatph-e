import { fileURLToPath, URL } from 'node:url';
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
  resolve: {
  /**
   * Le studio importe le rig du jeu, qui vit dans un autre paquet de l'espace
   * de travail et resout donc ses propres `three` / `@react-three/*` depuis
   * SON node_modules. Sans deduplication, un meme bundle contiendrait deux
   * copies : le `<Canvas>` du studio et le `useFrame` de ToonHumanoid
   * appartiendraient a deux instances de fiber differentes, et le
   * reconciliateur R3F ne les relierait pas. Le catalogue garantit une seule
   * version, ceci garantit un seul exemplaire.
   */
  dedupe: [
    'three',
    '@react-three/fiber',
    '@react-three/drei',
    '@react-three/postprocessing',
    'react',
    'react-dom',
  ],
    alias: {
      '@game/characters': fileURLToPath(
        new URL('../3d-game/src/game/characters', import.meta.url),
      ),
    },
  },
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

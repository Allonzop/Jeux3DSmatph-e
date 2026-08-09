import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Studio local uniquement : aucun accès réseau à l'exécution.
 *
 * `@game/characters/*` pointe sur le système de personnages du jeu, lu à sa
 * source. Le studio n'en garde aucune copie : ce qu'il affiche est
 * littéralement le code que le jeu exécute.
 */
export default defineConfig({
  plugins: [react()],
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
  server: { open: false },
});

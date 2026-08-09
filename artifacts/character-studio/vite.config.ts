import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Studio local uniquement : aucun accès réseau à l'exécution.
export default defineConfig({
  plugins: [react()],
  server: { open: false },
});

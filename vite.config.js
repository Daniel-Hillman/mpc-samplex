import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// On GitHub Pages the app is served from https://<user>.github.io/mpc-studio/,
// so production assets need that base path. Dev/preview stay at root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/mpc-studio/' : '/',
  plugins: [react()],
  server: {
    host: true, // expose on LAN so the MPC laptop / phone can reach it
    port: 5173,
  },
}));

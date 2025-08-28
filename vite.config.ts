import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base path for GitHub Pages project site: https://<user>.github.io/puzzle/
  // Ensures built asset URLs resolve correctly under "/puzzle/".
  base: '/puzzle/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'ES2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        spriteTest: resolve(__dirname, 'sprite-test.html'),
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});

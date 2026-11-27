import { defineConfig } from 'vite';

export default defineConfig({
  base: '/tycoon-pizzeria/', // Rutas relativas para GitHub Pages
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    // Configuración de Vitest
    include: ['src/tests/**/*.test.ts'],
    globals: true,
  },
});


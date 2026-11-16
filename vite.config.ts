import { defineConfig } from 'vite';

// base './' — działa niezależnie od nazwy repo w adresie GitHub Pages
export default defineConfig({
  base: './',
  build: { target: 'es2020' },
});

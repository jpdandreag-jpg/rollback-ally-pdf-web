import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  publicDir: 'public',
  build: { outDir: 'dist', assetsInlineLimit: 0, target: 'es2022' },
  server: { port: 5173, strictPort: true },
});

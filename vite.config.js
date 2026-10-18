import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 800,
  },
  // GLB files in /assets/models/ are served as-is by the dev server
  // (they live in the project root, not a publicDir)
  assetsInclude: ['**/*.glb', '**/*.gltf'],
});

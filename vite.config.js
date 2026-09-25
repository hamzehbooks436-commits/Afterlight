import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { strictPort: true },
  build: { rollupOptions: { output: { manualChunks: { three: ['three'], gltf: ['three/addons/loaders/GLTFLoader.js'] } } } },
});

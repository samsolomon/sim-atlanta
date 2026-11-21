import { defineConfig } from 'vite';

// In dev, /api/* goes to the Cloudflare Worker running under `wrangler dev` (port 8787).
export default defineConfig({
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: { input: { main: 'index.html', vignette: 'vignette.html', artmap: 'artmap.html' } },
  },
});

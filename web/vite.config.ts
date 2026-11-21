import { existsSync } from 'node:fs';
import { defineConfig } from 'vite';

// In dev, /api/* goes to the Cloudflare Worker running under wrangler dev.
export default defineConfig(({ command }) => {
  const input: Record<string, string> = { main: 'index.html', vignette: 'vignette.html' };
  if (existsSync(new URL('./public/art/layers.json', import.meta.url))) {
    input.artmap = 'artmap.html';
  } else if (command === 'build') {
    console.warn('Building without /artmap.html. Deploying this build removes any previously hosted art map. To include it, copy the Studio bake to web/public/art/ before building.');
  }
  return {
    server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1200,
      rollupOptions: { input },
    },
  };
});

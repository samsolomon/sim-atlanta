import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// In dev, /api/* goes to the Cloudflare Worker running under wrangler dev.
export default defineConfig(({ command }) => {
  const input: Record<string, string> = { main: 'index.html', vignette: 'vignette.html', models: 'models.html', about: 'about.html' };
  if (existsSync(new URL('./public/art/layers.json', import.meta.url))) {
    input.artmap = 'artmap.html';
  } else if (command === 'build') {
    console.warn('Building without /artmap.html. Deploying this build removes any previously hosted art map. To include it, copy the Studio bake to web/public/art/ before building.');
  }
  return {
    // Rust still bakes the legacy meshes locally. City and East Portal only consume the
    // profile manifest; don't copy unused binary meshes into the deployed static assets.
    plugins: [{
      name: 'omit-retired-scene-meshes',
      apply: 'build',
      closeBundle() {
        for (const file of ['buildings.bin', 'roads.bin', 'track.bin']) {
          rmSync(resolve('dist/data/scene/downtown', file), { force: true });
        }
      },
    }],
    server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1200,
      rollupOptions: { input },
    },
  };
});

/// <reference types="vitest/config" />
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { groundBakeCodePlugin } from './ground-bake-code';

// In dev, /api/* goes to the Cloudflare Worker running under wrangler dev.
export default defineConfig(({ command }) => {
  const input: Record<string, string> = { main: 'index.html', vignette: 'vignette.html', models: 'models.html', about: 'about.html' };
  if (existsSync(new URL('./public/data/scene/square-board/north-band/ground.json', import.meta.url))) {
    input.squareBoard = 'square-board.html';
  }
  if (existsSync(new URL('./public/art/layers.json', import.meta.url))) {
    input.artmap = 'artmap.html';
  } else if (command === 'build') {
    console.warn('Building without /artmap.html. Deploying this build removes any previously hosted art map. To include it, copy the Studio bake to web/public/art/ before building.');
  }
  return {
    // Rust still bakes the legacy meshes locally. City and East Portal only consume the
    // profile manifest; don't copy unused binary meshes into the deployed static assets.
    plugins: [groundBakeCodePlugin(), {
      name: 'omit-retired-scene-meshes',
      apply: 'build',
      closeBundle() {
        for (const file of ['buildings.bin', 'roads.bin', 'track.bin']) {
          rmSync(resolve('dist/data/scene/downtown', file), { force: true });
        }
        // Baked ground is parked (terrain/ground-bake.ts bakeOn): pnpm data:bake still stages
        // the files for tests and ?bake=1 in dev, but visitors no longer download them.
        const rows = resolve('dist/data/scene/square-board');
        if (existsSync(rows)) for (const row of readdirSync(rows)) {
          for (const file of existsSync(resolve(rows, row)) ? readdirSync(resolve(rows, row)) : []) {
            if (/^ground-bake-.*\.bin(\.gz)?$/.test(file)) rmSync(resolve(rows, row, file), { force: true });
          }
        }
      },
    }],
    server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
    // Several agents run the suite at once on the shared Studio (load averages of 40+). Vitest's
    // default of one thread per core then starves its own worker RPC ("Timeout calling
    // onTaskUpdate") even though every test passes. Forked workers, capped, finish cleanly;
    // VITEST_MAX_WORKERS changes the cap.
    test: {
      pool: 'forks', maxWorkers: Number(process.env.VITEST_MAX_WORKERS) || 4,
      setupFiles: ['./test-setup.ts'],
      // Slower machines (CI) raise the per-test limit; unset, Vitest's 5 s stands.
      ...(process.env.VITEST_TEST_TIMEOUT ? { testTimeout: Number(process.env.VITEST_TEST_TIMEOUT) } : {}),
    },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1200,
      rollupOptions: { input },
    },
  };
});

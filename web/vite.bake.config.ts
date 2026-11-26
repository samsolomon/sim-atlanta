/**
 * `pnpm data:bake`: runs web/scripts/*.bake.ts under vitest, which already runs City's TypeScript
 * builders in Node (three.js headless, worker and JSON imports resolved as the site resolves them).
 */
import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vite.config';

export default defineConfig(env => mergeConfig(base(env), { test: { include: ['scripts/*.bake.ts'], testTimeout: 600_000 } }));

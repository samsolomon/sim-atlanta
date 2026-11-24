#!/usr/bin/env node
/**
 * Snapshot the staged downtown buildings (web/public/data/scene/downtown/vignette.json, written by
 * `pnpm data`) into web/src/city/fixtures/downtown-buildings.json, which skin-footprint.test.ts
 * runs the city.ts landmark builders over. The ground is committed already, at
 * pipeline/prototypes/downtown-ground. Re-run after a pipeline change that moves downtown footprints:
 *
 *   node scripts/downtown-buildings-fixture.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const source = new URL('../web/public/data/scene/downtown/vignette.json', import.meta.url);
const out = new URL('../web/src/city/fixtures/downtown-buildings.json', import.meta.url);
const { buildings } = JSON.parse(readFileSync(source, 'utf8'));
writeFileSync(out, JSON.stringify({ source: 'web/public/data/scene/downtown/vignette.json', buildings }) + '\n');
console.log(`wrote ${buildings.length} buildings to ${out.pathname}`);

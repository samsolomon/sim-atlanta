/**
 * The code fingerprint of baked ground (src/terrain/ground-bake.ts): a hash of every source on the
 * bake path, served as `virtual:ground-bake-code` to the site and to the bake runner alike. A bake
 * made by other code (a stale staged bake after an edit to tessellation, grading or normals) then
 * no longer matches, and the browser builds the ground itself.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

const repo = join(import.meta.dirname, '..');
/** Sources on the bake path: the whole terrain module (surface, tessellation, yields, normals,
 * the bake itself), the grading and landing it imports from the pipeline, the underpass floor
 * patches, and the Brookwood grid. Tests are left out. */
const ROOTS = ['web/src/terrain', 'pipeline/prototypes/highway-four-ground', 'pipeline/prototypes/connector-footprint/underpass-floors.json', 'web/src/city/brookwood.ts'];

function files(path: string): string[] {
  const full = join(repo, path);
  try {
    return readdirSync(full, { withFileTypes: true }).flatMap(e => files(join(path, e.name)));
  } catch {
    return /\.test\.ts$/.test(path) || !/\.(ts|json)$/.test(path) ? [] : [full];
  }
}

/** sha256 over the sources' repo paths and contents, in path order (first 16 hex digits). */
export function groundBakeCode(roots = ROOTS, base = repo) {
  const h = createHash('sha256');
  const list = roots.flatMap(r => files(relative(repo, join(base, r)))).sort();
  for (const f of list) { h.update(relative(base, f)); h.update('\0'); h.update(readFileSync(f)); h.update('\0'); }
  return h.digest('hex').slice(0, 16);
}

export function groundBakeCodePlugin(): Plugin {
  const id = 'virtual:ground-bake-code', resolved = '\0' + id;
  return {
    name: 'ground-bake-code',
    resolveId: s => s === id ? resolved : undefined,
    load: s => s === resolved ? `export default ${JSON.stringify(groundBakeCode())};` : undefined,
  };
}

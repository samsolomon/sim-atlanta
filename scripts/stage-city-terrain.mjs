// Copy the pinned Marlin bake into Vite's static data tree without downloading the DEM.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const source = new URL('../pipeline/prototypes/downtown-ground/', import.meta.url);
const dest = new URL('../web/public/data/scene/downtown/', import.meta.url);
const metadata = await readFile(new URL('ground.json', source));
const m = JSON.parse(metadata);
const grid = await readFile(new URL('ground.i16', source));
if (m.file !== 'ground.i16' || grid.length !== 2 * m.rows * m.cols ||
    createHash('sha256').update(grid).digest('hex') !== m.sha256) {
  throw new Error('Downtown ground binary does not match its manifest');
}
await mkdir(dest, { recursive: true });
await writeFile(new URL(m.file, dest), grid);
await writeFile(new URL('ground.json', dest), metadata);
console.log(`Staged ${m.cols} × ${m.rows} downtown terrain nodes`);

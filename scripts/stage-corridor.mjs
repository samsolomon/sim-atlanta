// Copy the King Memorial corridor prototype (pipeline/prototypes/king-memorial) into Vite's
// static data tree for the dev-only corridor preview. Verifies the ground checksum.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const source = new URL('../pipeline/prototypes/king-memorial/', import.meta.url);
const dest = new URL('../web/public/data/scene/king-memorial/', import.meta.url);
const metadata = await readFile(new URL('ground/ground.json', source));
const m = JSON.parse(metadata);
const grid = await readFile(new URL('ground/ground.i16', source));
if (grid.length !== 2 * m.rows * m.cols || createHash('sha256').update(grid).digest('hex') !== m.sha256) {
  throw new Error('Corridor ground binary does not match its manifest');
}
await mkdir(dest, { recursive: true });
await writeFile(new URL('ground.i16', dest), grid);
await writeFile(new URL('ground.json', dest), metadata);
await writeFile(new URL('corridor.json', dest), await readFile(new URL('corridor.json', source)));
await writeFile(new URL('context.json', dest), await readFile(new URL('context.json', source)));
console.log(`Staged ${m.cols} × ${m.rows} corridor terrain nodes, context and corridor.json`);

// Stage only the four optional preview patches. Validate all four before copying any.
import { withCanopy } from './stage-canopy.mjs';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const staged = [];
const midtown = process.argv.includes('--midtown');
const patches = midtown
  ? Object.keys(JSON.parse(await readFile(new URL('../pipeline/prototypes/square-board/midtown-rows.json', import.meta.url), 'utf8')))
  : ['north-band', 'north-corner', 'south-band', 'south-corner'];
for (const patch of patches) {
  const src = new URL(`../pipeline/prototypes/square-board/${patch}/`, import.meta.url);
  const dest = new URL(`../web/public/data/scene/square-board/${patch}/`, import.meta.url);
  const files = await Promise.all(['ground.json', 'ground.i16', 'context.json'].map(async name =>
    [name, await readFile(new URL(name, src))]));
  const manifest = JSON.parse(files[0][1]);
  const bytes = files[1][1], context = JSON.parse(files[2][1]);
  if (manifest.box !== patch || context.name !== patch || bytes.length !== 2 * manifest.rows * manifest.cols ||
      createHash('sha256').update(bytes).digest('hex') !== manifest.sha256) throw Error('Invalid patch ' + patch);
  staged.push({ dest, files });
}
for (const { dest, files } of staged) {
  await mkdir(dest, {recursive:true});
  for (const [name, bytes] of files) await writeFile(new URL(name, dest), !midtown && name === 'context.json' ? withCanopy(bytes) : bytes);
}

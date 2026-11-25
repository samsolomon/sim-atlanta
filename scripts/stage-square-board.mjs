// Validate each group of row packets before publishing any files.
import { withMidtownLandscape } from './stage-midtown-landscape.mjs';
import { withCanopy } from './stage-canopy.mjs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const staged = [];
const midtown = process.argv.includes('--midtown');
const canopy = new URL('../pipeline/prototypes/combined-canopy/', import.meta.url);
const readManifest = async name => JSON.parse(await readFile(new URL(name, canopy), 'utf8'));
const protectedRows = midtown ? await readManifest('hashes.json') : {};
const approved = midtown ? await readManifest('rows.sha256.json') : {};
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const patches = midtown
  ? Object.keys(JSON.parse(await readFile(new URL('../pipeline/prototypes/square-board/midtown-rows.json', import.meta.url), 'utf8')))
  : ['north-band', 'north-corner', 'south-band', 'south-corner'];
if (midtown) patches.push('r16');
for (const patch of patches) {
  const src = new URL(`../pipeline/prototypes/square-board/${patch}/`, import.meta.url);
  const dest = new URL(`../web/public/data/scene/square-board/${patch}/`, import.meta.url);
  const files = await Promise.all(['ground.json', 'ground.i16', 'context.json'].map(async name =>
    [name, await readFile(new URL(name, src))]));
  const manifest = JSON.parse(files[0][1]);
  const bytes = files[1][1], context = JSON.parse(files[2][1]);
  if (manifest.box !== patch || context.name !== patch || bytes.length !== 2 * manifest.rows * manifest.cols ||
      createHash('sha256').update(bytes).digest('hex') !== manifest.sha256) throw Error('Invalid patch ' + patch);
  const protectedRow = protectedRows[patch];
  if (protectedRow) {
    if (sha256(files[2][1]) !== protectedRow.input) throw Error('Unexpected source context for ' + patch);
    files[2][1] = gunzipSync(await readFile(new URL(patch + '.json.gz', canopy)));
    if (sha256(files[2][1]) !== protectedRow.result || files[2][1].length !== protectedRow.bytes ||
        files.some(([name, content]) => sha256(content) !== approved[patch][name])) {
      throw Error('Northern row packet does not match the release manifest: ' + patch);
    }
  } else {
    files[2][1] = (midtown ? withMidtownLandscape : withCanopy)(files[2][1]);
  }
  staged.push({ dest, files });
}
for (const { dest, files } of staged) {
  await mkdir(dest, {recursive:true});
  for (const [name, bytes] of files) await writeFile(new URL(name, dest), bytes);
}

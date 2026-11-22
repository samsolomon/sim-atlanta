// Stage only the opt-in northern section; King has its own release step.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const src = new URL('../pipeline/prototypes/sweet-auburn/', import.meta.url);
const dest = new URL('../web/public/data/scene/sweet-auburn/', import.meta.url);
const manifest = await readFile(new URL('ground/ground.json', src));
const data = await readFile(new URL('ground/ground.i16', src));
const ctx = await readFile(new URL('context.json', src));
const m = JSON.parse(manifest);
if (data.length !== 2 * m.rows * m.cols || createHash('sha256').update(data).digest('hex') !== m.sha256)
  throw new Error('Sweet Auburn ground does not match its manifest');
await mkdir(dest, { recursive: true });
for (const [name, bytes] of [['ground.json', manifest], ['ground.i16', data], ['context.json', ctx]])
  await writeFile(new URL(name, dest), bytes);

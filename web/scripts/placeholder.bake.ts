/**
 * Bake the white placeholder (city/placeholder.ts, docs/white-placeholder.md): every area of the
 * mosaic as white masses on a coarse paper ground, from the area's own far form, so a mass
 * stands where its coloured building lands. Run by `pnpm data:bake` (after the rest of
 * `pnpm data`: it reads the staged areas).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { it } from 'vitest';
import { bakePlaceholder } from '../src/city/placeholder.node';
import { dataRoot, stubPage } from '../src/terrain/ground-bake.node';

it('bakes the white placeholder', async () => {
  const restore = stubPage();
  try {
    const { file, report } = await bakePlaceholder();
    const dir = new URL('scene/placeholder/', dataRoot);
    mkdirSync(dir, { recursive: true });
    writeFileSync(new URL('board.bin.gz', dir), file);
    console.log(report);
  } finally { restore(); }
});

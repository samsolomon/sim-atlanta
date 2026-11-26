/**
 * Bake the ground of BAKED_AREAS (terrain/ground-bake.ts) into web/public/data, for both tiers.
 * Run by `pnpm data:bake` (after the rest of `pnpm data`: it reads the staged rows).
 */
import { writeFileSync } from 'node:fs';
import { brotliCompressSync, constants } from 'node:zlib';
import { it } from 'vitest';
import { BAKED_AREAS, bakeFile } from '../src/terrain/ground-bake';
import { bakeRow, dataRoot, stubPage } from '../src/terrain/ground-bake.node';
import type { MidtownRow } from '../src/square-board/sections';

it('bakes ground', async () => {
  const restore = stubPage();
  try {
    for (const row of BAKED_AREAS as ReadonlySet<MidtownRow>) for (const quality of ['low', 'high'] as const) {
      const { baked, file } = await bakeRow(quality, row);
      const out = new URL(`scene/square-board/${row}/${bakeFile(quality)}`, dataRoot);
      writeFileSync(out, file);
      const br = brotliCompressSync(file, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
      console.log(`ground bake ${row} ${quality}: ${(file.length / 1024).toFixed(0)} KiB (${(br / 1024).toFixed(0)} KiB brotli), ` +
        `${baked.stages.at(-1)!.surface!.pos.length / 3} vertices, ${baked.stages.at(-1)!.yields} yields, stages ` +
        baked.stages.map(st => st.tape ? `tape ${st.tape.byteLength} B` : `surface ${(st.surface!.pos.byteLength / 1024).toFixed(0)} KiB pos`).join(', '));
    }
  } finally { restore(); }
});

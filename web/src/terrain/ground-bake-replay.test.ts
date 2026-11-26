import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { BakeRecorder, BakeReplay, bakeStats, type GroundBake } from './ground-bake';
import { GroundGrid } from './grid';
import { GroundSurface, type GroundYield } from './surface';

const dir = new URL('../../../pipeline/prototypes/downtown-ground/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('ground.json', dir), 'utf8'));
/** A 105 m square board on a slope (as surface.test.ts builds its patches). */
function slope() {
  const rows = 22, cols = 22, binary = new ArrayBuffer(2 * rows * cols), view = new DataView(binary);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) view.setInt16(2 * (r * cols + c), 1000 + 7 * r + 3 * c, true);
  return new GroundGrid({ ...manifest, rows, cols, stepM: 5, bounds: { minX: 0, minZ: 0, maxX: (cols - 1) * 5, maxZ: (rows - 1) * 5 },
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 0 } }, binary);
}
const square = (x: number, z: number, s: number) => [[x, z], [x + s, z], [x + s, z + s], [x, z + s]] as [number, number][];

/** Three carves with reads between them; the second's floor samples the surface itself. */
function mount(bake: GroundBake) {
  const surface = new GroundSurface(slope(), 'high', [], undefined, undefined, false, bake);
  const reads: (number | null)[] = [];
  const read = () => { for (const [x, z] of [[33, 37], [61, 44], [80, 80]]) reads.push(surface.sampleScene(x, z)); };
  surface.carve([{ ring: square(20, 20, 20), floor: () => 50 }]);
  read();
  const sampling: GroundYield = { ring: square(55, 30, 20), floor: (x, z) => (surface.sampleScene(x, z) ?? 0) - 1.5 };
  surface.carve([sampling]);
  read();
  surface.carve([{ ring: square(70, 70, 15), floor: () => 55 }]);
  read();
  surface.endBake();
  return { pos: Array.from(surface.geometry.getAttribute('position').array), reads };
}

it('a yield floor that samples the surface during a replay falls back, and the ground stays exact', () => {
  const plain = mount({});
  const record = new BakeRecorder();
  expect(mount({ record })).toEqual(plain);
  // Forced tapes: the surface is stale between re-cuts, which is when the floor's samples miss.
  const baked = record.bake({ id: 'slope', quality: 'high', gridSha256: '', code: '' }, 'always');
  expect(baked.stages.slice(0, -1).every(s => s.tape)).toBe(true);
  const before = bakeStats.fallbacks;
  expect(mount({ replay: new BakeReplay(baked) })).toEqual(plain);
  expect(bakeStats.fallbacks).toBe(before + 1);
});

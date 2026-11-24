import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createLangdaleHall, langdaleHallId } from './langdale-hall';
import { detachedParts, footprintReport } from './skin-kit';

const site: VBuilding = {
  id: langdaleHallId, name: 'Langdale Hall', h: 28.8265, floors: null,
  rings: [[[420.71, 47.62], [414.96, 42.57], [377.94, 84.63], [404.94, 108.38],
    [408.01, 104.88], [442.27, 65.95], [436.69, 61.05], [439.69, 57.64], [424.03, 43.86]]],
};
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 100,
  bounds: { minX: 350, maxX: 450, minZ: 30, maxZ: 130 },
  encoding: 'signed int16 little-endian', vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array([3120, 3130, 3130, 3140]).buffer);

it('fits the staged downtown footprint and keeps the facades attached on sloping ground', () => {
  const result = createLangdaleHall([site], grid)!;
  expect(result.buildings).toEqual([]);
  expect(footprintReport(result.group, site.rings, { maxProjection: 0.12 }).worst).toBe(0);
  expect(detachedParts(result.group, site.rings)).toEqual([]);
});

it('draws the lidar roof and central penthouse above the mapped roof', () => {
  const { group } = createLangdaleHall([site], grid)!;
  group.updateMatrixWorld(true);
  const roofAt = (x: number, z: number) => new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0))
    .intersectObject(group, true)[0].point.y + 300;
  expect(roofAt(400, 86)).toBeCloseTo(355);
  expect(roofAt(411, 74)).toBeCloseTo(360);
});

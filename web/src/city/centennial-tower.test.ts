import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createCentennialTower } from './centennial-tower';

const tower: VBuilding = {
  id: '0f60407e-dc16-401f-8371-d8daed2807f1',
  h: 164,
  floors: 36,
  rings: [
    [
      [-59.34, -366.52],
      [-79.87, -340.02],
      [-48.14, -303.86],
      [-19.44, -320.72],
    ],
  ],
};
const grid = new GroundGrid(
  {
    version: 1,
    rows: 2,
    cols: 2,
    stepM: 100,
    bounds: { minX: -100, maxX: 0, minZ: -400, maxZ: -300 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    scaleM: 0.1,
    offsetM: 0,
    noData: -32768,
    sha256: '',
  },
  new Int16Array(4).fill(3220).buffer
);

it('places the deck and rooftop equipment on the survey datum and the two downward chevrons on opposite broad faces', () => {
  const garage = { ...tower, id: 'garage' };
  const { group, buildings } = createCentennialTower(
    [garage, { ...tower, rings: [[...tower.rings[0]].reverse()] }],
    grid
  )!;
  expect(buildings).toEqual([garage]);
  group.updateMatrixWorld(true);
  const height = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(group)[0].point.y + 323.8;
  expect(height(-48, -342)).toBeCloseTo(457.8);
  expect(height(-59, -338.2)).toBeCloseTo(459.65);
  const ribs = (group.children[2] as Mesh).geometry.getAttribute('position');
  for (const edge of [1, 3]) {
    const [x, z] = tower.rings[0][edge],
      [ex, ez] = tower.rings[0][(edge + 1) % 4];
    const width = Math.hypot(ex - x, ez - z);
    const heights = [];
    for (let i = 0; i < ribs.count; i++) {
      if (Math.hypot(ribs.getX(i) - (x + ex) / 2, ribs.getZ(i) - (z + ez) / 2) < 0.5) heights.push(ribs.getY(i));
    }
    expect(Math.min(...heights)).toBeCloseTo(459 - width * 0.45 - 0.17, 1);
  }
  expect(createCentennialTower([garage], grid)).toBeNull();
  expect(createCentennialTower([{ ...tower, rings: [[[0, 0], ...tower.rings[0].slice(1)]] }], grid)).toBeNull();
});

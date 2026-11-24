import { expect, it } from 'vitest';
import { Vector3, Raycaster } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createDavisons } from './davisons';

it('keeps the Westin and steps down behind the Peachtree roof', () => {
  const site: VBuilding = {
    id: '3b44d236-c74c-40cc-bf2b-7a42547418fe',
    h: 44.5,
    floors: 14,
    rings: [
      [
        [358.1, -593.95],
        [264.64, -594.43],
        [264.25, -533.89],
        [265.56, -532.52],
        [267.33, -530.51],
        [268.69, -528.95],
        [281.86, -514.56],
        [357.0, -514.05],
      ],
    ],
  };
  const neighbor: VBuilding = {
    id: '16cab934-34dc-4dca-8eb2-3ce9dc57d877',
    h: 219.7,
    floors: null,
    rings: [
      [
        [252.35, -637.58],
        [242.48, -637.69],
        [233.53, -594.59],
        [264.64, -594.43],
        [358.1, -593.95],
        [358.26, -637.36],
        [313.57, -637.7],
        [276.06, -637.55],
      ],
    ],
  };
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 600,
      bounds: { minX: 0, maxX: 600, minZ: -600, maxZ: 0 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3230).buffer,
  );
  expect(createDavisons([{ ...site, rings: neighbor.rings }], grid)).toBeNull();
  const model = createDavisons([site, neighbor], grid)!;
  expect(model.buildings).toEqual([neighbor]);
  model.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 323.8;
  expect(roof(347, -559)).toBeCloseTo(365.74, 1);
  expect(roof(278, -565)).toBeCloseTo(355.3, 1);
});

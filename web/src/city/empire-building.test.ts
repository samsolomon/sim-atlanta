import { expect, it } from 'vitest';
import { Vector3, Raycaster } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createEmpireBuilding } from './empire-building';

it('retains Commerce across Broad and opens the two courts to separate measured levels', () => {
  const site: VBuilding = {
    id: '06942e29-e032-4d6b-a30f-7e1f4bc9f2a4',
    h: null,
    floors: 14,
    rings: [
      [
        [183.01, -140.6],
        [167.1, -159.15],
        [119.6, -118.43],
        [135.52, -99.86],
        [157.34, -118.58],
      ],
    ],
  };
  const neighbor: VBuilding = {
    id: 'c4d0fd71-eba0-46b2-b551-1e840e220b6e',
    h: 66.6,
    floors: 17,
    rings: [
      [
        [106.49, -133.93],
        [131.13, -154.58],
        [114.36, -173.39],
        [93.47, -153.54],
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
  expect(createEmpireBuilding([{ ...site, rings: neighbor.rings }], grid)).toBeNull();
  const model = createEmpireBuilding([site, neighbor], grid)!;
  expect(model.buildings).toEqual([neighbor]);
  model.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 323.8;
  expect(roof(143.6, -114.0)).toBeCloseTo(345, 1);
  expect(roof(162.9, -131.2)).toBeCloseTo(334.7, 1);
});

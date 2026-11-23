import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createFootballHall } from './football-hall';

it('separates the glazed field hall from the higher football rotunda', () => {
  const sites: VBuilding[] = [
    {
      id: 'e7b9bf31-89f1-4e38-b8bd-82cab014f1fd',
      rings: [
        [
          [-363.01, -734.53],
          [-357.43, -718.61],
          [-384.21, -708.19],
          [-350.51, -617.63],
          [-341.63, -608.56],
          [-336.21, -603.03],
          [-311.28, -626.23],
          [-309.18, -628.22],
          [-318.16, -637.01],
          [-314.47, -637.74],
          [-308.56, -640.55],
          [-305.46, -645.34],
          [-304.94, -651.11],
          [-306.85, -659.1],
          [-312.3, -664.06],
          [-318.25, -667.04],
          [-336.11, -718.61],
          [-340.04, -717.5],
          [-343.79, -727.96],
          [-347.54, -726.72],
          [-352.39, -739.06],
        ],
      ],
      h: 24.0,
      floors: 3,
    },
  ];
  const next = { ...sites[0], id: 'unrelated' };
  const grid = new GroundGrid(
    {
      version: 1,
      rows: 2,
      cols: 2,
      stepM: 600,
      bounds: { minX: -600, maxX: 0, minZ: -800, maxZ: -200 },
      encoding: 'signed int16 little-endian',
      vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
      scaleM: 0.1,
      offsetM: 0,
      noData: -32768,
      sha256: '',
    },
    new Int16Array(4).fill(3190).buffer,
  );
  const result = createFootballHall([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createFootballHall([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;
  expect(ray(-351.77, -683.95)! + 323.8).toBeCloseTo(329.5, 1);
  expect(ray(-363.02, -708.57)! + 323.8).toBeCloseTo(324.65, 1);
  expect(ray(-323.08, -629.52)! + 323.8).toBeCloseTo(327.95, 1);
  expect(ray(-327.26, -647.71)! + 323.8).toBeGreaterThan(336);
  expect(ray(-310.93, -654.29, 318)).toBeUndefined();
});

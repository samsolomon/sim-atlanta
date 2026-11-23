import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createOmniAtlanta } from './omni-atlanta';

it('restores the north tower and leaves the street open under its bridge', () => {
  const sites: VBuilding[] = [
    {
      id: '74fe6c27-9599-458a-bf46-94111160bd53',
      rings: [
        [
          [-356.62, -583.56],
          [-331.69, -549.88],
          [-328.13, -540.96],
          [-321.39, -532.12],
          [-311.01, -540.1],
          [-292.43, -521.08],
          [-306.55, -508.87],
          [-298.83, -501.26],
          [-298.89, -489.88],
          [-292.18, -481.34],
          [-290.73, -479.76],
          [-272.15, -461.25],
          [-254.89, -460.25],
          [-246.75, -459.78],
          [-233.6, -473.45],
          [-246.35, -487.0],
          [-240.32, -493.56],
          [-239.51, -494.43],
          [-233.12, -500.24],
          [-252.02, -520.79],
          [-249.68, -525.7],
          [-256.75, -533.58],
          [-263.8, -541.45],
          [-267.92, -537.61],
          [-270.16, -540.12],
          [-284.31, -526.02],
          [-303.33, -547.7],
          [-271.91, -579.05],
          [-277.14, -588.88],
          [-276.92, -590.5],
          [-276.88, -592.3],
          [-277.33, -593.8],
          [-278.65, -595.04],
          [-279.88, -595.38],
          [-280.22, -598.0],
          [-288.83, -610.38],
          [-299.31, -620.68],
          [-302.43, -622.44],
          [-307.43, -625.25],
          [-309.01, -623.55],
          [-311.28, -626.23],
          [-336.21, -603.03],
        ],
      ],
      h: 9.0,
      floors: null,
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
  const result = createOmniAtlanta([...sites, next], grid)!;
  expect(result.buildings).toEqual([next]);
  expect(createOmniAtlanta([next], grid)).toBeNull();
  result.group.updateMatrixWorld(true);
  const ray = (x: number, z: number, y = 500, dy = -1) =>
    new Raycaster(new Vector3(x, y - 323.8, z), new Vector3(0, dy, 0)).intersectObject(result.group)[0]?.point.y;
  expect(ray(-332.72, -578.58)! + 323.8).toBeCloseTo(336.9, 1);
  expect(ray(-300.52, -567.68)! + 323.8).toBeCloseTo(407.4, 1);
  expect(ray(-299.42, -534.39)! + 323.8).toBeCloseTo(332.0, 1);
  expect(ray(-299.42, -534.39, 325)).toBeUndefined();
});

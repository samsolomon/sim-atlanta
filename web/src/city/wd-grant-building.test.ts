import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { detachedParts, footprintReport } from './skin-kit';
import { createWdGrantBuilding, wdGrantBuildingId, wdGrantRoof, wdGrantTop } from './wd-grant-building';

const grant: VBuilding = {
  id: wdGrantBuildingId,
  h: 47.5,
  floors: 10,
  rings: [[
    [117.93, -217.68], [97.31, -199.31], [108.35, -186.87], [113.12, -191.08],
    [117.25, -189.42], [126.51, -177.96], [128.63, -179.75], [130.77, -176.96],
    [122.43, -170.25], [133.28, -157.33], [154.26, -175.03],
  ]],
};
const neighbor: VBuilding = { ...grant, id: 'neighbor' };
const sceneZero = 323.8;
const grid = new GroundGrid({
  version: 1, rows: 2, cols: 2, stepM: 600,
  bounds: { minX: 0, maxX: 600, minZ: -600, maxZ: 0 },
  encoding: 'signed int16 little-endian',
  vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: sceneZero },
  scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
}, new Int16Array(4).fill(3220).buffer);

it.each(['low', 'high'] as const)('fits the Grant roof and leaves the service court open at %s', (quality) => {
  expect(createWdGrantBuilding([neighbor], grid, quality)).toBeNull();
  const result = createWdGrantBuilding([neighbor, grant], grid, quality)!;
  expect(result.buildings).toEqual([neighbor]);
  expect(footprintReport(result.group, grant.rings, { top: wdGrantTop - sceneZero + 0.01 }).count).toBe(0);
  expect(detachedParts(result.group, grant.rings)).toEqual([]);
  const length = Math.hypot(36.33, 42.65);
  const roofAt = (u: number, v: number) => new Raycaster(
    new Vector3(117.93 + (36.33 * u - 42.65 * v) / length, 80,
      -217.68 + (42.65 * u + 36.33 * v) / length),
    new Vector3(0, -1, 0),
  ).intersectObject(result.group)[0]?.point.y;
  expect(roofAt(27, 7)).toBeCloseTo(wdGrantRoof - sceneZero, 3);
  expect(roofAt(13, 18)).toBeCloseTo(wdGrantTop - sceneZero, 3);
  expect(roofAt(29, 25)).toBeUndefined();
});

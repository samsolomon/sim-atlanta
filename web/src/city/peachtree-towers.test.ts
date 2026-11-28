import { expect, it } from 'vitest';
import { Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { createPeachtreeTowers, peachtreeTowersId } from './peachtree-towers';
import { detachedParts, footprintReport } from './skin-kit';

// The staged Overture outline (downtown data is not committed, so it is copied here).
const ring: [number, number][] = [[326.53, -953.16], [326.37, -941.07], [329.98, -941.02], [342.51, -940.85], [342.49, -938.71],
  [349.12, -938.62], [354.32, -938.55], [354.35, -940.9], [363.07, -940.71], [363.1, -952.17], [363.22, -961.55], [363.34, -970.97],
  [363.41, -978.66], [363.48, -981.87], [353.88, -982.0], [353.9, -984.18], [351.9, -984.2], [342.47, -984.33], [342.44, -981.9],
  [330.47, -982.05], [326.9, -982.1], [326.77, -971.73]];

it('raises Peachtree Towers to its lidar roof and penthouse, cuts the west court, and stays on its footprint', () => {
  const site: VBuilding = { id: peachtreeTowersId, h: 30.5, floors: 24, rings: [ring] };
  const grid = new GroundGrid({ version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 0, maxX: 600, minZ: -1300, maxZ: -700 }, encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 }, scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '' },
  new Int16Array(4).fill(3172).buffer);
  const other = { ...site, id: 'unrelated' };
  const model = createPeachtreeTowers([site, other], grid)!;
  expect(model.buildings).toEqual([other]);
  model.group.updateMatrixWorld(true);
  const top = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y + 300;
  expect(top(347, -963)).toBeCloseTo(317.2 + 84, 0); // penthouse, lidar 95th percentile
  expect(top(358, -945)).toBeCloseTo(317.2 + 72.5, 0); // main roof, lidar median
  expect(top(334, -962)).toBeCloseTo(317.2 + 9, 0); // west light court, floored by the base
  expect(top(361.5, -962)).toBeCloseTo(317.2 + 9, 0); // east notch
  const [body, lamps] = model.group.children as Mesh[];
  expect(body.geometry.getAttribute('position').count / 3).toBeLessThanOrEqual(2400);
  const report = footprintReport(model.group, [ring], { bottom: 317.2 - 300 - 8 });
  expect(report.worst).toBe(0);
  expect(report.vertical).toBe(0);
  expect(detachedParts(model.group, [ring])).toEqual([]);
  model.setNight(1);
  expect((lamps.material as MeshLambertMaterial).emissiveIntensity).toBeGreaterThan(0);
});
